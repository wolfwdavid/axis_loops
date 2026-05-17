# Hosting 2nd Axis on SecondAxis

## Build the artifact

```
npm run build:artifact
```

Output: `artifact-dist/index.html` — a single, self-contained HTML file (~880 KB) with all JS, CSS, seed data, and the Threlte 3D scene inlined. No external requests needed at runtime.

## Upload

Open your SecondAxis session and use the file-upload affordance. Upload `artifact-dist/index.html`. The 3 seeded logistics-SaaS clones, their 15 cached patterns, and the intake/decide flows all work offline. Decisions and newly-spawned clones persist in `localStorage` inside the artifact.

What this build does **not** do: live model analysis on newly-spawned clones (the artifact has no server). For that, point users at the full SvelteKit deployment.

## Kick-off prompt (paste first, after uploading)

> **Context.** I've uploaded an interactive dashboard called **2nd Axis**. It's a dual-loop GTM intelligence platform I'm building. A "prime agent" intakes a user's business profile and spawns specialized cloned agents — each clone runs two feedback loops (pre-sales signals + existing-customer signals) over call transcripts/CRM/support data and surfaces structured patterns with verbatim citations, ranked by revenue-weighted severity. Clones are visualized as nodes on a Final-Fantasy-13-style 3D sphere grid. The artifact you're looking at is a working demo: 3 pre-seeded clones from a synthetic logistics-SaaS dataset, 15 cached patterns drawn from 6 sales/customer transcripts. The full version is a SvelteKit app with live LLM analysis; the artifact is a single-HTML offline build.
>
> **What's working in the artifact:** sphere grid, click-through to clone detail, ranked patterns with citations, approve/reject + mock send-to-Salesforce/Linear, intake form that spawns new clones (without live analysis).
>
> **What's not:** real connectors (Gong/SFDC/Slack), live model analysis on newly-spawned clones, auth, multi-tenancy.
>
> **What I want from you:** act as a product strategist. Help me plan the next 30 days. I'll ask specific questions; you ground every answer in the artifact's data and cite the patterns by title.

## Planning follow-ups (after the kick-off)

- `Read the 15 patterns across all three clones. Rank the top 5 actions I should take in the next 30 days, ordered by ROI. For each: which patterns drive it, who owns it, what "done" looks like, and the risk if I skip it.`
- `Build me a 30/60/90 product roadmap from the patterns alone. Cluster related patterns into 3-5 themes; for each theme give a 1-sentence problem statement, the patterns that prove it, and a recommended scope of work. No fluff.`
- `Treat the patterns as the only field input I have. Refine my ICP: who should I actively pursue, who should I disqualify, and what's the qualifying question on call 1? Cite the patterns that justify each call.`
- `Build the competitive playbook against ShipSync from the artifact data. Three claims with evidence, three landmines to defuse on the first call, and the one-pager structure I should ship to AEs this week.`

## Action prompts to use inside the SecondAxis session

### Open / orient
1. `I uploaded a self-contained interactive dashboard called 2nd Axis. Open the artifact and tell me what you see.`
2. `In the artifact, summarize the three clones on the sphere grid — what role does each represent and what's their activity load?`

### Drill into a clone
3. `Click "FreightOps Unified" in the artifact. List the top 3 patterns by weight, with the recommended action for each.`
4. `Read me the cited quotes behind the EDIFACT pattern. Which prospect said what, and what does that imply about our ICP?`
5. `From the artifact, list every place ShipSync is mentioned across the citations. What's the competitive narrative?`

### Test the decision workflow
6. `In the artifact, approve the top 2 patterns on FreightOps GTM and send them to Salesforce. Confirm when done.`
7. `In the artifact, reject the "Carrier performance analytics" pattern on FreightOps CS and explain why I might do that.`

### Spawn a new clone (intake flow)
8. `Use the intake form in the artifact to spawn a clone for fintech compliance SaaS targeting mid-market banks. Notes: focus on expansion within existing accounts. Walk me through what would happen in production once that clone has real transcripts.`
9. `After spawning the fintech clone, click it. Explain why it shows no patterns and what the artifact says about live analysis.`

### Strategic synthesis
10. `Treat the patterns in this artifact as my actual field input. Based on what you see across all 3 clones, draft a 1-paragraph Q3 product roadmap recommendation. Be specific about which patterns drive which decisions.`
11. `Of the 15 patterns, identify the single highest-leverage action and explain why — cite specific patterns by title.`
12. `If I had to pick one ShipSync battlecard talking point to give every AE this week, what would it be? Use the artifact's data.`

### Cross-loop pattern hunting
13. `What patterns appear in BOTH the pre-sales and customer feedback loops? What does that overlap tell us about prioritization?`
14. `Summarize the customer accounts at renewal risk based on the artifact. For each, what would I need to commit to in the next 10 days?`

## Rebuild after changes

Edit anything under `src/artifact/` or update `data/clones.json`, then re-run:

```
npm run build:artifact
```

Re-upload `artifact-dist/index.html` to your session. localStorage state in the previous version is namespaced by the artifact origin, so users may need to clear it for a fresh demo.
