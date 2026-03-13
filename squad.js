#!/usr/bin/env node
/**
 * Squad Init — Link a project to the central squad
 *
 * Usage:
 *   node squad.js <project-dir>           Add a project interactively
 *   node squad.js <project-dir> --remove  Remove a project
 *   node squad.js --list                  List linked projects
 *
 * This adds the project to ~/.squad/config.json's projects array.
 * The squad engine and dashboard run centrally from ~/.squad/.
 * Each project just needs its own work-items.json and pull-requests.json.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const SQUAD_HOME = __dirname;
const CONFIG_PATH = path.join(SQUAD_HOME, 'config.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {
    return { projects: [], engine: {}, claude: {}, agents: {} };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q, def) {
  return new Promise(resolve => {
    rl.question(`  ${q}${def ? ` [${def}]` : ''}: `, ans => resolve(ans.trim() || def || ''));
  });
}

function autoDiscover(targetDir) {
  const result = { _found: [] };

  // 1. Detect main branch from git
  try {
    const head = execSync('git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || git symbolic-ref HEAD', { cwd: targetDir, encoding: 'utf8', timeout: 5000 }).trim();
    const branch = head.replace('refs/remotes/origin/', '').replace('refs/heads/', '');
    if (branch) { result.mainBranch = branch; result._found.push('main branch'); }
  } catch {}

  // 2. Detect repo host, org, project, repo name from git remote URL
  try {
    const remoteUrl = execSync('git remote get-url origin', { cwd: targetDir, encoding: 'utf8', timeout: 5000 }).trim();
    if (remoteUrl.includes('github.com')) {
      result.repoHost = 'github';
      // https://github.com/org/repo.git or git@github.com:org/repo.git
      const m = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (m) { result.org = m[1]; result.repoName = m[2]; }
      result._found.push('GitHub remote');
    } else if (remoteUrl.includes('visualstudio.com') || remoteUrl.includes('dev.azure.com')) {
      result.repoHost = 'ado';
      // https://org.visualstudio.com/project/_git/repo or https://dev.azure.com/org/project/_git/repo
      const m1 = remoteUrl.match(/https:\/\/([^.]+)\.visualstudio\.com[^/]*\/([^/]+)\/_git\/([^/\s]+)/);
      const m2 = remoteUrl.match(/https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/\s]+)/);
      const m = m1 || m2;
      if (m) { result.org = m[1]; result.project = m[2]; result.repoName = m[3]; }
      result._found.push('Azure DevOps remote');
    }
  } catch {}

  // 3. Read description from CLAUDE.md first line or README.md first paragraph
  try {
    const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, 'utf8');
      // Look for a description-like first line or paragraph (skip headings)
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (lines[0] && lines[0].length < 200) {
        result.description = lines[0].trim();
        result._found.push('description from CLAUDE.md');
      }
    }
  } catch {}
  if (!result.description) {
    try {
      const readmePath = path.join(targetDir, 'README.md');
      if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, 'utf8').slice(0, 2000);
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('!'));
        if (lines[0] && lines[0].length < 200) {
          result.description = lines[0].trim();
          result._found.push('description from README.md');
        }
      }
    } catch {}
  }

  // 4. Detect project name
  try {
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) { result.name = pkg.name.replace(/^@[^/]+\//, ''); result._found.push('name from package.json'); }
    }
  } catch {}

  return result;
}

async function addProject(targetDir) {
  const target = path.resolve(targetDir);
  if (!fs.existsSync(target)) {
    console.log(`  Error: Directory not found: ${target}`);
    process.exit(1);
  }

  const config = loadConfig();
  if (!config.projects) config.projects = [];

  // Check if already linked
  const existing = config.projects.find(p => path.resolve(p.localPath) === target);
  if (existing) {
    console.log(`  "${existing.name}" is already linked at ${target}`);
    const update = await ask('Update its configuration? (y/N)', 'N');
    if (update.toLowerCase() !== 'y') { rl.close(); return; }
    config.projects = config.projects.filter(p => path.resolve(p.localPath) !== target);
  }

  console.log('\n  Link Project to Squad');
  console.log('  ─────────────────────────────');
  console.log(`  Squad home: ${SQUAD_HOME}`);
  console.log(`  Project:    ${target}\n`);

  // Auto-discover what we can from the repo
  const detected = autoDiscover(target);
  if (detected._found.length > 0) {
    console.log(`  Auto-detected: ${detected._found.join(', ')}\n`);
  }

  const name = await ask('Project name', detected.name || path.basename(target));
  const description = await ask('Description (what this repo contains/does)', detected.description || '');
  const repoHost = await ask('Repo host (ado/github)', detected.repoHost || 'ado');
  const adoOrg = await ask('Organization', detected.org || '');
  const adoProject = await ask('Project', detected.project || '');
  const repoName = await ask('Repo name', detected.repoName || name);
  const repoId = await ask('Repository ID (GUID, optional)', '');
  const mainBranch = await ask('Main branch', detected.mainBranch || 'main');

  rl.close();

  const prUrlBase = repoHost === 'github'
    ? (adoOrg && repoName ? `https://github.com/${adoOrg}/${repoName}/pull/` : '')
    : (adoOrg && adoProject && repoName
      ? `https://${adoOrg}.visualstudio.com/DefaultCollection/${adoProject}/_git/${repoName}/pullrequest/`
      : '');

  const project = {
    name,
    description,
    localPath: target.replace(/\\/g, '/'),
    repoHost,
    repositoryId: repoId,
    adoOrg,
    adoProject,
    repoName,
    mainBranch,
    prUrlBase,
    workSources: {
      prd: {
        enabled: true,
        path: 'docs/prd-gaps.json',
        itemFilter: { status: ['missing', 'planned'] },
        cooldownMinutes: 30
      },
      pullRequests: {
        enabled: true,
        path: '.squad/pull-requests.json',
        cooldownMinutes: 30
      },
      workItems: {
        enabled: true,
        path: '.squad/work-items.json',
        cooldownMinutes: 0
      }
    }
  };

  config.projects.push(project);
  saveConfig(config);

  // Create project-local state files if needed
  const squadDir = path.join(target, '.squad');
  if (!fs.existsSync(squadDir)) fs.mkdirSync(squadDir, { recursive: true });

  const stateFiles = {
    'pull-requests.json': '[]',
    'work-items.json': '[]',
  };
  for (const [f, content] of Object.entries(stateFiles)) {
    const fp = path.join(squadDir, f);
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, content);
  }

  console.log(`\n  Linked "${name}" (${target})`);
  console.log(`  Total projects: ${config.projects.length}`);
  console.log(`\n  Project state files created in ${squadDir}`);
  console.log(`\n  Start the squad from anywhere:`);
  console.log(`    node ${SQUAD_HOME}/engine.js         # Engine`);
  console.log(`    node ${SQUAD_HOME}/dashboard.js      # Dashboard`);
  console.log(`    node ${SQUAD_HOME}/engine.js status   # Status\n`);
}

function removeProject(targetDir) {
  const target = path.resolve(targetDir);
  const config = loadConfig();
  const before = (config.projects || []).length;
  config.projects = (config.projects || []).filter(p => path.resolve(p.localPath) !== target);
  const after = config.projects.length;

  if (before === after) {
    console.log(`  No project linked at ${target}`);
  } else {
    saveConfig(config);
    console.log(`  Removed project at ${target}`);
    console.log(`  Remaining projects: ${config.projects.length}`);
  }
}

function listProjects() {
  const config = loadConfig();
  const projects = config.projects || [];
  console.log(`\n  Squad Projects (${projects.length})\n`);
  if (projects.length === 0) {
    console.log('  No projects linked. Run: node squad.js <project-dir>\n');
    return;
  }
  for (const p of projects) {
    const exists = fs.existsSync(p.localPath);
    console.log(`  ${p.name}`);
    if (p.description) console.log(`    Desc: ${p.description}`);
    console.log(`    Path: ${p.localPath} ${exists ? '' : '(NOT FOUND)'}`);
    console.log(`    Repo: ${p.adoOrg}/${p.adoProject}/${p.repoName} (${p.repoHost || 'ado'})`);
    console.log(`    ID:   ${p.repositoryId || 'none'}`);
    console.log('');
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const [cmd, ...rest] = process.argv.slice(2);

function initSquad() {
  const config = loadConfig();
  if (!config.projects) config.projects = [];
  if (!config.engine) config.engine = { tickInterval: 60000, staleThreshold: 1800000, maxConcurrent: 3, inboxConsolidateThreshold: 5, agentTimeout: 600000, maxTurns: 100 };
  if (!config.claude) config.claude = { binary: 'claude', outputFormat: 'json', allowedTools: 'Edit,Write,Read,Bash,Glob,Grep,Agent,WebFetch,WebSearch' };
  if (!config.agents || Object.keys(config.agents).length === 0) {
    config.agents = {
      ripley:  { name: 'Ripley',  emoji: '🏗️',  role: 'Lead / Explorer', skills: ['architecture', 'codebase-exploration', 'design-review'] },
      dallas:  { name: 'Dallas',  emoji: '🔧',  role: 'Engineer', skills: ['implementation', 'typescript', 'docker', 'testing'] },
      lambert: { name: 'Lambert', emoji: '📊',  role: 'Analyst', skills: ['gap-analysis', 'requirements', 'documentation'] },
      rebecca: { name: 'Rebecca', emoji: '🧠',  role: 'Architect', skills: ['system-design', 'api-design', 'scalability', 'implementation'] },
      ralph:   { name: 'Ralph',   emoji: '⚙️',   role: 'Engineer', skills: ['implementation', 'bug-fixes', 'testing', 'scaffolding'] },
    };
  }
  saveConfig(config);
  console.log(`\n  Squad initialized at ${SQUAD_HOME}`);
  console.log(`  Projects: ${config.projects.length}`);
  console.log(`\n  Add a project:`);
  console.log(`    node squad add <project-dir>\n`);
}

const commands = {
  init: () => initSquad(),
  add: () => {
    const dir = rest[0];
    if (!dir) { console.log('Usage: node squad add <project-dir>'); process.exit(1); }
    addProject(dir).catch(e => { console.error(e); process.exit(1); });
  },
  remove: () => {
    const dir = rest[0];
    if (!dir) { console.log('Usage: node squad remove <project-dir>'); process.exit(1); }
    removeProject(dir);
  },
  list: () => listProjects(),
};

if (cmd && commands[cmd]) {
  commands[cmd]();
} else {
  console.log('\n  Squad — Central AI dev team manager\n');
  console.log('  Usage: node squad <command>\n');
  console.log('  Commands:');
  console.log('    init                    Initialize squad (no projects)');
  console.log('    add <project-dir>       Link a project');
  console.log('    remove <project-dir>    Unlink a project');
  console.log('    list                    List linked projects\n');
  console.log('  After init, also use:');
  console.log('    node ~/.squad/engine.js          Start engine');
  console.log('    node ~/.squad/dashboard.js        Start dashboard\n');
}
