# Engine Restart & Agent Survival

## The Problem

When the engine restarts, it loses its in-memory process handles (`activeProcesses` Map). Claude CLI agents spawned before the restart are still running as OS processes, but the engine can't monitor their stdout, detect exit codes, or manage their lifecycle. Without protection, the heartbeat check (5-min default) would kill these agents as "orphans."

## What's Persisted vs Lost

| State | Storage | Survives Restart |
|-------|---------|-----------------|
| Dispatch queue (pending/active/completed) | `engine/dispatch.json` | Yes |
| Agent status (working/idle/error) | `agents/*/status.json` | Yes |
| Agent live output | `agents/*/live-output.log` | Yes (mtime used as heartbeat) |
| Process handles (`ChildProcess`) | In-memory Map | **No** |
| Cooldown timestamps | In-memory Map | **No** (repopulated from `engine/cooldowns.json`) |

## Protection Mechanisms

### 1. Grace Period on Startup (20 min default)

When the engine starts and finds active dispatches from a previous session, it sets `engineRestartGraceUntil` to `now + 20 minutes`. During this window, orphan detection is completely suppressed — agents won't be killed even if the engine has no process handle for them.

Configurable via `config.json`:
```json
{
  "engine": {
    "restartGracePeriod": 1200000
  }
}
```

### 2. Blocking Tool Detection

Even after the grace period expires, the engine scans each agent's `live-output.log` for the most recent `tool_use` call. If the agent is in a known blocking tool:

- **`TaskOutput` with `block: true`** — timeout extended to the task's own timeout + 1 min
- **`Bash` with long timeout (>5 min)** — timeout extended to the bash timeout + 1 min

This works for both tracked processes and orphans (no process handle).

### 3. Stop Warning

`engine.js stop` checks for active dispatches and warns:
```
WARNING: 2 agent(s) are still working:
  - Dallas: [office-bohemia] Build & test PR PR-4959092
  - Rebecca: [office-bohemia] Review PR PR-4964594

These agents will continue running but the engine won't monitor them.
On next start, they'll get a 20-min grace period before being marked as orphans.
To kill them now, run: node engine.js kill
```

### 4. Exponential Backoff on Failures

If an agent is killed as an orphan and the work item retries, cooldowns use exponential backoff (2^failures, max 8x) to prevent spam-retrying broken tasks.

## Safe Restart Pattern

```bash
node engine.js stop       # Check the warning — are agents working?
# If yes, decide: wait for them to finish, or accept the grace period
# Make your code changes
node engine.js start      # Grace period kicks in for surviving agents
```

## What the Engine Cannot Do

- **Reattach to processes** — Node.js `child_process` doesn't support adopting external PIDs. Once the process handle is lost, the engine can only observe the agent indirectly via file output.
- **Guarantee completion** — An agent that finishes during a restart will have its output saved to `live-output.log`, but the engine won't run post-completion hooks (PR sync, metrics update, learnings check). These are picked up on the next tick via output file scanning.
- **Resume mid-task** — If an agent is killed (by orphan detection or timeout), the work item is marked failed. It can be retried but starts from scratch.

## Timeline of a Restart

```
T+0s     engine.js stop (warns about active agents)
         Engine process exits. Agents keep running as OS processes.

T+30s    Code changes made. engine.js start.
         Engine reads dispatch.json — finds 2 active items.
         Sets grace period: 20 min from now.
         Logs: "2 active dispatch(es) from previous session"

T+0-20m  Ticks run. Orphan detection skipped (grace period).
         If an agent finishes, output is written to live-output.log.
         Engine detects completed output on next tick via file scan.

T+20m    Grace period expires.
         Heartbeat check resumes. Blocking tool detection still active.
         Agent in TaskOutput block:true gets extended timeout.
         Agent with no output for 5min+ and no blocking tool → orphaned.
```
