You are a knowledge manager for a software engineering squad. Your job is to consolidate agent notes into team memory.

## Inbox Notes to Process

<note file="feedback-dallas-from-ripley-PR-4970128-2026-03-16.md">
# Review Feedback for Dallas

**PR:** PR-4970128 — feat(PL-W015): add CoT streaming and ask-user-question protocol types
**Reviewer:** Ripley
**Date:** 2026-03-16

## What the reviewer found

# Ripley Learnings — 2026-03-16 (PR-4970128 Review — Duplicate Dispatch #21+)

## Task
Review PR-4970128: feat(PL-W015): add CoT streaming and ask-user-question protocol types

## Outcome
**Early bail-out applied.** This PR has 20+ existing review threads all confirming APPROVE. Same 3 commits since first review. No action needed.

## Findings

### Duplicate Dispatch Pattern Continues
PR-4970128 has now been dispatched for review 21+ times with zero new commits. The engine dispatch router still lacks pre-flight commit SHA and voter checks. (source: PR-4970128 threads on ADO)

### Early Bail-Out Validated Again
Checking thread history via ADO REST API (~15 seconds) saved a full review cycle (5-10 minutes). Pattern: fetch threads → check for existing APPROVE verdicts → post closed-status confirmation → re-submit vote. (source: `GET /pullRequests/4970128/threads?api-version=7.1`)

### ADO REST API Patterns (Windows)
- `/dev/stdin` does NOT work with Node.js on Windows — use `process.stdin` event-based reading or temp files
- Temp file pattern: write JSON to `$TEMP/filename.json`, reference via `@"$TEMP/filename.json"` in curl
- Use `dev.azure.com` hostname, not `office.visualstudio.com`
- VSID retrieval: `GET /_apis/connectionData?api-version=6.0-preview` → `authenticatedUser.id`
- Vote submission: `PUT /pullRequests/{id}/reviewers/{vsid}?api-version=7.1` with `{"vote": 10}`

## Action Items
- **Engine dispatch router MUST implement pre-flight checks**: Compare commit SHAs and existing voter state before queuing review tasks. This PR alone has wasted 20+ agent cycles.


## Action Required

Read this feedback carefully. When you work on similar tasks in the future, avoid the patterns flagged here. If you are assigned to fix this PR, address every point raised above.

</note>

<note file="ralph-2026-03-16.md">
# Ralph Learnings — 2026-03-16 (PR-4970128 Fix Review — Early Bail-Out)

## Task
Fix review issues on PR-4970128 (feat/PL-W015-cot-askuser-types).

## Findings

### 1. No Action Needed — Implementation Notes Misclassified as Review Issues
The dispatched "review findings" from Yemi Shin were Dallas's implementation notes summarizing what was added (3 MessageType entries, build/test pass). These are not actionable code feedback. (source: PR-4970128 thread #1, ADO REST API)

### 2. PR Already Fully Approved
PR-4970128 has 44+ threads, mostly duplicate bail-out confirmations. Yemi Shin voted 10 (APPROVE). 3 commits on branch, all review feedback already addressed in prior commits. (source: PR-4970128 threads via `https://dev.azure.com/office/ISS/_apis/git/repositories/61458d25-9f75-41c3-be29-e63727145257/pullRequests/4970128/threads`)

### 3. OfficeAgent Repo Location
OfficeAgent repo is at `C:\Users\yemishin\OfficeAgent\`, `.squad` dir is at `C:\Users\yemishin\.squad\` (the squad repo, not OfficeAgent). Must fetch from the correct repo. (source: filesystem layout)

### 4. Windows /dev/stdin Incompatible with Node.js
Node.js on Windows resolves `/dev/stdin` to `C:\dev\stdin` which doesn't exist. Use temp files for piping data to node: write to `$TEMP/file.json`, read via `process.env.TEMP + '/file.json'`. (source: runtime error during ADO API thread fetch)

## Patterns Reinforced
- **Early bail-out pattern**: Check PR threads + votes before creating worktrees. Saved full review cycle (~5-10 min).
- **ADO REST API temp file pattern**: Write JSON payloads to `$TEMP/*.json` on Windows, use `@"$TEMP/file.json"` in curl.
- **dev.azure.com hostname**: Always use `dev.azure.com` for REST API calls.

## Outcome
Posted closed-status thread (ID: 62193444) confirming no action required. No code changes made.

</note>

<note file="ripley-2026-03-16.md">
# Ripley Learnings — 2026-03-16 (PR-4970128 Review — Duplicate Dispatch #21+)

## Task
Review PR-4970128: feat(PL-W015): add CoT streaming and ask-user-question protocol types

## Outcome
**Early bail-out applied.** This PR has 20+ existing review threads all confirming APPROVE. Same 3 commits since first review. No action needed.

## Findings

### Duplicate Dispatch Pattern Continues
PR-4970128 has now been dispatched for review 21+ times with zero new commits. The engine dispatch router still lacks pre-flight commit SHA and voter checks. (source: PR-4970128 threads on ADO)

### Early Bail-Out Validated Again
Checking thread history via ADO REST API (~15 seconds) saved a full review cycle (5-10 minutes). Pattern: fetch threads → check for existing APPROVE verdicts → post closed-status confirmation → re-submit vote. (source: `GET /pullRequests/4970128/threads?api-version=7.1`)

### ADO REST API Patterns (Windows)
- `/dev/stdin` does NOT work with Node.js on Windows — use `process.stdin` event-based reading or temp files
- Temp file pattern: write JSON to `$TEMP/filename.json`, reference via `@"$TEMP/filename.json"` in curl
- Use `dev.azure.com` hostname, not `office.visualstudio.com`
- VSID retrieval: `GET /_apis/connectionData?api-version=6.0-preview` → `authenticatedUser.id`
- Vote submission: `PUT /pullRequests/{id}/reviewers/{vsid}?api-version=7.1` with `{"vote": 10}`

## Action Items
- **Engine dispatch router MUST implement pre-flight checks**: Compare commit SHAs and existing voter state before queuing review tasks. This PR alone has wasted 20+ agent cycles.

</note>

## Existing Team Notes (for deduplication — do NOT repeat what's already here)

<existing_notes>
...
 → see `knowledge/conventions/2026-03-16-windows-temp-file-pattern.md`

- **ADO domain convention**: Use `dev.azure.com` (not `office.visualstudio.com`) for REST API calls _(Ripley)_
  → see `knowledge/conventions/2026-03-16-ado-domain-convention.md`

#### Bugs & Gotchas
- **Engine dispatch re-queues unchanged PRs**: PR-4970916 dispatched 8+ times and PR-4970128 dispatched 6+ times with zero new commits; existing APPROVE votes ignored _(Dallas, Ripley)_
  → see `knowledge/build-reports/2026-03-16-engine-dispatch-pre-flight-checks.md`

#### Action Items
- **Engine dispatch router needs three pre-flight checks**: (1) compare branch commit SHAs against last reviewed state via git log, (2) check existing reviewer votes in ADO, (3) classify review findings content for "no action required" keywords before dispatching fix-review tasks _(Dallas, Ripley)_
  → see `knowledge/build-reports/2026-03-16-engine-dispatch-pre-flight-checks.md`

_Processed 3 notes, 6 insights extracted, 1 duplicate removed._

---

### 2026-03-16: Agent-authored comments misclassified in engine dispatch

**By:** Engine (LLM-consolidated)

#### Bugs & Gotchas
- **Engine feeds agent bail-out notes back as review findings**: Dallas's own "no action needed" consolidation notes from PR-4970916 were misclassified as actionable review findings, triggering 10+ redundant re-dispatches with identical commits _(Dallas, Lambert)_
  → see `knowledge/build-reports/2026-03-16-dallas-dallas-learnings-2026-03-16-pr-4970916-8th-dispatc.md`

#### Action Items
- **Engine must filter agent-authored comments from review findings classification**: Consolidation and inbox processing must exclude agent-authored comments (especially bail-out notes) when routing "review findings" to prevent infinite dispatch loops _(Dallas)_
  → see `knowledge/build-reports/2026-03-16-dallas-dallas-learnings-2026-03-16-pr-4970916-8th-dispatc.md`

_Processed 3 notes, 1 insight extracted, 7 existing patterns reinforced, 1 duplicate consolidated._
</existing_notes>

## Instructions

Read every inbox note carefully. Produce a consolidated digest following these rules:

1. **Extract actionable knowledge only**: patterns, conventions, gotchas, warnings, build results, architectural decisions, review findings. Skip boilerplate (dates, filenames, task IDs).

2. **Deduplicate aggressively**: If an insight already exists in the existing team notes, skip it entirely. If multiple agents report the same finding, merge into one entry and credit all agents.

3. **Write concisely**: Each insight should be 1-2 sentences max. Use **bold key** at the start of each bullet.

4. **Group by category**: Use these exact headers (only include categories that have content):
   - `#### Patterns & Conventions`
   - `#### Build & Test Results`
   - `#### PR Review Findings`
   - `#### Bugs & Gotchas`
   - `#### Architecture Notes`
   - `#### Action Items`

5. **Attribute sources**: End each bullet with _(agentName)_ or _(agent1, agent2)_ if multiple.

6. **Write a descriptive title**: First line must be a single-line title summarizing what was learned. Do NOT use generic text like "Consolidated from N items".

7. **Reference the knowledge base**: Each note is being filed into the knowledge base at these paths. After each insight bullet, add a reference link so readers know where to find the full detail:
- `feedback-dallas-from-ripley-PR-4970128-2026-03-16.md` → `knowledge/reviews/2026-03-16-feedback-review-feedback-for-dallas.md`
- `ralph-2026-03-16.md` → `knowledge/conventions/2026-03-16-ralph-ralph-learnings-2026-03-16-pr-4970128-fix-review-e.md`
- `ripley-2026-03-16.md` → `knowledge/conventions/2026-03-16-ripley-ripley-learnings-2026-03-16-pr-4970128-review-dupl.md`
   Format: `→ see knowledge/category/filename.md` on a new line after the insight, indented.

## Output Format

Respond with ONLY the markdown below — no preamble, no explanation, no code fences:

### YYYY-MM-DD: <descriptive title>
**By:** Engine (LLM-consolidated)

#### Category Name
- **Bold key**: insight text _(agent)_
  → see `knowledge/category/filename.md`

_Processed N notes, M insights extracted, K duplicates removed._

Use today's date: 2026-03-16