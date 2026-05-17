# 2nd Axis

A dual-loop GTM intelligence platform. A prime agent intakes a user's business context, generates a profile, and spawns a specialized clone. Each clone runs a pre-sales + existing-customer feedback loop on the user's signal sources (call transcripts, CRM, support tickets) and produces a triage of recommendations a human approves or rejects. Clones are visualized as nodes on a Final-Fantasy-style sphere grid.

## Run

```
cp .env.example .env   # add ANTHROPIC_API_KEY (optional for the seeded demo)
npm install
npm run dev
```

Open http://localhost:5173.

## Demo flow

1. **/** — the sphere grid. Hover a node, click it.
2. **/clone/[id]** — five ranked recommendations with verbatim citations from the source transcripts. Approve to log a decision (mock send to Salesforce or Linear).
3. **/intake** — spawn a new clone from a free-text business description; a new sphere appears on the grid.

Three seeded clones (logistics-SaaS) ship with pre-computed patterns so the demo runs without an API key. Spawning new clones requires `ANTHROPIC_API_KEY`.

## Build for upload to SecondAxis

```
npm run build:artifact
```

Produces `artifact-dist/index.html` — a single self-contained HTML file (~880 KB) ready to upload as a SecondAxis custom artifact. See [SECONDAXIS.md](./SECONDAXIS.md) for prompts to use inside a session.

## Layout

- `src/lib/server/openclaw.ts` — profile templating (the cloning mechanism).
- `src/lib/server/agents.ts` — three-call analysis chain (theme extraction → pre-sales synth → customer synth).
- `src/lib/components/SphereGrid.svelte` — Threlte scene.
- `data/transcripts/` — synthetic source signals.
- `data/clones.json` — clone registry with cached patterns.
- `data/decisions.jsonl` — approve/reject audit log.
