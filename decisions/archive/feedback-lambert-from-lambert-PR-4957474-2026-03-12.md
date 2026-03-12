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
