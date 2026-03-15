---
source: rebecca-2026-03-15.md
agent: rebecca
category: build-reports
date: 2026-03-15
---

# Rebecca Learnings — 2026-03-15

## Task: Plan → PRD for W025 (Claude Cowork UX)

### Architecture Findings

#### OfficeAgent Message Protocol is Extensive but Lacks Streaming CoT
- The MessageType enum has 165+ message types covering LLM, search, file operations, agent messages, chat, and workspace operations (source: `modules/message-protocol/src/types/message-type.ts`)
- `ChainOfThoughtPayload` exists but is a simple content string — no structured event streaming (source: `modules/message-protocol/src/types/core.ts`)
- `QueryStatusPayload` has status type, fileInfo, error details — closest existing pattern to what CoT streaming needs (source: `modules/message-protocol/src/types/core.ts`)

#### OfficeAgent CoT Architecture is Queue-Based with Heuristics
- CoT manager uses FileHandler + QueueManager + MessageProcessor pattern (source: `modules/chain-of-thought/src/manager.ts`)
- Three states: enabled/disabled/undecided — decision logic analyzes message content blocks for tool_use patterns
- CoT is **disabled** when clarification questions are being processed — heuristic checks for CLARIFICATION.md reads, chatMessage_resultMessage.txt writes, clarification.py runs (source: `modules/chain-of-thought/src/message-processor.ts:115-121`)
- Flight-gated via `ChainOfThoughtFlights` (useEnhancedHeuristics, sendOnlyNewUpdates, etc.)

#### OfficeAgent WebSocket Has Router + JSON-RPC Dual Pattern
- `WebSocketRouter` routes by message.type to registered handlers (source: `modules/core/src/websocket/router.ts`)
- `JsonRpcRouter` handles JSON-RPC 2.0 requests/notifications/responses separately (source: `modules/core/src/websocket/jsonrpc-router.ts`)
- `WebSocketManager` is a singleton that tracks connections, validates message sizes (MaxJSONMessageSizeContainerMB), and manages send results (source: `modules/core/src/websocket/websocket-manager.ts`)
- Handler pattern: each handler registers for specific message types, receives (message, ws) (source: `modules/api/src/websocket/handlers/`)

#### Clarification Questions Exist but Are One-Way
- Grounding content parser handles `ClarificationQuestions` from messageAnnotations (source: `modules/grounding/src/grounding-content-parser.ts`)
- This is **one-way only**: grounding content → agent context. No bidirectional agent-asks-user-answers protocol exists
- No `ask_user_question` or `user_answer` message types in the 165+ type enum

#### OfficeAgent Has 19 Modules
- api, chain-of-thought, core, excel-headless, excel-parser, git-remote-spo, gpt-agent, grounding, html2pptx, json-to-docx-ooxml, mcp-proxy, message-protocol, orchestrator, pptx-assets, rai, verify-slide-html, example-cs (source: `modules/` directory listing)
- Workspace pattern: `workspace:^` linking, `@officeagent/*` npm scope

#### office-bohemia Cowork is Entirely Greenfield on Main
- No `apps/bebop/src/features/cowork/` directory exists
- No `apps/bebop/src/routes/_mainLayout.cowork.tsx` exists
- Active PRs (W007: PR-4964594, W009: PR-4959092) are adding initial scaffolding but haven't merged
- This means P005 (scaffold) potentially overlaps with these PRs — **open question for coordination**

#### AugLoop is Available in office-bohemia but Not in Bebop
- `packages/augloop/` exists as `@fluidx/augloop` (v20.28.1) with full `@augloop/*` dependency suite
- Used by workspace-status, narrative-builder, loop-app-data-models, copilot-chat packages
- Bebop does NOT directly import AugLoop — it would need to be wired in
- Test client pattern in OfficeAgent (`.devtools/test-client/src/augloop-client.ts`) provides reference architecture

#### Bebop Has No Formal Feature Gating System
- No ECS, flight manager, or feature flag SDK in Bebop core
- Dev features controlled via env vars and query params (`enableDevTools`, `enableCrossOriginIsolation`)
- Chat mode state via Jotai atoms — simple but not a feature flag system
- A cowork feature gate needs to be implemented from scratch (hence P010)

### PRD Design Decisions

1. **Parallel branch strategy chosen** — Cross-repo work (OfficeAgent + office-bohemia) cannot share a single branch. Items use `depends_on` for ordering.
2. **16 items total** — Balanced between granularity (each is a single PR's worth) and not over-fragmenting.
3. **OfficeAgent protocol work (P001-P004) has no cross-dependencies with Bebop scaffold (P005)** — These can proceed in parallel across repos.
4. **Types-first approach** — P001 (message types) is the foundation that P002, P003, P004 all depend on. This is the critical path item.
5. **Local protocol contract in Bebop** — P008 explicitly avoids importing @officeagent/message-protocol to avoid cross-repo build dependency. Open question flagged about whether to publish as npm package.
6. **SharedTree deferred to low priority** — P013, P014 are expensive and require Fluid Framework team coordination. Jotai-only works for single-user v1.

### Gotchas

- **Dallas's lint PR (W007) has 13 lint errors** — 11 from the PR, 2 pre-existing. If P005/P006 build on that PR's patterns, lint must be clean first.
- **Barrel files are banned** — Bebop's `no-barrel-files` lint rule means every import must use concrete paths. Dallas's PR already hit this.
- **office-bohemia main branch is `master` not `main`** — Important for branch creation and PR targets.
- **OfficeAgent uses Yarn 4.10.3, office-bohemia uses Yarn 4.12** — Cross-repo builds are independent pipelines with different TS versions. Can't share build artifacts.
