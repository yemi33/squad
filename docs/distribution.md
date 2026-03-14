# Distribution & Publishing

Squad is distributed as an npm package (`@yemi33/squad`) from a sanitized copy of the main repo.

## Two-Repo Architecture

| Repo | Purpose | What's included |
|------|---------|----------------|
| **origin** (`yemishin_microsoft/squad`) | Full working repo with all session state | Everything — history, notes, decisions, work items, CLAUDE.md |
| **personal** (`yemi33/squad`) | Clean distribution for others | Engine, dashboard, playbooks, charters, skills, docs, npm package files |

## What Gets Stripped

These files are removed during sync to personal:

| Category | Pattern | Reason |
|----------|---------|--------|
| Agent history | `agents/*/history.md` | Session-specific task logs |
| Notes archive | `notes/archive/*` | Historical agent findings |
| Notes inbox | `notes/inbox/*` | Pending agent findings |
| Notes summary | `notes.md` | Consolidated knowledge (runtime) |
| Work items | `work-items.json` | Runtime dispatch tracking |
| Project instructions | `CLAUDE.md` | Org-specific context |

## npm Package

**Package:** `@yemi33/squad`
**Registry:** https://www.npmjs.com/package/@yemi33/squad

### What's in the package

Controlled by the `files` field in `package.json`:
- `bin/squad.js` — CLI entry point
- `engine.js`, `dashboard.js`, `dashboard.html`, `squad.js` — core scripts
- `engine/spawn-agent.js`, `engine/ado-mcp-wrapper.js` — engine helpers
- `agents/*/charter.md` — agent role definitions
- `playbooks/*.md` — task templates
- `config.template.json` — starter config
- `routing.md`, `team.md` — editable team config
- `skills/`, `docs/` — documentation and workflows

### How `squad init` works

1. Copies all package files from `node_modules/@yemi33/squad/` to `~/.squad/`
2. Creates `config.json` from `config.template.json` if it doesn't exist
3. Creates runtime directories (`engine/`, `notes/inbox/`, `notes/archive/`, etc.)
4. Runs `squad.js init` to populate config with default agents
5. On `--force`, overwrites `.js` and `.html` files but preserves user-modified `.md` files

### How updates work

- Users run `npm update -g @yemi33/squad` then `squad init --force` to update engine code
- `npx @yemi33/squad` always fetches the latest version

## Auto-Publishing

A GitHub Action on the personal repo auto-publishes to npm on every push to master.

### How it works

1. Push to `yemi33/squad` master triggers `.github/workflows/publish.yml`
2. Action queries npm for the current published version
3. Bumps patch version (e.g., `0.1.5` → `0.1.6`)
4. Publishes to npm with the new version
5. Commits the version bump back to the repo with `[skip ci]` to prevent loops

### Why version comes from npm, not the repo

The sync-to-personal workflow force-pushes, which overwrites any version bump commits from previous action runs. So the action reads the latest version from the npm registry and bumps from there.

### Setup requirements

- `NPM_TOKEN` secret on `yemi33/squad` — a granular access token with publish permissions and 2FA bypass enabled
- The workflow file (`.github/workflows/publish.yml`) is gitignored on the org repo and force-added during sync

## Sync Workflow

Run `/sync-to-personal` or manually:

```bash
# 1. Create dist branch, strip files, add workflow, force-push
git checkout -b dist-clean
git rm --cached agents/*/history.md notes.md work-items.json CLAUDE.md
git rm -r --cached notes/archive/ notes/inbox/ notes/
# ... add .gitkeep files, .gitignore entries, workflow file
git add -f .github/workflows/publish.yml
git commit -m "Strip for distribution"
git push personal dist-clean:master --force

# 2. Return to master
git checkout master
git branch -D dist-clean
```

The full workflow is documented in `.claude/skills/sync-to-personal/SKILL.md`.
