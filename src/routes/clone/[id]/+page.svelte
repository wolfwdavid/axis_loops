<script lang="ts">
  import { goto } from '$app/navigation';
  import PatternCard from '$lib/components/PatternCard.svelte';
  import type { Clone, Pattern } from '$lib/types';

  let {
    data
  }: {
    data: { clone: Clone; patterns: Pattern[]; cached: boolean };
  } = $props();

  const clone = $derived(data.clone);
  const patterns = $derived(data.patterns);

  const roleColor = $derived.by(() => {
    if (clone.role === 'presales-focused') return 'var(--color-axis-glow)';
    if (clone.role === 'customer-focused') return 'var(--color-axis-accent)';
    return '#e2e8f0';
  });

  const presalesCount = $derived(patterns.filter((p) => p.loop === 'presales').length);
  const customerCount = $derived(patterns.filter((p) => p.loop === 'customer').length);

  let bulkLoading = $state<null | 'approve' | 'reject'>(null);
  let bulkMessage = $state<string | null>(null);

  async function bulk(verdict: 'approve' | 'reject') {
    bulkLoading = verdict;
    bulkMessage = null;
    let ok = 0;
    let fail = 0;
    for (const p of patterns) {
      const sentTo =
        verdict === 'approve'
          ? p.loop === 'presales'
            ? ['salesforce']
            : ['linear']
          : undefined;
      try {
        const res = await fetch('/api/decide', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cloneId: clone.id, patternId: p.id, verdict, sentTo })
        });
        if (res.ok) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    bulkMessage = `${verdict} · ${ok} ok · ${fail} failed`;
    bulkLoading = null;
  }
</script>

<div class="min-h-screen px-6 py-8 sm:px-10">
  <!-- header bar -->
  <div class="mx-auto flex max-w-7xl items-center justify-between">
    <button
      onclick={() => goto('/')}
      class="group flex items-center gap-2 rounded-full border border-slate-800/60 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
    >
      <span class="transition group-hover:-translate-x-0.5">←</span>
      back to grid
    </button>
    <div class="text-right">
      <p class="text-[10px] uppercase tracking-[0.4em] text-slate-600">clone.matrix</p>
      <p class="mt-1 text-[10px] lowercase tracking-[0.3em] text-slate-500">
        id · {clone.id}
      </p>
    </div>
  </div>

  <!-- two-column layout -->
  <div class="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[360px_1fr]">
    <!-- LEFT: clone metadata -->
    <aside class="space-y-6">
      <div
        class="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-md"
      >
        <div
          class="absolute inset-x-0 top-0 h-[2px]"
          style="background: linear-gradient(90deg, transparent, {roleColor}, transparent);"
        ></div>

        <p class="text-[9px] uppercase tracking-[0.4em] text-slate-500">clone</p>
        <h1
          class="mt-2 text-2xl font-light tracking-wide text-slate-100"
          style="text-shadow: 0 0 24px {roleColor};"
        >
          {clone.name}
        </h1>

        <div class="mt-4 flex items-center gap-2">
          <span class="h-2 w-2 rounded-full" style="background: {roleColor}; box-shadow: 0 0 8px {roleColor};"></span>
          <span class="text-[10px] uppercase tracking-[0.3em] text-slate-400">{clone.role}</span>
        </div>

        <dl class="mt-6 grid grid-cols-2 gap-3">
          <div class="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <dt class="text-[9px] uppercase tracking-[0.3em] text-slate-500">vertical</dt>
            <dd class="mt-1 text-xs text-slate-200">{clone.profile.vertical}</dd>
          </div>
          <div class="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <dt class="text-[9px] uppercase tracking-[0.3em] text-slate-500">motion</dt>
            <dd class="mt-1 text-xs text-slate-200">{clone.profile.salesMotion}</dd>
          </div>
          <div class="col-span-2 rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <dt class="text-[9px] uppercase tracking-[0.3em] text-slate-500">icp</dt>
            <dd class="mt-1 text-xs leading-relaxed text-slate-300">{clone.profile.icp}</dd>
          </div>
        </dl>

        <!-- vocab pills -->
        {#if clone.profile.vocab.length > 0}
          <div class="mt-4">
            <p class="text-[9px] uppercase tracking-[0.3em] text-slate-500">vocab</p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each clone.profile.vocab as term (term)}
                <span
                  class="rounded-full border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-[10px] text-slate-300"
                >
                  {term}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- activity stats -->
        <div class="mt-6 grid grid-cols-3 gap-2 text-center">
          <div class="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <p class="text-lg font-light text-slate-100">{clone.activityCount}</p>
            <p class="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-slate-500">signals</p>
          </div>
          <div class="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <p class="text-lg font-light text-[var(--color-axis-glow)]">{presalesCount}</p>
            <p class="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-slate-500">presales</p>
          </div>
          <div class="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <p class="text-lg font-light text-[var(--color-axis-accent)]">{customerCount}</p>
            <p class="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-slate-500">customer</p>
          </div>
        </div>
      </div>

      <!-- bulk controls -->
      <div class="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-md">
        <p class="text-[9px] uppercase tracking-[0.4em] text-slate-500">bulk action</p>
        <div class="mt-3 grid gap-2">
          <button
            disabled={bulkLoading !== null || patterns.length === 0}
            onclick={() => bulk('approve')}
            class="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {bulkLoading === 'approve' ? 'approving...' : 'approve all'}
          </button>
          <button
            disabled={bulkLoading !== null || patterns.length === 0}
            onclick={() => bulk('reject')}
            class="rounded-full border border-slate-700/60 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-400 transition hover:border-slate-500 hover:text-slate-200 disabled:opacity-50"
          >
            {bulkLoading === 'reject' ? 'rejecting...' : 'reject all'}
          </button>
        </div>
        {#if bulkMessage}
          <p class="mt-3 text-[10px] uppercase tracking-[0.3em] text-slate-400">{bulkMessage}</p>
        {/if}
        <p class="mt-3 text-[10px] lowercase tracking-[0.2em] text-slate-600">
          {data.cached ? 'patterns from cache' : 'fresh analysis'}
        </p>
      </div>
    </aside>

    <!-- RIGHT: patterns scrollable list -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-[10px] uppercase tracking-[0.4em] text-slate-500">
          pattern.feed · {patterns.length}
        </h2>
      </div>

      {#if patterns.length === 0}
        <div class="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-10 text-center backdrop-blur-md">
          <p class="text-[11px] lowercase tracking-[0.3em] text-slate-400">
            no patterns yet · analysis pending
          </p>
        </div>
      {:else}
        {#each patterns as p (p.id)}
          <PatternCard pattern={p} cloneId={clone.id} />
        {/each}
      {/if}
    </section>
  </div>
</div>
