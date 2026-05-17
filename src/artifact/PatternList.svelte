<script lang="ts">
  import PatternCard from './PatternCard.svelte';
  import type { Pattern } from './types';

  let { patterns, cloneId }: { patterns: Pattern[]; cloneId: string } = $props();

  const sorted = $derived([...patterns].sort((a, b) => b.weight - a.weight));
</script>

{#if sorted.length === 0}
  <div class="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-8 text-center">
    <p class="text-[11px] uppercase tracking-[0.3em] text-slate-500">no cached patterns</p>
    <p class="mt-3 text-sm text-slate-400">
      live analysis is disabled in artifact mode. connect to a deployed backend to run extraction.
    </p>
  </div>
{:else}
  <div class="space-y-4">
    {#each sorted as p (p.id)}
      <PatternCard pattern={p} {cloneId} />
    {/each}
  </div>
{/if}
