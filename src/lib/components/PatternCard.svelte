<script lang="ts">
  import type { Pattern } from '$lib/types';

  let { pattern, cloneId }: { pattern: Pattern; cloneId: string } = $props();

  let expanded = $state(false);
  let loading = $state<null | 'approve-sf' | 'approve-linear' | 'reject'>(null);
  let sentLabel = $state<string | null>(null);
  let error = $state<string | null>(null);

  const isPresales = $derived(pattern.loop === 'presales');
  const loopColor = $derived(isPresales ? '#7dd3fc' : '#c084fc');

  const severityStyles: Record<Pattern['severity'], string> = {
    low: 'bg-slate-700/40 text-slate-300 border-slate-600/50',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    high: 'bg-orange-500/20 text-orange-300 border-orange-400/40',
    critical: 'bg-red-500/25 text-red-300 border-red-400/50'
  };

  const implEntries = $derived(
    Object.entries(pattern.implications).filter(([, v]) => v && String(v).trim().length > 0)
  );

  const implLabels: Record<string, string> = {
    icp: 'icp',
    messaging: 'messaging',
    competitive: 'competitive',
    dealFriction: 'deal friction',
    accountHealth: 'account health',
    featureRequest: 'feature request',
    upsell: 'upsell'
  };

  async function decide(verdict: 'approve' | 'reject', sentTo: ('salesforce' | 'linear' | 'slack')[] = []) {
    const key = verdict === 'reject' ? 'reject' : sentTo.includes('salesforce') ? 'approve-sf' : 'approve-linear';
    loading = key;
    error = null;
    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cloneId,
          patternId: pattern.id,
          verdict,
          sentTo: sentTo.length ? sentTo : undefined
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      sentLabel =
        verdict === 'reject'
          ? 'rejected'
          : sentTo.includes('salesforce')
          ? 'sent to salesforce'
          : sentTo.includes('linear')
          ? 'sent to linear'
          : 'approved';
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed';
    } finally {
      loading = null;
    }
  }
</script>

<article
  class="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-md transition-all hover:border-slate-700/80"
  style="box-shadow: inset 0 0 0 1px {loopColor}11;"
>
  <!-- top-left vertical accent -->
  <div
    class="absolute left-0 top-6 h-12 w-[3px] rounded-r-full"
    style="background: {loopColor}; box-shadow: 0 0 12px {loopColor};"
  ></div>

  <!-- header -->
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1">
      <h3
        class="text-lg font-light leading-tight tracking-wide text-slate-100"
        style="text-shadow: 0 0 18px {loopColor}55;"
      >
        {pattern.title}
      </h3>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <span
          class="rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.3em]"
          style="border-color: {loopColor}55; color: {loopColor};"
        >
          {pattern.loop}
        </span>
        <span class="rounded-full border border-slate-700/60 px-2 py-0.5 text-[9px] uppercase tracking-[0.3em] text-slate-400">
          {pattern.sourceAgent}
        </span>
        <span
          class="rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.3em] {severityStyles[pattern.severity]}"
        >
          {pattern.severity}
        </span>
        <span class="text-[9px] uppercase tracking-[0.3em] text-slate-600">
          weight · {pattern.weight.toFixed(2)}
        </span>
      </div>
    </div>
  </div>

  <!-- description -->
  <p class="mt-4 text-sm leading-relaxed text-slate-400">{pattern.description}</p>

  <!-- recommendation -->
  <div
    class="mt-5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4"
    style="border-color: {loopColor}33;"
  >
    <p class="text-[9px] uppercase tracking-[0.4em] text-slate-500">recommendation</p>
    <p class="mt-2 text-sm leading-relaxed text-slate-100">{pattern.recommendation}</p>
  </div>

  <!-- implications -->
  {#if implEntries.length > 0}
    <div class="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {#each implEntries as [k, v] (k)}
        <div class="rounded-lg border border-slate-800/60 bg-slate-950/30 p-3">
          <p class="text-[9px] uppercase tracking-[0.3em] text-slate-500">
            {implLabels[k] ?? k}
          </p>
          <p class="mt-1 text-xs leading-relaxed text-slate-300">{v}</p>
        </div>
      {/each}
    </div>
  {/if}

  <!-- citations disclosure -->
  <button
    type="button"
    onclick={() => (expanded = !expanded)}
    class="mt-5 flex w-full items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/30 px-4 py-2 text-left transition hover:border-slate-700"
  >
    <span class="text-[10px] uppercase tracking-[0.3em] text-slate-400">
      citations · {pattern.citations.length}
    </span>
    <span class="text-slate-500" aria-hidden="true">{expanded ? '−' : '+'}</span>
  </button>

  {#if expanded}
    <ul class="mt-3 space-y-3">
      {#each pattern.citations as cite, i (i)}
        <li class="rounded-lg border border-slate-800/60 bg-slate-950/50 p-3">
          <p class="text-[9px] uppercase tracking-[0.3em] text-slate-500">
            {cite.transcriptFile}{cite.speaker ? ` · ${cite.speaker}` : ''}{cite.timestamp
              ? ` · ${cite.timestamp}`
              : ''}
          </p>
          <p class="mt-1 text-xs italic leading-relaxed text-slate-200">"{cite.quote}"</p>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- actions -->
  <div class="mt-6 flex flex-wrap items-center gap-2">
    {#if isPresales}
      <button
        disabled={loading !== null || sentLabel !== null}
        onclick={() => decide('approve', ['salesforce'])}
        class="flex-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
      >
        {loading === 'approve-sf' ? 'sending...' : 'approve & send to salesforce'}
      </button>
    {:else}
      <button
        disabled={loading !== null || sentLabel !== null}
        onclick={() => decide('approve', ['linear'])}
        class="flex-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
      >
        {loading === 'approve-linear' ? 'sending...' : 'send to linear'}
      </button>
    {/if}
    <button
      disabled={loading !== null || sentLabel !== null}
      onclick={() => decide('reject')}
      class="rounded-full border border-slate-700/60 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-400 transition hover:border-slate-500 hover:text-slate-200 disabled:opacity-50"
    >
      {loading === 'reject' ? '...' : 'reject'}
    </button>
  </div>

  {#if sentLabel}
    <p class="mt-3 text-[10px] uppercase tracking-[0.3em] text-emerald-400">
      ✓ {sentLabel}
    </p>
  {/if}
  {#if error}
    <p class="mt-3 text-[10px] uppercase tracking-[0.3em] text-red-400">⚠ {error}</p>
  {/if}
</article>
