# AGENTS.md

## Petko repository

- Read `context/CLAUDE.md` and the applicable `context/STANDARDS-fe.md` or `context/STANDARDS-be.md` before editing. Project standards and existing API contracts take precedence over generic agent examples.
- Install: `npm run install:all`. Verify: `npm run lint`, `npm test -- --runInBand`, `npm run test:e2e --prefix petko-be -- --runInBand`, and `npm run build`.
- Production is `https://petko-rho.vercel.app`. Feature branch → reviewed PR → merge commit to `main` → Vercel production deployment. Never push directly to `main`.
- Never read real `.env` files or expose secrets. Use placeholder environment values for automated checks.
- This repository includes the Atom portable Codex kit: seven agents in `.codex/agents/` and seven skills in `.agents/skills/`. See the README for setup and refresh instructions.

<!-- BEGIN codex-agent-kit (managed by install.mjs; edits inside this block are replaced on reinstall) -->
## Agents

Delegate work in these lanes to the named agent (Codex: "Have the <agent> …"). Codex loads them from `.codex/agents/<name>.toml`.

- `coder`: everyday implementation (features, fixes, refactors); delegates to the others
- `architect`: designs, plans, ADRs, estimates, technology research and comparisons; writes docs only, never code
- `backend-engineer`: APIs, schema and migrations, SQL, jobs, integrations, data pipelines
- `debugger`: root-causing bugs, failing or flaky tests, red CI; finding and writing missing tests
- `devops-engineer`: CI/CD, Docker, deploys, env and secrets, observability, new-repo setup
- `frontend-engineer`: UI components, pages, forms, styling, accessibility, distinctive or on-brand (branding-v1) design
- `reviewer`: read-only review of a diff (branch or uncommitted), severity-ranked findings

## Routing (keep tokens low)

- Small, clear task (one or two files): do it yourself. Don't spawn an agent.
- Squarely in one lane: spawn that one agent directly, not `coder` first.
- Mixed or unclear: `coder`. Spawn several agents only for genuinely independent work.
- Give a spawned agent the goal, paths, and the "done" check. It doesn't see this conversation.

## Ground rules

- Read the code before changing it and cite `file:line`. Never use an API, flag, or import you haven't verified exists in this repo, its installed dependencies, or current docs (`web-research`).
- Prove "done" with real command output (tests, lint, typecheck, a rendered page). Say what wasn't verified.
- Commit or push only when asked. Never read `.env` files or print secrets. Destructive or shared-environment actions need explicit confirmation and a rollback.
<!-- END codex-agent-kit -->
