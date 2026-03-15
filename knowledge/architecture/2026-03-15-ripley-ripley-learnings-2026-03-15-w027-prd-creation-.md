---
source: ripley-2026-03-15.md
agent: ripley
category: architecture
date: 2026-03-15
---

# Ripley Learnings — 2026-03-15 (W027 PRD Creation)

## Task
Converted W025 architecture plan into W027 PRD with 17 dispatchable work items across 2 repos.

## Findings

### Codebase Corrections
- **OfficeAgent API routes are split**: W025 referenced `modules/api/src/routes.ts` but actual files are `routes-external.ts` and `routes-internal.ts` (source: `C:/Users/yemishin/OfficeAgent/modules/api/src/routes-external.ts`, `routes-internal.ts`)
- **14 WebSocket handlers exist**: `modules/api/src/websocket/handlers/` has 14 handler files — new CoT and ask-user handlers should follow existing patterns (source: `C:/Users/yemishin/OfficeAgent/modules/api/src/websocket/handlers/`)
- **Orchestrator has rich structure**: `modules/orchestrator/` contains `adapters/`, `hooks/`, `providers/`, `utils/` subdirectories in addition to `types.ts` (source: `C:/Users/yemishin/OfficeAgent/modules/orchestrator/src/`)
- **WebSocket router is in core**: `modules/core/src/websocket/router.ts` handles WebSocket message routing with a `jsonrpc-router.ts` companion (source: `C:/Users/yemishin/OfficeAgent/modules/core/src/websocket/router.ts`)

### PRD Structuring Patterns
- **Cross-repo work items need mirrored types**: When OfficeAgent defines a message protocol type, Bebop needs a matching type (or a shared types package). For this PRD, I chose mirrored types since cross-repo build artifacts can't be shared (different Yarn versions, different TS versions).
- **Maximum useful parallelism is 6 tasks**: Wave 1 can dispatch 6 independent tasks (3 OfficeAgent + 3 office-bohemia). This is the sweet spot before dependency chains narrow the graph.
- **Feature gating should be an early task**: W027-16 (feature gate) only depends on the scaffold, so it can ship early to ensure the route is properly gated before any functional code lands.

### Conventions to Follow
- **Branch naming**: `user/yemishin/cowork-<short-name>` per PR naming standard (source: team notes, yemishin)
- **PR title format**: `feat(cowork): <description>` per type prefix convention (source: team notes)
- **No barrel files in Bebop**: Every import must be a concrete path — Dallas needs this reminder on every task (source: `apps/bebop/CONTRIBUTING.md`, team notes)
- **OfficeAgent flight gating**: New features use `OAGENT_FLIGHTS=<key>:true` env var (source: `CLAUDE.md` line 55, team notes)
- **PowerShell required for OfficeAgent builds**: Bash/sh will fail for build operations (source: `CLAUDE.md` line 7)

### Gotchas for Future Agents
- **SharedTree schema must be designed before implementation**: Schema changes post-deployment require versioning strategy. W027-13 should include a schema design doc as part of its PR (source: team notes, Ripley's prior findings)
- **AugLoop dev endpoint may not be available**: `localhost:11040` is the dev endpoint but requires AugLoop service running locally. Dallas should check availability before starting W027-05 (source: `.devtools/test-client/src/augloop-client.ts`)
- **OfficeAgent logging rules are strict**: No user data in `logInfo`/`logWarn`/`logError`. Only `logDebug` allows user data. All Phase 1 tasks must follow this (source: `CLAUDE.md` lines 61-63)

```skill
---
name: plan-to-prd-conversion
description: Converts an architecture plan into dispatchable PRD work items
allowed-tools: Read, Write, Bash, Glob, Grep
trigger: when converting a plan (plan-*.md) into executable PRD work items for agent dispatch
scope: squad
project: any
---

# Plan-to-PRD Conversion

## Steps
1. Read the source plan and all referenced CLAUDE.md files
2. Read `.squad/notes.md` for team constraints
3. Verify all referenced files exist in the codebase (use Explore agent or Glob/Grep)
4. Correct any file path inaccuracies from the source plan
5. Break each plan phase item into PR-sized tasks with:
   - Unique ID (W{plan_id}-{seq})
   - Repo tag ([RepoName])
   - Branch name following team convention
   - Assignee (usually Dallas for implementation)
   - Depends-on list referencing other task IDs
   - Files to create/modify (verified paths)
   - Acceptance criteria (testable)
   - Testing approach
6. Build a dependency graph showing parallel execution opportunities
7. Identify maximum parallelism waves
8. Flag deferrable tasks explicitly
9. Write to `.squad/plans/plan-{id}-{date}.md`

## Notes
- Each task should produce exactly one PR
- Cross-repo tasks need explicit repo tags
- Mirror types across repos rather than sharing (different build systems)
- Feature gating tasks should be early (low dependencies)
- Always verify file paths — plans often reference idealized paths that differ from reality
```
