# Squad — Future Improvements

Ordered by difficulty: quick wins first, larger efforts later.

---

## Quick Wins (< 1 hour each)

- [ ] **Output.log append, not overwrite** — keep all dispatch outputs, not just the last one. Rotate by dispatch ID.
- [ ] **Persistent cooldowns** — save cooldown state to disk so engine restarts don't re-dispatch everything
- [ ] **Worktree cleanup on merge/close** — when `pollPrStatus` detects a PR merged or abandoned, auto-remove its worktree. Currently only `runCleanup` catches old worktrees on a timer.
- [ ] **Discovery skip logging** — log why items were skipped during discovery (cooldown, already dispatched, no idle agent) so users can diagnose "why isn't my work item being picked up?"
- [ ] **Idle threshold alert** — if all agents are idle for >N minutes, notify via Teams/dashboard
- [ ] **Config validation at startup** — verify all project paths exist, all agents defined, all playbooks exist. Fail fast with clear errors instead of silently skipping.
- [ ] **macOS/Linux browser launch** — replace Windows `start` command with `open` (macOS) / `xdg-open` (Linux)
- [ ] **Health check endpoint** — `/api/health` returning engine state, project reachability, agent statuses for monitoring
- [ ] **Fan-out per-agent timeout** — when `@everyone` dispatches, set individual deadlines per agent instead of relying only on global `agentTimeout`

## Small Effort (1–3 hours each)

- [ ] **Auto-retry with backoff** — when an agent errors, auto-retry with exponential backoff (5min, 15min, cap at 3 attempts) instead of requiring manual dashboard retry.
- [ ] **Auto-escalation** — if an agent errors 3 times in a row, pause their dispatch and alert via dashboard/Teams
- [ ] **Post-merge hooks** — when a PR merges, trigger configurable actions: clean up worktree, update PRD item status to `done`, notify Teams, update metrics
- [ ] **Pending dispatch explanation** — show in dashboard why each pending item hasn't been dispatched (no idle agent? cooldown? max concurrency?)
- [ ] **Work item editing** — edit title, description, type, priority, agent assignment from the dashboard UI (currently requires editing JSON)
- [ ] **Bulk operations** — retry/delete/reassign multiple work items at once
- [ ] **Per-dispatch artifact archive** — `artifacts/<agent>/<dispatch-id>/` preserving output.log, live-output.log, inbox findings. Never overwritten, indexed by dispatch ID.
- [ ] **Graceful shutdown** — on SIGTERM, wait for active agents to finish (with timeout) before exiting
- [ ] **Shell-agnostic playbooks** — remove PowerShell-specific instructions when running on non-Windows
- [ ] **Build failure notification to author** — when build-and-test files a fix work item, inject the error context into the original implementation agent's next prompt so they learn from the failure
- [ ] **Work item status updates** — show dispatched agent progress in dashboard, link to PRs created

## Medium Effort (3–8 hours each)

- [ ] **Dispatch lifecycle timeline** — for each work item, show: created → queued → dispatched (agent, time) → completed/failed (duration, result). Requires tracking events per item.
- [ ] **Adaptive routing** — use quality metrics (approval rate, error rate) to adjust routing preferences. Deprioritize underperforming agents, promote high-performers.
- [ ] **Cascading dependency awareness** — if work item A blocks B, and A fails, mark B as `blocked`. Requires honoring `depends_on` field (already exists in plan-generated items).
- [ ] **Error pattern detection** — aggregate failed dispatches by type/project. If 3+ failures share the same error, surface an alert instead of dispatching more agents into the same wall.
- [ ] **Shared scratchpad** — in-progress workspace where agents working on related tasks can leave notes for each other without waiting for inbox consolidation
- [ ] **Proactive work discovery** — agents can propose work items by writing to `proposals/` inbox, engine reviews and promotes to work queue
- [ ] **Scheduled tasks** — cron-style recurring work (e.g., "every Monday Lambert regenerates the PRD", "every day Ripley explores recent commits")
- [ ] **Work item → PR → review chain view** — trace a work item through its full lifecycle in the dashboard UI
- [ ] **Auto-trigger new PRD analysis** — when all PRD items are complete/pr-created, automatically dispatch Lambert to generate the next version
- [ ] **Artifact query for agents** — inject recent artifact summaries into agent prompts so they can reference past investigations

## Large Effort (1–2 days each)

- [ ] **Agent message board** — agents can post tagged messages to specific agents or all agents. Injected into recipient's next prompt. Requires message format, routing, expiry, and prompt injection.
- [ ] **Handoff protocol** — agent can mark a task as "blocked on X" or "ready for Y", engine picks up dependencies and sequences dispatch accordingly
- [ ] **Idle task system** — when all work sources are empty, engine assigns background tasks by agent role (Ripley: explore, Lambert: audit docs, Dallas: run tests, Rebecca: check infra)
- [ ] **Live agent output streaming** — real-time stdout/stderr while agents work, not just after completion. Requires WebSocket or SSE from engine to dashboard.
- [ ] **Task decomposition** — large work items auto-decompose into subtasks via analyst agent (similar to plan-to-prd but for individual work items)
- [ ] **Artifact browser in dashboard** — browse past dispatch artifacts, view reasoning chains, search across agent outputs
- [ ] **Temp agent support** — spawn short-lived agents for housekeeping without consuming a permanent squad slot. Minimal system prompt, low maxTurns, auto-cleanup.
- [ ] **Skill editor** — create/edit skills directly in the dashboard UI
- [ ] **PRD diffing** — show what changed between PRD versions in the dashboard

## Ambitious (multi-day)

- [ ] **Dedicated ops agent** — permanent 6th agent scoped to housekeeping: cleanup, status checks, metric collection. Never assigned feature work.
