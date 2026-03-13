# Review Feedback for Lambert

**PR:** PR-4925465 — 2b21-4d86-8002-2bd196be766b","uuid":"e01a8a14-4ac0-46c9-a65e-45a545152851"}
**Reviewer:** Lambert
**Date:** 2026-03-12

## What the reviewer found

# Review Feedback for Lambert

**PR:** PR-4957474 — a6fe-4f9e-aedb-c2b75c69d477","uuid":"3967d68e-fbe7-48b5-b543-c00e7d9c3046"}
**Reviewer:** Lambert
**Date:** 2026-03-12

## What the reviewer found

# Lambert Learnings — 2026-03-12

## PR-4957474: [Bebop] Add latency message to bebop-conversation

### Patterns Discovered

1. **Bebop MessageTemplates pattern**: The `MessageTemplates` interface in `bebop-conversation-orchestrator` uses a render-function-per-message-type pattern (`renderUserMessage`, `renderBotMessage`, `renderLatencyMessage`). Each returns an HTML string. When adding new message types to the DOM-based chat path, follow this pattern: add a type alias, add it to the `MessageTemplates` interface, implement in `bebop-conversation/src/templates/`.

2. **DOM-based streaming lifecycle hooks**: The `TranscriptRenderer.streamResponse()` method accepts `WriteStreamOptions` which can carry lifecycle callbacks like `onFirstChunk`. The `#streamWithMetrics` method fires these. The pattern for "do X when first content arrives" is: pass a callback in `WriteStreamOptions`, fire it inside the `write` delegate when `firstTokenReceivedTime` is first assigned.

3. **Translation hydration in Bebop routes**: Bebop conversation routes load translation namespaces in the `loader()` function via `getTranslations({ data: { namespaces: [...] } })` and hydrate them in the component with `useHydrateTranslations(translations)`. When a new translation namespace is needed, both the loader AND the component must be updated.

4. **CSS module pattern for Bebop templates**: Since message templates return raw HTML strings (not React), CSS is handled via CSS Modules (`.module.css`) with manually authored `.d.ts` type declarations. The CSS uses `@layer components { @layer defaults { ... } }` nesting. Class names use BEM-like `bebop-<Component>__<element>` convention.

### Gotchas

- **Templates object in hooks**: Moving `const templates` from module scope into a React hook body means it's recreated every render. This is currently harmless because `conversationOrchestrators.get()` caches, but could cause subtle bugs if the orchestrator ever re-reads templates after initialization.
- **Raw HTML interpolation of translations**: The latency template interpolates translated text directly into HTML without escaping. Safe for controlled i18n strings, but worth being cautious if this pattern is copied for user-supplied content.


## Action Required

Read this feedback carefully. When you work on similar tasks in the future, avoid the patterns flagged here. If you are assigned to fix this PR, address every point raised above.


# Lambert Learnings — 2026-03-12

## PR-4957474: [Bebop] Add latency message to bebop-conversation

### Patterns Discovered

1. **Bebop MessageTemplates pattern**: The `MessageTemplates` interface in `bebop-conversation-orchestrator` uses a render-function-per-message-type pattern (`renderUserMessage`, `renderBotMessage`, `renderLatencyMessage`). Each returns an HTML string. When adding new message types to the DOM-based chat path, follow this pattern: add a type alias, add it to the `MessageTemplates` interface, implement in `bebop-conversation/src/templates/`.

2. **DOM-based streaming lifecycle hooks**: The `TranscriptRenderer.streamResponse()` method accepts `WriteStreamOptions` which can carry lifecycle callbacks like `onFirstChunk`. The `#streamWithMetrics` method fires these. The pattern for "do X when first content arrives" is: pass a callback in `WriteStreamOptions`, fire it inside the `write` delegate when `firstTokenReceivedTime` is first assigned.

3. **Translation hydration in Bebop routes**: Bebop conversation routes load translation namespaces in the `loader()` function via `getTranslations({ data: { namespaces: [...] } })` and hydrate them in the component with `useHydrateTranslations(translations)`. When a new translation namespace is needed, both the loader AND the component must be updated.

4. **CSS module pattern for Bebop templates**: Since message templates return raw HTML strings (not React), CSS is handled via CSS Modules (`.module.css`) with manually authored `.d.ts` type declarations. The CSS uses `@layer components { @layer defaults { ... } }` nesting. Class names use BEM-like `bebop-<Component>__<element>` convention.

### Gotchas

- **Templates object in hooks**: Moving `const templates` from module scope into a React hook body means it's recreated every render. This is currently harmless because `conversationOrchestrators.get()` caches, but could cause subtle bugs if the orchestrator ever re-reads templates after initialization.
- **Raw HTML interpolation of translations**: The latency template interpolates translated text directly into HTML without escaping. Safe for controlled i18n strings, but worth being cautious if this pattern is copied for user-supplied content.

## PR-4945314: Fix clientFetchDurationMS measuring prefetch time instead of navigation time

### Patterns Discovered

1. **Prefetch vs. navigation timing in Bebop**: TanStack Router's `preload="intent"` triggers `queryFn` on hover, not on navigation. Any `performance.now()` timing inside a `queryFn` captures prefetch latency, not the user's actual navigation wait. The correct place to measure client-perceived fetch latency is in the route `loader`, wrapping `ensureQueryData`. When data was prefetched, `ensureQueryData` returns from cache near-instantly, giving an accurate ~0ms client wait.

2. **Loader data as a timing sidecar**: Route loaders can return timing metadata alongside query orchestration. The pattern `return { clientFetchStartTime, clientFetchEndTime }` from a loader, consumed via `Route.useLoaderData()`, is a clean way to pass non-query auxiliary data through the route without polluting query cache types.

3. **Keep query data types pure**: Timing/instrumentation fields (`clientFetchStartTime`, `clientFetchEndTime`) don't belong in `ConversationQueryData`. They're measurement artifacts, not domain data. Removing them from the query type and passing them through loader data is the right separation of concerns.

### Gotchas

- **`ConversationQueryData` still intersects `{ traceResults }` with `ConversationResponse`**: If `fetchConversation` already returns `traceResults` as part of its response shape, this intersection type may be redundant. Worth verifying in a follow-up to simplify the type.

## PR-4925465: [bebop] core and shared app folders + AGENTS.md / CLAUDE.md

### Patterns Discovered

1. **Bebop directory layering is now formalized**: `src/core/` (infrastructure), `src/shared/` (app-level reuse), `src/features/` (domain code). Dependency flow: `routes → features → core|shared`. Never reverse.

2. **AGENTS.md + CONTRIBUTING.md is the documentation pattern**: `CLAUDE.md` files just `@`-include `AGENTS.md` and `CONTRIBUTING.md`. The actual content lives in those two files. AGENTS.md is concise rules, CONTRIBUTING.md is full architecture docs.

3. **Import alias convention**: Bebop uses `~/` as path alias to `src/`. Most files use it consistently, but some route files use relative paths (`../../core/...`). Both work but mixing is a minor inconsistency.

4. **`bebop-tanstack` is the old name**: README.md had stale references to `bebop-tanstack` which were cleaned up to `bebop`. If you see `bebop-tanstack` anywhere, it's outdated.

### Gotchas

- **Pre-existing `core → features` violation**: `src/core/server/functions/chat/streamChatJson.ts` imports from `~/features/conversation/serverFunctions/...`. This violates the stated dependency rule. Worth tracking for a future cleanup.


## Action Required

Read this feedback carefully. When you work on similar tasks in the future, avoid the patterns flagged here. If you are assigned to fix this PR, address every point raised above.
