# Rebecca W003 Findings — Progression UI & Ask-User-Question Design

**Date:** 2026-03-12
**Task:** W003 — Design doc for progression UI and ask-user-question UI
**PR:** PR-4959405 (office-bohemia)

## What I Learned

### bebop-desktop Patterns

1. **ChainOfThoughtCard is the core progression component** — It renders a list of `CoTProcessingStep` objects per message, each with `Pending → InProgress → Complete` status transitions. Steps are streamed progressively with configurable timing delays.

2. **No dedicated question component** — bebop-desktop asks questions via inline assistant message text + `TurnNSuggestions` (quick-reply chips). This is intentionally conversational, not modal.

3. **State management is Zustand-based** — `useChatStore` manages messages and step arrays; `flowPlayerStore` orchestrates timing. Steps are added to the message's `cotProcessingSteps[]` array incrementally.

4. **Flow data is static** — bebop-desktop uses pre-defined flow scenarios (in `src/data/flows/`) with hardcoded steps and timing. Real implementation needs dynamic step generation from Sydney.

5. **Quick Answer skip** — Users can bypass remaining progression steps. Sets a flag that causes all pending steps to complete instantly.

### office-bohemia / Bebop Patterns

6. **Jotai is the local state primitive** — Bebop uses Jotai (not Zustand) for UI state. The design translates bebop-desktop's Zustand patterns to Jotai atoms with dispatch pattern (`chatModeAtoms.ts` is the exemplar).

7. **Feature-first organization is strict** — New features go in `src/features/<name>/` with atoms, components, hooks, types subdirectories. Routes are thin (metadata + prefetch + feature component).

8. **Message rendering pipeline** — `Transcript` in `bebop-conversation` renders messages. Best integration point is composing ProgressionCard around the message renderer at the feature level, not modifying shared packages.

9. **Sydney communication is NDJSON over WebSocket** — The `bebop-conversation-orchestrator` parses the stream. Progression events would need to be added to this protocol.

10. **LatencyText is the existing progress UI** — Shows "Thinking..." during processing. This is the baseline to enhance.

## Architectural Decisions Made

- **Jotai atoms over Zustand** — Matches Bebop's existing patterns
- **Feature-level composition** — Don't modify `bebop-ux` or `bebop-conversation`
- **Inline questions, not dialogs** — Conversational feel matches bebop-desktop's approach
- **Phased rollout** — Start with client-side inference (Option B), evolve to structured Sydney events (Option A)

## Open Questions for Team

1. Sydney protocol support for structured progression events
2. Question answering mechanism (chat input vs separate API)
3. Scope: cowork-only vs all conversations
4. Skip behavior: cancel agent work or just hide UI
5. Step title ownership: Sydney, client, or mapping layer

## Gotchas / Warnings

- bebop-desktop uses Zustand; Bebop uses Jotai — don't copy patterns directly
- bebop-desktop flows are static data; real implementation needs dynamic Sydney events
- `bebop-conversation` and `bebop-ux` are shared packages — avoid modifying them for feature-specific UI
- The cowork route may not exist yet on master — check PR-4959180 status
