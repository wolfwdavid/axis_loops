# Lessons

Captured patterns from corrections during builds. Review before starting new work.

---

## L001 — Confirm stack explicitly when user defers the choice
**Date:** 2026-05-17
**Trigger:** Mid-build, user pivoted from Next.js to Svelte after I had defaulted because earlier stack questions were rejected without answers.
**Rule:** If the user declines to answer a stack question, treat the deferral as a flag, not a green light. Either (a) name a 60-second stack lock-in window before scaffolding, or (b) start with the lowest-cost-to-swap scaffolding so a pivot doesn't waste committed work.
**Why:** Stack pivots cost ~10-20 min of the 2-hour budget each. Avoidable with one targeted confirmation right before `create-*` runs.
**How to apply:** Before any `create-next-app` / `create-svelte` / `vite create` command, surface a one-line "locking in <stack> — confirm?" check unless the user has explicitly named the framework.

## L002 — Don't grep against ANSI-coloured logs for readiness
**Date:** 2026-05-17
**Trigger:** Polled the Vite dev-server log for `Local:` to detect ready state. The log contained `[1mLocal[22m:` with terminal escape codes between `Local` and `:`, so the regex never matched and the poll task burned its timeout.
**Rule:** When waiting on a tool's stdout for readiness, prefer one of: (a) a port probe (`curl --silent --fail http://localhost:N` in an until-loop), (b) strip ANSI before matching (`sed 's/\x1b\[[0-9;]*m//g'`), or (c) grep for a token unlikely to be coloured mid-string (e.g. `ready in`, `5173`, `compiled`).
**Why:** Modern build tools (Vite, Next, Turbopack, esbuild) all colour their ready lines. The match silently fails and you don't realize the server is actually up.
**How to apply:** Default to a port probe for dev-server readiness in any build script. Reserve grep-on-log for tools known to emit plain text.
