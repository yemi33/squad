# Changelog

## 0.1.x (2026-03-13)

### npm Package & Distribution
- **npm package `@yemi33/squad`** — install with `npm install -g @yemi33/squad` or `npx @yemi33/squad init`
- **Unified CLI** (`bin/squad.js`) — single `squad` command for all operations: `squad init`, `squad start`, `squad dash`, `squad add`, `squad work`, etc.
- **GitHub Action** — auto-publishes to npm on every push to master, with version bump from npm registry
- **Sanitized distribution** — personal repo strips all session data (history, notes, decisions, work items, CLAUDE.md) for clean first-time user experience
- **Hardcoded values removed** — no internal usernames, project names, or absolute paths in distributed code

### Engine
- **`/plan` command** — full pipeline: feature description → PRD items → agent dispatch across projects
- **Shared feature branches** — dependency-aware dispatch ensures agents work on the same branch when tasks are related
- **Human PR feedback loop** — `@squad` comments on PRs trigger agent fix tasks automatically
- **Squad-level PRD** — multi-project PRD support, not just per-project
- **`/ask` command** — ask questions via Command Center, get answers delivered to inbox
- **Auto-detect user questions** — drop `ask-*.md` files in inbox, engine routes to an agent
- **Solo reviewer skip** — `@squad` keyword not required when you're the only reviewer on a PR
- **decisions → notes rename** — consolidated knowledge base now uses `notes/` directory
- **Zombie engine elimination** — EPERM file lock fixes, stale PID detection, Windows-safe atomic writes
- **ADO token auto-refresh** — handles expired Azure DevOps authentication tokens
- **Output rotation** — agent output logs rotated to prevent disk bloat
- **Cooldown system** — prevents re-dispatching recently completed work
- **Post-merge cleanup** — automatically marks work items done when PRs merge
- **Fan-out timeout** — configurable timeout for parallel multi-agent dispatches
- **Idle agent alerts** — dashboard shows when agents have been idle too long

### Dashboard
- **Responsive layout** — tablet and mobile breakpoints
- **Mention popup improvements** — Tab cycling, wrap-around navigation, active highlight
- **Ghost-style send button** — cleaner Command Center UI
- **Mention popup repositioned** — below input for better visibility
- **Platform-aware launches** — browser and file manager commands adapt to OS
- **Health check endpoint** — `/api/health` for monitoring

### Documentation
- Updated README with npm install instructions and unified CLI reference
- Engine restart guide (`docs/engine-restart.md`)
- Updated file layout, playbook table, and portability section
