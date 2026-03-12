# Squad — Central AI Development Team

A multi-project AI dev team that runs from `~/.squad/`. Five agents share a single engine, dashboard, and knowledge base, working across any number of linked repos.

## Quick Start

```powershell
# 1. Initialize the squad (one-time)
node $env:USERPROFILE\.squad\squad.js init

# 2. Link your projects
node $env:USERPROFILE\.squad\squad.js add C:\path\to\repo1
node $env:USERPROFILE\.squad\squad.js add C:\path\to\repo2

# 3. Run
node $env:USERPROFILE\.squad\engine.js           # Start engine
node $env:USERPROFILE\.squad\dashboard.js         # Dashboard at localhost:7331
node $env:USERPROFILE\.squad\engine.js status     # Check state
```

## CLI Reference

### `squad.js` — Project management

| Command | Description |
|---------|-------------|
| `node squad.js init` | Initialize squad with default agents and config (no projects) |
| `node squad.js add <dir>` | Link a project (prompts for ADO config) |
| `node squad.js remove <dir>` | Unlink a project |
| `node squad.js list` | List all linked projects |

### `engine.js` — Engine control

| Command | Description |
|---------|-------------|
| `node engine.js` | Start engine daemon (ticks every 60s) |
| `node engine.js status` | Show agents, projects, dispatch queue |
| `node engine.js pause` | Pause dispatching |
| `node engine.js resume` | Resume dispatching |
| `node engine.js stop` | Stop the engine |
| `node engine.js queue` | Show dispatch queue |
| `node engine.js sources` | Show work sources per project |
| `node engine.js discover` | Dry-run work discovery |
| `node engine.js dispatch` | Force a dispatch cycle |
| `node engine.js spawn <agent> <prompt>` | Manually spawn an agent |
| `node engine.js work <title> [opts-json]` | Add to work-items queue |

### `dashboard.js` — Web dashboard

```powershell
node dashboard.js           # Default port 7331
PORT=8080 node dashboard.js # Custom port
```

Features: agent cards, PRD progress, PR tracker, Command Center (add work items / decisions / PRD items via web UI), engine log.

## Architecture

```
                    ┌──────────────────────┐
                    │   ~/.squad/ (central) │
                    │                      │
                    │  engine.js            │ ← ticks every 60s
                    │  dashboard.js         │ ← http://localhost:7331
                    │  config.json          │ ← projects[], agents, engine settings
                    │  agents/              │ ← shared 5-agent pool
                    │  playbooks/           │ ← parameterized templates
                    │  decisions/           │ ← shared knowledge base
                    │  routing.md           │ ← dispatch rules
                    └──────┬───────────────┘
                           │ discovers work from each project
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  Project A   │ │  Project B   │ │  Project C   │
     │              │ │              │ │              │
     │  .squad/     │ │  .squad/     │ │  .squad/     │
     │   work-items │ │   work-items │ │   work-items │
     │   pull-reqs  │ │   pull-reqs  │ │   pull-reqs  │
     │  docs/       │ │  docs/       │ │  docs/       │
     │   prd-gaps   │ │   prd-gaps   │ │   prd-gaps   │
     └──────────────┘ └──────────────┘ └──────────────┘
```

Each project keeps its own work-items, PRs, and PRD locally. The central engine scans all linked projects on each tick, discovers work, and dispatches agents with the correct project context (cwd, ADO config, worktree paths).

## Multi-Project Config

`config.json` has a `projects` array. Each entry:

```json
{
  "name": "MyProject",
  "localPath": "C:/Users/you/MyProject",
  "repositoryId": "ado-guid",
  "adoOrg": "myorg",
  "adoProject": "myproject",
  "repoName": "MyProject",
  "mainBranch": "main",
  "workSources": {
    "prd": { "enabled": true, "path": "docs/prd-gaps.json" },
    "pullRequests": { "enabled": true, "path": ".squad/pull-requests.json" },
    "workItems": { "enabled": true, "path": ".squad/work-items.json" }
  }
}
```

Agents, engine settings, claude config, routing, decisions, and playbooks are shared across all projects.

## How the Engine Works

The engine ticks every 60 seconds. On each tick:

1. **Check timeouts** — kill stale agents (>30min inactive)
2. **Consolidate inbox** — merge learnings into `decisions.md` (at 5+ files)
3. **Discover work** — scan all projects for PRD gaps, pending PRs, work items
4. **Update snapshot** — write `identity/now.md`
5. **Dispatch** — spawn agents up to `maxConcurrent` (default 3)

### Work Priority

1. Fix changes-requested PRs (highest — unblocks reviews)
2. Review pending PRs
3. Implement missing PRD items
4. Process manual work items

### Agent Routing (`routing.md`)

| Work Type | Preferred | Fallback |
|-----------|-----------|----------|
| implement | dallas | ralph |
| implement:large | rebecca | dallas |
| review | ripley | lambert |
| fix | _author_ | dallas |
| analyze | lambert | rebecca |
| explore | ripley | rebecca |
| test | dallas | ralph |

### Dispatch items are tagged with `[ProjectName]` so you can see which repo each task belongs to.

## Team

| Agent | Role | Best for |
|-------|------|----------|
| Ripley | Lead / Explorer | Code review, architecture, exploration |
| Dallas | Engineer | Features, tests, UI |
| Lambert | Analyst | PRD generation, docs |
| Rebecca | Architect | Complex systems, CI/infra |
| Ralph | Engineer | Features, bug fixes |

Charters in `agents/{name}/charter.md`. Agents share knowledge via `decisions/inbox/` which the engine consolidates into `decisions.md` — injected into every playbook so future agents inherit past learnings.

## Playbooks

| Playbook | Purpose |
|----------|---------|
| `implement.md` | Build a PRD item in a git worktree, create PR |
| `review.md` | Review a PR, post findings to ADO |
| `fix.md` | Fix review feedback on existing PR branch |
| `analyze.md` | Generate PRD gap analysis |
| `explore.md` | Read-only codebase exploration |

All playbooks use `{{template_variables}}` filled from `config.json` project entries — no hardcoded project names.

## File Layout

```
~/.squad/
  squad.js               <- CLI: init, add, remove, list projects
  engine.js              <- Engine daemon
  dashboard.js           <- Web dashboard server
  dashboard.html         <- Dashboard UI
  config.json            <- projects[], agents, engine, claude settings
  routing.md             <- Dispatch rules table
  decisions.md           <- Team rules + consolidated learnings
  engine/
    control.json         <- running/paused/stopped
    dispatch.json        <- pending/active/completed queue
    log.json             <- Audit trail (capped at 500)
  playbooks/
    implement.md         <- Build a PRD item
    review.md            <- Review a PR
    fix.md               <- Fix review feedback
    analyze.md           <- Generate new PRD
    explore.md           <- Codebase exploration
  agents/
    {name}/
      charter.md         <- Agent identity and boundaries
      status.json        <- Current state
      history.md         <- Cross-session learnings
  identity/
    now.md               <- Engine-generated state snapshot
  decisions/
    inbox/               <- Agent findings drop-box
    archive/             <- Processed inbox files

Each linked project keeps locally:
  <project>/.squad/
    work-items.json      <- Manual work queue
    pull-requests.json   <- PR tracker
  <project>/docs/
    prd-gaps.json        <- PRD gap analysis
```
