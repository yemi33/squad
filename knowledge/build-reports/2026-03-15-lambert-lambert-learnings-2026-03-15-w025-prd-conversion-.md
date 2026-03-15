---
source: lambert-2026-03-15.md
agent: lambert
category: build-reports
date: 2026-03-15
---

# Lambert Learnings — 2026-03-15 (W025 → PRD Conversion)

## Task
Converted Ripley's W025 architecture plan ("Claude Cowork UX in Bebop with OfficeAgent Capabilities, AugLoop Integration, and 1JS Packaging") into a dispatchable PRD with 14 work items across 2 repos.

## Findings

### Codebase Verification Results

1. **AugLoop transport is test-only**: The only AugLoop integration exists at `.devtools/test-client/src/augloop-client.ts` (382 lines). It's a singleton `AugLoopClient` class supporting 8 environments (Dev, Local, Test, Int, Dogfood, MSIT, Prod, UsGov, Gallatin) with HTTP+WS+annotation support. No production module exists. (source: `C:/Users/yemishin/OfficeAgent/.devtools/test-client/src/augloop-client.ts`)

2. **Chain-of-thought is file-only**: `modules/chain-of-thought/src/manager.ts` exports `trackChainOfThought()`, `initChainOfThought()`, `closeChainOfThought()`, `getFileHandler()`. All output goes through `FileHandler` + `QueueManager` to disk. Zero WebSocket capability. (source: `C:/Users/yemishin/OfficeAgent/modules/chain-of-thought/src/manager.ts`)

3. **91 message types, none for real-time CoT streaming**: `MessageType` enum in `modules/message-protocol/src/types/message-type.ts` has 91 entries. Closest matches are `WorkspaceChainOfThought` (line 123) and `PptAgentCot` (line 164) — both are batch/final-state, not real-time streaming. No `chain_of_thought_update`, no `ask_user_question`, no `user_answer`. (source: `C:/Users/yemishin/OfficeAgent/modules/message-protocol/src/types/message-type.ts`)

4. **ask_user_question exists as ppt-agent tool, not protocol**: Referenced in `agents/ppt-agent/docs/PPTX_SKILL_XAVIER_INTEROP.md:161` as a non-modifying utility tool, and in `modules/message-protocol/src/types/agents/ppt-agent/messages.ts:199` where it ends the agent loop. The concept exists but isn't formalized at the message-protocol level. (source: `C:/Users/yemishin/OfficeAgent/agents/ppt-agent/docs/PPTX_SKILL_XAVIER_INTEROP.md`, `modules/message-protocol/src/types/agents/ppt-agent/messages.ts:199`)

5. **14 WebSocket handlers confirm the pattern**: `modules/api/src/websocket/handlers/` contains 14 handler files plus an index.ts. New handlers (cot-stream-handler, ask-user-handler) should follow this established pattern. (source: `C:/Users/yemishin/OfficeAgent/modules/api/src/websocket/handlers/`)

6. **Routes are split external/internal as expected**: `modules/api/src/routes-external.ts` (HTTP: /ping, /test, /download) and `modules/api/src/routes-internal.ts` (internal API + WebSocket registration). New AugLoop transport registers on internal routes. (source: `C:/Users/yemishin/OfficeAgent/modules/api/src/routes-external.ts`, `routes-internal.ts`)

7. **Orchestrator has rich substructure**: `modules/orchestrator/src/` contains `adapters/` (claude-options, ghcp-options), `hooks/` (claude-hook-adapter), `providers/` (base, claude, ghcp orchestrators), plus `factory.ts`, `cot-adapter.ts`, `env-builder.ts`, `harness-builder.ts`. (source: `C:/Users/yemishin/OfficeAgent/modules/orchestrator/src/`)

8. **WebSocket core has JSON-RPC router**: `modules/core/src/websocket/` includes `router.ts`, `jsonrpc-router.ts`, `websocket-manager.ts`, `request-response-handler.ts`, `errors.ts`, `settings.ts`, and user context storage. The JSON-RPC router is important for bidirectional ask-user flows. (source: `C:/Users/yemishin/OfficeAgent/modules/core/src/websocket/`)

### PRD Decisions

- **Parallel branch strategy**: Cross-repo plan requires parallel (not shared-branch) since office-bohemia and OfficeAgent have independent build systems (Yarn 4.12 vs 4.10.3, different TS versions).
- **14 items, not 17**: Collapsed Ripley's earlier 17-item PRD estimate into 14 by merging related work. Feature gating moved to P005 (Wave 2) rather than Wave 4.
- **Wave 1 parallelism = 3**: P001 (transport), P002 (CoT streaming), P004 (scaffold) have zero dependencies and can dispatch simultaneously.
- **Phase 4 deferred**: SharedTree DDS (P011) and AugLoop Annotations (P012) marked as low priority / deferrable v2. Single-user Jotai-only mode is sufficient for v1.
- **Mirrored types, not shared**: OfficeAgent message types must be mirrored in office-bohemia (P007) since cross-repo build artifacts can't be shared.

### Gotchas for Implementing Agents

- **PowerShell mandatory for OfficeAgent**: All yarn/oagent/gulp commands must run in PowerShell. Bash/sh will fail. (source: `C:/Users/yemishin/OfficeAgent/CLAUDE.md` line 7)
- **OfficeAgent logging rules**: No user data in `logInfo`/`logWarn`/`logError`. Only `logDebug` allows user data. All Phase 1 tasks must comply. (source: `C:/Users/yemishin/OfficeAgent/CLAUDE.md` lines 61-63)
- **No barrel files in Bebop**: Every import must use concrete paths. The `no-barrel-files` lint rule is enforced. (source: `apps/bebop/CONTRIBUTING.md`, team notes)
- **SharedTree schema must be designed before implementation**: Schema changes post-deployment require versioning. P011 PR should include schema design doc. (source: team notes, Ripley's prior findings)
- **AugLoop dev endpoint availability**: `localhost:11040` requires local AugLoop service. Implementers should verify availability before starting P001. (source: `.devtools/test-client/src/augloop-client.ts`)

### Open Questions Flagged

7 open questions documented in PRD covering: 1JS host priority, AugLoop readiness, SharedTree deferral, agent scope for v1, Figma designs, auth flow, Sydney coexistence.
