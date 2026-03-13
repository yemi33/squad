# Ralph — Learnings from office-bohemia Exploration

**Date:** 2026-03-12

## Key Learnings

1. **office-bohemia is the Microsoft Loop monorepo** — ~227 packages, Yarn 4.12, Lage 2.14, TypeScript 5.9, Node 24+. Main branch is `master`.

2. **Two main apps with different stacks:**
   - **Bebop** (M365 Copilot App): TanStack Start + React 19 + Vite 7 + Nitro + SSR/RSC + React Compiler
   - **Loop App**: React 18 + Webpack + Cloudpack + Fluent UI SPA

3. **Bebop feature-first pattern is strict:** `src/features/<domain>/` with prescribed subfolders. Thin routes, thin server functions. TanStack Query for server state, Jotai for local state. No manual memoization.

4. **Bebop uses custom TanStack RSC tarballs** — `@tanstack/*@0.0.1-rsc-tarball` from local `tarballs/` dir. Not published packages.

5. **Loop App bundles loop-page-container** — Never make cross-changes between Loop App and container packages (CDN compat).

6. **WorkspaceComponent** is how Loop embeds in Teams/Outlook — lives in `apps/loop-app/src/WorkspaceComponent/`.

7. **Scriptor** is the rich text engine — complex MVC with its own service container pattern.

## Patterns Discovered

- Bebop middleware pipeline: auth → locale → hostContext → nonce → inlineCss
- Query option factories used in both loaders (SSR) and components (client)
- CSS Modules for Bebop, not CSS-in-JS
- Beachball change files required for all PRs
- Lage workers in `common/scripts/lage-workers/` for parallel builds

## Gotchas for Future Agents

- **React version split**: Bebop = React 19, Loop App = React 18. Multiple `react-is` resolution hacks.
- **`yarn change` required** before submitting PRs — beachball check will fail without it.
- **PowerShell recommended** for yarn/lage commands (Git Bash causes issues with `yarn` link setup).
- **Main branch is `master`**, not `main`.
- **Memory-heavy bundles**: loop-app and loop-page-container need 6-8GB. Use `NODE_OPTIONS='--max-old-space-size=8192'`.
- **OneDS telemetry drops undeclared fields** — always validate schema changes.

## Conventions to Follow

- Use `--to <pkg>` with all yarn commands for optimal incremental builds
- Use `--since master` for PR-scoped builds
- Feature code starts in `apps/bebop/src/features/` → move to `packages/bebop-*` when reused
- Follow CONTRIBUTING.md for Bebop architecture decisions
- Use `yarn create-bebop-package <name>` to scaffold new bebop packages
