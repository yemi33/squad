# Ralph — Explore office-bohemia Architecture

**Date:** 2026-03-12
**Agent:** Ralph (Engineer)
**Task:** Explore office-bohemia codebase and document architecture

---

## Area Explored

Full repository exploration of **office-bohemia** (OC/office-bohemia) — the primary repository for Microsoft Loop. Focused on:

- Repository structure and build system
- Bebop app (M365 Copilot App frontend)
- Loop App (collaborative workspace SPA)
- Key shared packages
- Deployment and infrastructure patterns

---

## Architecture

### Repository Overview

Office-bohemia is a **Yarn 4.12 monorepo** with **~227 packages** orchestrated by **Lage** (task runner). It uses Node.js 24+ and TypeScript 5.9.

| Directory | Purpose |
|-----------|---------|
| `apps/` | 9 applications (bebop, loop-app, loop-m365-app, scriptor-pad, test-app, etc.) |
| `packages/` | ~227 shared packages |
| `tools/` | Build tooling, release, CI/CD helpers |
| `common/` | Shared build scripts, lage workers |
| `azure/` | Deployment configs |
| `docs/` | Engineering documentation |

### Build System

- **Yarn 4.12** workspaces (apps/*, packages/*, tools/*)
- **Lage 2.14** for parallel, cached task orchestration
- Pipeline: `preTranspile → transpile → postTranspile → typecheck → bundle → test`
- Custom lage workers in `common/scripts/lage-workers/` for transpile, typecheck, playwright, dotnet, docker
- Key commands: `yarn build --to <pkg>`, `yarn start --to <pkg>`, `yarn test --to <pkg>`
- `--since master` for incremental builds on changed packages only

### Two Main Apps

#### 1. Bebop (`apps/bebop`) — M365 Copilot App Frontend

**Stack:** TanStack Start, React 19, Vite 7, Nitro, SSR + streaming, React Server Components, React Compiler

**Architecture:**
- **Entry:** `src/start.ts` (middleware setup) → `src/router.tsx` (router + SSR query integration)
- **Routes:** File-based under `src/routes/` (TanStack Router). Layout route `_mainLayout.tsx` with child routes for conversation, conversations, search, workspace, agents, etc.
- **Features:** Domain-organized under `src/features/` with strict convention:
  - `conversation/` — Single conversation view, chat, streaming
  - `conversations/` — Conversation list, nav, search, CRUD
  - `input/` — Chat input, voice
  - `intentDetection/` — Intent detection server logic
  - `nav/` — Navigation chrome, user profile
  - `devTools/` — Dev-only performance/debugging tools
- **Core:** `src/core/` — Middleware (auth, locale, nonce, CSP, host context), i18n, telemetry, performance, query client
- **Shared:** `src/shared/` — Reusable query options, etc.
- **State:** TanStack Query (server state) + Jotai (local UI state)
- **Build:** Vite 7 with Nitro server, React Compiler (babel-plugin-react-compiler), RSC enabled, CSS Modules
- **Dev server:** Port 3000 (HTTP) + auth proxy on port 3001 (HTTPS) at `m365.cloud.dev.microsoft`

**Middleware pipeline (start.ts):**
1. `requestLoggingMiddleware` — Log all requests
2. `authMiddleware` — Extract identity from headers
3. `localeMiddleware` — Detect locale
4. `hostContextMiddleware` — Extract host context
5. `nonceMiddleware` — CSP nonce
6. `inlineCssMiddleware` — Inline CSS for production
7. `functionLoggingMiddleware` — Log server function calls

**Key patterns:**
- Thin routes: metadata + prefetch + render feature component
- Thin server functions: validate (Zod) + delegate to `server/`
- Query option factories for SSR hydration
- No manual memoization (React Compiler handles it)
- CSS Modules with `@layer` for style organization

#### 2. Loop App (`apps/loop-app`) — Loop Web Application

**Stack:** React 18, Webpack, Cloudpack, Fluent UI, MSAL auth

**Architecture:**
- SPA with `src/boot.ts` bootstrap → `src/App.tsx` root
- Provider hierarchy: Theme → Auth → Settings → License → DataModel → AugLoop → Router → Copilot
- Routes: Home, Page (document editing), Workspace, Notebook, Create flows
- `WorkspaceComponent/` for embedding Loop in host apps (Teams, Outlook) via manifest
- Key packages: `loop-page-container` (Fluid container for pages), `office-fluid-container` (Fluid for inline components)

### Shared Package Ecosystem

**Bebop packages (`@bebopjs/*`):** ~30+ packages
- `bebop-ux` — UI components (Chat, AppShell, layouts)
- `bebop-sydney-client` — Sydney (Copilot backend) WebSocket client
- `bebop-services` — Backend service layer (chats, conversations, workspaces, profiles)
- `bebop-auth` — Authentication utilities
- `bebop-telemetry` + plugins — Telemetry (OneDS/Aria integration)
- `bebop-i18n` / `bebop-nav-i18n` — Localization
- `bebop-conversation-orchestrator` — Conversation flow orchestration
- `bebop-response-parser` / `bebop-response-mapping` — Response processing
- `bebop-styles` — CSS design tokens
- `bebop-shared-config` — Sydney defaults, shared configuration
- `bebop-webrtc` — WebRTC for voice/video
- `bebop-local-files` — Local file handling

**Loop packages (`@fluidx/*`):** Core Loop infrastructure
- `loop-page-container` — Fluid container powering Loop pages
- `office-fluid-container` — Fluid container for inline components
- `scriptor` — Rich text editing engine (MVC with Model, View, Controller, Services)
- `tablero` / `tablero-views` — Table component
- `component-ux` — Shared UI
- `loop-app-ux` — Loop app-specific UX
- `base-container` — Container utilities

---

## Patterns

1. **Feature-first organization (Bebop):** `src/features/<domain>/` with `components/`, `queries/`, `mutations/`, `serverFunctions/`, `server/`, `atoms/`, `hooks/`, `client/`
2. **Thin route pattern:** Route files only define metadata, prefetch data via `ensureQueryData`, and render feature entry components
3. **Thin server functions:** `createServerFn` → Zod validate → delegate to `server/`
4. **State split:** TanStack Query for server state, Jotai for local UI state
5. **Dependency flow:** `routes → features → core|shared`. Never `core → features` or `shared → features`
6. **Client/server boundary:** `features/client/` is browser-only, `features/server/` is server-only
7. **No manual memoization:** React Compiler handles optimization in Bebop
8. **Provider hierarchy (Loop App):** Nested context providers with strict ordering
9. **LEAP pattern (Loop Components):** Live, Embeddable, Actionable, Portable components
10. **Beachball change files:** `yarn change` required for PRs (semver change tracking)
11. **Main branch:** `master` (not `main`)
12. **Lage caching:** Outputs cached per-package with content hashing

---

## Dependencies

### Key Dependency Chains

```
Bebop App → @bebopjs/* packages → @fluidx/* packages (some)
Loop App → @fluidx/loop-page-container → @fluidx/scriptor, @fluidx/tablero
Loop App → @fluidx/office-fluid-container (inline components)
WorkspaceComponent → Loop App (embedded in Teams/Outlook hosts)
```

### Critical Avoid

- **Loop App ↔ loop-page-container cross-changes:** Container loaded from CDN by hosts. Cross-changes cause compat issues.
- **React version split:** Bebop = React 19, Loop App = React 18. `react-is` pinned per-package to match.

### External Dependencies

- **TanStack ecosystem:** Router, Start, Query (RSC tarball forks for RSC support)
- **Fluid Framework:** Core collaboration layer
- **Fluent UI:** React component library
- **Nitro:** Server runtime for Bebop
- **Vite 7:** Build tool for Bebop
- **Webpack:** Build tool for Loop App (legacy)

---

## Gaps

1. **React version divergence:** Bebop on React 19, Loop App on React 18. Multiple `react-is` resolution hacks in root `package.json` to prevent conflicts.
2. **TanStack RSC tarballs:** Using `0.0.1-rsc-tarball` local tarballs for TanStack Router/Start — custom forks, not published packages. Fragile dependency.
3. **Build tool divergence:** Bebop uses Vite 7 + Nitro, Loop App uses Webpack + Cloudpack. Different dev workflows.
4. **Feature coverage:** Bebop `src/features/` has 6 features. The `shared/` directory is minimal (only `queryOptions/`). More features likely needed as the app grows.
5. **Scriptor (rich text):** Complex MVC architecture (`Model/`, `View/`, `Controller/`, `Services/`) with its own service container — a mini-framework within the monorepo.

---

## Recommendations

1. **For Bebop work:** Always read `CONTRIBUTING.md` first. Follow the thin-route, thin-server-function patterns strictly. Use query option factories for SSR hydration.
2. **For new features:** Start in `apps/bebop/src/features/<name>/`. Only move to `packages/bebop-*` when code is framework-agnostic and reused across apps.
3. **For builds:** Use `yarn build --to <pkg>` and `--since master` for incremental builds. Memory-heavy bundles (loop-app, loop-page-container) need `--max-old-space-size=8192`.
4. **For testing:** Unit tests are `*.test.ts` (Jest), E2E are `*.playwright-test.ts` (Playwright). Bebop uses Jest 30 with jsdom.
5. **Never checkout on main worktree.** Use `git worktree add`. The main branch is `master` (not `main`).
6. **Change files required:** Run `yarn change` before PRs. Beachball checks are part of validation.
7. **CSS approach in Bebop:** Use CSS Modules (`.module.css`), not CSS-in-JS. Use `@layer` for organization.
8. **Telemetry:** Use `@bebopjs/bebop-telemetry` — OneDS silently drops fields not in schema, so test telemetry changes.
