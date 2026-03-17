/**
 * engine/llm.js — Shared LLM utilities for Squad engine + dashboard
 * Provides callLLM() (with optional session resume) and trackEngineUsage().
 */

const path = require('path');
const shared = require('./shared');
const { safeRead, safeWrite, safeUnlink, uid, runFile, cleanChildEnv, parseStreamJsonOutput } = shared;

const SQUAD_DIR = path.resolve(__dirname, '..');
const ENGINE_DIR = __dirname;

function trackEngineUsage(category, usage) {
  if (!usage) return;
  try {
    const metricsPath = path.join(ENGINE_DIR, 'metrics.json');
    const raw = safeRead(metricsPath);
    const metrics = raw ? JSON.parse(raw) : {};

    if (!metrics._engine) metrics._engine = {};
    if (!metrics._engine[category]) {
      metrics._engine[category] = { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheCreation: 0 };
    }
    const cat = metrics._engine[category];
    cat.calls++;
    cat.costUsd += usage.costUsd || 0;
    cat.inputTokens += usage.inputTokens || 0;
    cat.outputTokens += usage.outputTokens || 0;
    cat.cacheRead += usage.cacheRead || 0;
    cat.cacheCreation = (cat.cacheCreation || 0) + (usage.cacheCreation || 0);

    const today = new Date().toISOString().slice(0, 10);
    if (!metrics._daily) metrics._daily = {};
    if (!metrics._daily[today]) metrics._daily[today] = { costUsd: 0, inputTokens: 0, outputTokens: 0, cacheRead: 0, tasks: 0 };
    const daily = metrics._daily[today];
    daily.costUsd += usage.costUsd || 0;
    daily.inputTokens += usage.inputTokens || 0;
    daily.outputTokens += usage.outputTokens || 0;
    daily.cacheRead += usage.cacheRead || 0;

    safeWrite(metricsPath, metrics);
  } catch {}
}

// ── Core LLM Call ───────────────────────────────────────────────────────────

function callLLM(promptText, sysPromptText, { timeout = 120000, label = 'llm', model = 'sonnet', maxTurns = 1, allowedTools = '', sessionId = null } = {}) {
  return new Promise((resolve) => {
    const id = uid();
    const promptPath = path.join(ENGINE_DIR, `${label}-prompt-${id}.md`);
    const sysPath = path.join(ENGINE_DIR, `${label}-sys-${id}.md`);
    safeWrite(promptPath, promptText);
    safeWrite(sysPath, sysPromptText || '');

    const spawnScript = path.join(ENGINE_DIR, 'spawn-agent.js');
    const args = [
      spawnScript, promptPath, sysPath,
      '--output-format', 'stream-json', '--max-turns', String(maxTurns), '--model', model,
      '--verbose',
    ];
    if (allowedTools) args.push('--allowedTools', allowedTools);
    args.push('--permission-mode', 'bypassPermissions');

    if (sessionId) args.push('--resume', sessionId);

    const proc = runFile(process.execPath, args, { cwd: SQUAD_DIR, stdio: ['pipe', 'pipe', 'pipe'], env: cleanChildEnv() });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    const timer = setTimeout(() => { try { proc.kill('SIGTERM'); } catch {} }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      safeUnlink(promptPath);
      safeUnlink(sysPath);
      const parsed = parseStreamJsonOutput(stdout);
      resolve({ text: parsed.text || '', usage: parsed.usage, sessionId: parsed.sessionId || null, code, stderr, raw: stdout });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      safeUnlink(promptPath);
      safeUnlink(sysPath);
      resolve({ text: '', usage: null, sessionId: null, code: 1, stderr: err.message, raw: '' });
    });
  });
}

module.exports = {
  callLLM,
  trackEngineUsage,
};
