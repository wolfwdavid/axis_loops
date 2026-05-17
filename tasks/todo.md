# 2nd Axis — Build Plan (2-Hour Sprint, SvelteKit Edition)

Reference: `C:\Users\Mkaru\.claude\plans\lazy-tickling-balloon.md` (approved plan; stack pivoted to Svelte)

## Goal
End-to-end demoable dual-loop GTM intelligence platform with FF13-style sphere-grid viz, prime-agent → cloned-agent flow, and decision-framework UI — in 2 hours.

## Stack (locked, SvelteKit edition)
- **SvelteKit 2** + **Svelte 5** (runes) + **TypeScript**
- **Threlte 8** (`@threlte/core` + `@threlte/extras`) for FF13 sphere grid
- **Tailwind v4** (via `@tailwindcss/vite`)
- **LLM SDK** (`@anthropic-ai/sdk`) — Sonnet 4.6 model
- **Zod** for schema validation
- File-based persistence: `data/clones.json`, `data/decisions.jsonl`

## Phase 1 — Scaffold
- [x] (false start) Next.js scaffolding — torn down (lesson L001)
- [x] Manual SvelteKit scaffold (package.json, svelte.config.js, vite.config.ts, tsconfig.json, src/app.html, src/app.css, src/app.d.ts, +layout.svelte, +page.svelte, .gitignore)
- [x] 6 synthetic logistics-SaaS transcripts (data/transcripts/)
- [x] tasks/todo.md (this file) + tasks/lessons.md (L001, L002)
- [x] src/lib/types.ts — shared FE/BE contract w/ Zod schemas
- [x] npm install completed
- [x] `npm run dev` boots (Vite v6, http://localhost:5173)

## Phase 2 — Backend (subagent)
- [x] `src/lib/server/openclaw.ts` — Profile templating: Intake → Profile (with deterministic logistics-aware fallback if no API key)
- [x] `src/lib/server/agents.ts` — 3-call LLM chain (theme → presales synth → customer synth)
- [x] `src/lib/server/store.ts` — read/write clones.json + decisions.jsonl + transcripts
- [x] `src/routes/api/intake/+server.ts` — POST: Intake → IntakeResponse
- [x] `src/routes/api/spawn/+server.ts` — POST: Profile + companyName → Clone
- [x] `src/routes/api/analyze/+server.ts` — POST: cloneId → Pattern[] (cache or fresh)
- [x] `src/routes/api/decide/+server.ts` — POST: cloneId+patternId+verdict → Decision
- [x] `data/clones.json` seeded with 3 clones × 5 patterns = 15 hand-crafted patterns w/ verbatim citations (Zod-validated)

## Phase 3 — Frontend (subagent)
- [x] `src/routes/+page.svelte` — sphere grid landing
- [x] `src/routes/+page.server.ts` — loads clones from store
- [x] `src/lib/components/SphereGrid.svelte` — Threlte: Fibonacci spiral, 10+ spheres, glowing edges, ambient stars, auto-orbit camera
- [x] `src/lib/components/CloneNode.svelte` — inner sphere + halo, hover-tween scale + emissive, HTML label, click → goto
- [x] `src/routes/clone/[id]/+page.svelte` — two-column detail w/ vocab pills + pattern stream
- [x] `src/routes/clone/[id]/+page.server.ts` — loads clone + falls back to /api/analyze if no cache
- [x] `src/lib/components/PatternCard.svelte` — color-bar, severity badge, implications grid, expandable citations, send-to-CRM/Linear/Reject buttons w/ optimistic "✓ sent"
- [x] `src/routes/intake/+page.svelte` — single-form intake w/ animated multi-stage spawn flow
- [x] `src/lib/components/IntakeForm.svelte` — form → /api/intake → /api/spawn → goto('/')
- [x] FF13-aesthetic: deep navy bg, neon cyan/purple glows, vignette overlay, lowercase HUD labels

## Phase 4 — Integration + Verification
- [x] `npx svelte-kit sync` generated kit types
- [x] Dev server boots clean on :5173
- [x] GET / → HTTP 200, all 3 clones hydrated, Tailwind loaded (64kb)
- [x] GET /clone/clone-1 → HTTP 200, patterns render (EDIFACT/ShipSync/webhook keywords confirmed) (67kb)
- [x] GET /intake → HTTP 200, form fields render (38kb)
- [x] POST /api/decide → 200, valid Decision returned, row persisted to decisions.jsonl
- [x] README.md written
- [x] No vendor-attribution / "AI-generated" boilerplate in user-facing text

## Review

### What got built (vs the 2-hour plan)
- Full E2E path from sphere grid → clone detail → approve → JSONL audit log → spawn-new-clone-via-intake. All HTTP 200, contracts aligned, persistence working.
- 14-agent diagram collapsed cleanly to a 3-call chain with `sourceAgent` preserved on each Pattern so the UI can label "Competitive Intel Agent", "Account Health Agent", etc.
- 15 hand-crafted seeded patterns mean the demo works **without an `ANTHROPIC_API_KEY`** — only new-clone spawning needs the key.
- Stack pivot mid-build (Next.js → SvelteKit) cost ~15 min but was absorbed inside the 2-hour budget via parallel subagents on FE/BE.

### What's explicitly NOT in this build
- Real connectors (Gong, SFDC, Slack, Zendesk) — transcripts are file-drop only.
- Auth, multi-tenancy, DB — JSONL persistence only.
- Live OpenClaw runtime / MCP server — profile templating module only (the "cloning mechanism" is a function, not a separate service).
- Tests beyond the smoke check we ran.
- Production deploy — `adapter-auto` is set but unconfigured for a specific target.

### Demo script (recommend talking to)
1. Open the sphere grid. Three clones, each colour-coded by role (cyan presales / purple customer / white balanced), connected by glowing edges. Pan, orbit.
2. Click "FreightOps Unified" (the balanced clone). Show the cross-loop pattern at the top: *"Carrier coverage is the single biggest cross-loop signal — EDIFACT in 2/3 enterprise deals AND UPS/FedEx in 3/3 renewals."* Expand the citations: real quotes from real (synthetic) customer/prospect calls.
3. Approve it. Logged to `decisions.jsonl`. In production this would post to Salesforce + Linear simultaneously.
4. Click "+ spawn new clone". Fill the form for a different vertical (e.g. fintech). New sphere appears on grid — same code, different profile = the cloning concept made literal.

### Followups
- Live connectors as next phase (Gong reader is highest ROI).
- A `+page.ts` client-side store so the grid live-updates without full reload when a new clone is spawned.
- Persist clones to SQLite once tenancy matters.
