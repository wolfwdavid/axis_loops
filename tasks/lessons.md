# Lessons

Captured patterns from corrections during builds. Review before starting new work.

---

## L001 — Confirm stack explicitly when user defers the choice
**Date:** 2026-05-17
**Trigger:** Mid-build, user pivoted from Next.js to Svelte after I had defaulted because earlier stack questions were rejected without answers.
**Rule:** If the user declines to answer a stack question, treat the deferral as a flag, not a green light. Either (a) name a 60-second stack lock-in window before scaffolding, or (b) start with the lowest-cost-to-swap scaffolding so a pivot doesn't waste committed work.
**Why:** Stack pivots cost ~10-20 min of the 2-hour budget each. Avoidable with one targeted confirmation right before `create-*` runs.
**How to apply:** Before any `create-next-app` / `create-svelte` / `vite create` command, surface a one-line "locking in <stack> — confirm?" check unless the user has explicitly named the framework.

## L004 — Don't let a tsconfig that extends a generated path cross a build boundary
**Date:** 2026-05-17
**Trigger:** GitHub Actions build of the artifact target failed because the root `tsconfig.json` extends `./.svelte-kit/tsconfig.json` — that directory is generated locally by `svelte-kit sync` but absent in a fresh CI checkout. The artifact build (which doesn't need SvelteKit types at all) was poisoned by the same tsconfig.
**Rule:** When a target has its own build (different Vite config, different entrypoint), give it its OWN `tsconfig.json` inside its root directory. Don't let it inherit a sibling target's generated-file-dependent tsconfig.
**Why:** Generated config files (`.svelte-kit/`, `.next/`, `__generated__/`) aren't reproducible without running the framework's sync step. CI does `npm ci` and then jumps straight to the build target — if your target depends on a generated tsconfig, it breaks the moment it crosses into a clean environment.
**How to apply:** Whenever I add a `vite.<name>.config.ts` with `root: 'src/<name>'`, also create `src/<name>/tsconfig.json` with no `extends` — make it self-sufficient. Verify by running `rm -rf .svelte-kit && npm run build:<name>` before pushing.

## L003 — Scrub AI tooling artifacts BEFORE the initial commit, not after
**Date:** 2026-05-17
**Trigger:** First push to GitHub included `CLAUDE.md` and `.claude/settings.local.json` even though I had done a prose-level scrub of "Claude/Gemini/Anthropic" in markdown files. The tooling files themselves leaked the AI provenance.
**Rule:** Before `git add .` on any initial commit, gitignore the standard tooling-artifact set: `.claude/`, `CLAUDE.md`, `AGENTS.md`, `.cursor/`, `.cursorrules`, `.aider*`, `.continue/`. Then verify with `git status --short | grep -iE "claude|cursor|aider|copilot|agent"` — should be empty.
**Why:** A prose-level scrub catches `s/Claude/model/g` but misses *file names* that ARE the brand. The first commit fingerprinted the toolchain.
**How to apply:** Bake the AI-tooling block into the `.gitignore` template at scaffold time, before the first `git add`. Or run the grep check as a pre-commit gate.

## L002 — Don't grep against ANSI-coloured logs for readiness
**Date:** 2026-05-17
**Trigger:** Polled the Vite dev-server log for `Local:` to detect ready state. The log contained `[1mLocal[22m:` with terminal escape codes between `Local` and `:`, so the regex never matched and the poll task burned its timeout.
**Rule:** When waiting on a tool's stdout for readiness, prefer one of: (a) a port probe (`curl --silent --fail http://localhost:N` in an until-loop), (b) strip ANSI before matching (`sed 's/\x1b\[[0-9;]*m//g'`), or (c) grep for a token unlikely to be coloured mid-string (e.g. `ready in`, `5173`, `compiled`).
**Why:** Modern build tools (Vite, Next, Turbopack, esbuild) all colour their ready lines. The match silently fails and you don't realize the server is actually up.
**How to apply:** Default to a port probe for dev-server readiness in any build script. Reserve grep-on-log for tools known to emit plain text.
