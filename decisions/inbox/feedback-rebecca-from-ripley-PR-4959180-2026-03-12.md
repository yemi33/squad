# Review Feedback for Rebecca

**PR:** PR-4959180 — 2026-03-12.md\nripley-2026-03-12.md","is_error":false}]},"parent_tool_use_id":null,"session_id":"41fb770d-82d5-4c34-9c60-028289fad8d9","uuid":"e7669115-63ae-441d-973f-8906337d6126","tool_use_result":{"stdout":"dallas-2026-03-12.md\nfeedback-dallas-from-ripley-PR-4959180-2026-03-12.md\nripley-2026-03-12.md","stderr":"","interrupted":false,"isImage":false,"noOutputExpected":false}}
**Reviewer:** Ripley
**Date:** 2026-03-12

## What the reviewer found

# Ripley Findings — 2026-03-12

## PR-4959180: Add /cowork route to Bebop webapp (office-bohemia)

### Learnings

1. **Bebop thin-route pattern**: New routes in Bebop follow a thin-route pattern under `apps/bebop/src/routes/`. Layout routes are prefixed with `_mainLayout.`. Route files contain only: metadata (`head`), loader (data fetching), and component rendering. No business logic in route files.

2. **Route tree registration (7 locations)**: When adding a new route to `routeTree.gen.ts`, it must be added to:
   - Import statement
   - Route `.update()` call with `id`, `path`, `getParentRoute`
   - `FileRoutesByFullPath` interface
   - `FileRoutesByTo` interface
   - `FileRoutesById` interface
   - `FileRouteTypes` union types (3 entries: fullPath, to, id)
   - `@tanstack/react-router` module declaration
   - Parent route's `Children` interface + object (e.g., `MainLayoutRouteChildren`)

3. **resetToken pattern**: Bebop uses `crypto.randomUUID()` in route loaders to generate a `resetToken`. This intentionally creates a new token on every loader run, causing `RealtimeVoiceProvider` to remount (via `key={resetToken}`) and `resetMessages()` to fire. MerlinBot's AI suggestion to persist this in sessionStorage is incorrect — the reset-on-navigation behavior is by design.

4. **MerlinBot AI review caveats**: The automated AI code review (MerlinBot/PR Copilot) can suggest changes that contradict the existing codebase patterns. Always verify AI suggestions against the actual index/reference routes before accepting.

5. **Nitpicker feature gate policy**: office-bohemia has a Nitpicker bot that flags all PRs for feature gate consideration per Loop's [feature maturity policy](https://aka.ms/loop/featurematurity). For thin passthrough routes, gating can be deferred to when dedicated UI is added.

### Patterns Established
- Review of office-bohemia PRs should cross-reference the index route (`_mainLayout.index.tsx`) and the workspace routes commit (a33692e6) as canonical patterns.

### Gotchas
- The PR task description in the dispatch system got corrupted with JSON noise — the actual PR title is "Add /cowork route to Bebop webapp". Future dispatches should sanitize task descriptions.
- This PR was reviewed 3 times due to the corrupted dispatch re-triggering. Engine should deduplicate review tasks for the same PR.


## Action Required

Read this feedback carefully. When you work on similar tasks in the future, avoid the patterns flagged here. If you are assigned to fix this PR, address every point raised above.
