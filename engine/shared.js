/**
 * engine/shared.js — Shared utilities for Squad engine, dashboard, and LLM modules.
 * Extracted from engine.js and dashboard.js to eliminate duplication.
 */

const fs = require('fs');
const path = require('path');

const SQUAD_DIR = path.resolve(__dirname, '..');

// ── File I/O ─────────────────────────────────────────────────────────────────

function safeRead(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function safeReadDir(dir) {
  try { return fs.readdirSync(dir); } catch { return []; }
}

function safeJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function safeWrite(p, data) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const tmp = p + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tmp, content);
    // Atomic rename — retry on Windows EPERM (file locking)
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.renameSync(tmp, p);
        return;
      } catch (e) {
        if (e.code === 'EPERM' && attempt < 4) {
          const delay = 50 * (attempt + 1); // 50, 100, 150, 200ms
          const start = Date.now(); while (Date.now() - start < delay) {}
          continue;
        }
        // Final attempt failed — fall through to direct write
      }
    }
    // All rename attempts failed — direct write as fallback (not atomic but won't lose data)
    try { fs.unlinkSync(tmp); } catch {}
    fs.writeFileSync(p, content);
  } catch {
    // Even direct write failed — clean up tmp silently
    try { fs.unlinkSync(tmp); } catch {}
  }
}

// ── Project Helpers ──────────────────────────────────────────────────────────

function getProjects(config) {
  if (config.projects && Array.isArray(config.projects)) {
    return config.projects;
  }
  // Legacy single-project: derive localPath from .squad parent
  const proj = config.project || {};
  if (!proj.localPath) proj.localPath = path.resolve(SQUAD_DIR, '..');
  if (!proj.workSources) proj.workSources = config.workSources || {};
  return [proj];
}

function projectRoot(project) {
  return path.resolve(project.localPath);
}

function projectWorkItemsPath(project) {
  const wiSrc = project.workSources?.workItems;
  if (wiSrc?.path) return path.resolve(projectRoot(project), wiSrc.path);
  return path.join(projectRoot(project), '.squad', 'work-items.json');
}

function projectPrPath(project) {
  const root = path.resolve(project.localPath);
  const prSrc = project.workSources?.pullRequests || {};
  return path.resolve(root, prSrc.path || '.squad/pull-requests.json');
}

// ── ID Generation ────────────────────────────────────────────────────────────

function nextWorkItemId(items, prefix) {
  const maxNum = items.reduce((max, i) => {
    const m = (i.id || '').match(/(\d+)$/);
    return m ? Math.max(max, parseInt(m[1])) : max;
  }, 0);
  return prefix + String(maxNum + 1).padStart(3, '0');
}

// ── ADO URL ──────────────────────────────────────────────────────────────────

function getAdoOrgBase(project) {
  if (project.prUrlBase) {
    const m = project.prUrlBase.match(/^(https?:\/\/[^/]+(?:\/DefaultCollection)?)/);
    if (m) return m[1];
  }
  return project.adoOrg.includes('.')
    ? `https://${project.adoOrg}`
    : `https://dev.azure.com/${project.adoOrg}`;
}

// ── Branch Sanitization ──────────────────────────────────────────────────────

function sanitizeBranch(name) {
  return String(name).replace(/[^a-zA-Z0-9._\-\/]/g, '-').slice(0, 200);
}

// ── Skill Frontmatter Parser ─────────────────────────────────────────────────

function parseSkillFrontmatter(content, filename) {
  let name = filename.replace('.md', '');
  let trigger = '', description = '', project = 'any', author = '', created = '', allowedTools = '';
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const m = (key) => { const r = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm')); return r ? r[1].trim() : ''; };
    name = m('name') || name;
    trigger = m('trigger');
    description = m('description');
    project = m('project') || 'any';
    author = m('author');
    created = m('created');
    allowedTools = m('allowed-tools');
  }
  return { name, trigger, description, project, author, created, allowedTools };
}

module.exports = {
  SQUAD_DIR,
  safeRead,
  safeReadDir,
  safeJson,
  safeWrite,
  getProjects,
  projectRoot,
  projectWorkItemsPath,
  projectPrPath,
  nextWorkItemId,
  getAdoOrgBase,
  sanitizeBranch,
  parseSkillFrontmatter,
};
