<script lang="ts">
  import PatternList from './PatternList.svelte';
  import type { Clone } from './types';

  let { clone, onBack }: { clone: Clone; onBack: () => void } = $props();

  const roleColor = $derived(
    clone.role === 'presales-focused'
      ? '#7dd3fc'
      : clone.role === 'customer-focused'
      ? '#c084fc'
      : '#e2e8f0'
  );

  const patterns = $derived(clone.cachedPatterns ?? []);
  const presalesCount = $derived(patterns.filter((p) => p.loop === 'presales').length);
  const customerCount = $derived(patterns.filter((p) => p.loop === 'customer').length);
</script>

<div class="min-h-screen px-8 pb-16 pt-8">
  <button
    onclick={onBack}
    class="mb-8 inline-flex items-center gap-2 text-[11px] lowercase tracking-[0.3em] text-slate-500 transition hover:text-slate-200"
  >
    ← back to grid
  </button>

  <div class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[280px_1fr]">
    <aside class="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-md lg:sticky lg:top-8 lg:self-start">
      <h2
        class="text-2xl font-light uppercase tracking-[0.3em] text-slate-100"
        style="text-shadow: 0 0 20px {roleColor}66;"
      >
        {clone.name}
      </h2>
      <span
        class="mt-2 inline-block rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.3em]"
        style="border-color: {roleColor}55; color: {roleColor};"
      >
        {clone.role}
      </span>

      <dl class="mt-6 space-y-3 text-xs">
        <div>
          <dt class="text-[9px] uppercase tracking-[0.3em] text-slate-500">vertical</dt>
          <dd class="mt-1 text-slate-300">{clone.profile.vertical}</dd>
        </div>
        <div>
          <dt class="text-[9px] uppercase tracking-[0.3em] text-slate-500">motion</dt>
          <dd class="mt-1 text-slate-300">{clone.profile.salesMotion}</dd>
        </div>
        <div>
          <dt class="text-[9px] uppercase tracking-[0.3em] text-slate-500">icp</dt>
          <dd class="mt-1 leading-relaxed text-slate-300">{clone.profile.icp}</dd>
        </div>
      </dl>

      {#if clone.profile.vocab.length > 0}
        <div class="mt-6">
          <p class="text-[9px] uppercase tracking-[0.3em] text-slate-500">vocab</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            {#each clone.profile.vocab as v (v)}
              <span class="rounded-full border border-slate-700/60 bg-slate-950/40 px-2 py-0.5 text-[10px] text-slate-400">
                {v}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      <div class="mt-6 grid grid-cols-3 gap-2 rounded-xl border border-slate-800/60 bg-slate-950/30 p-3">
        <div class="text-center">
          <p class="text-lg font-light text-slate-100">{patterns.length}</p>
          <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500">signals</p>
        </div>
        <div class="text-center">
          <p class="text-lg font-light text-[var(--color-axis-glow)]">{presalesCount}</p>
          <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500">presales</p>
        </div>
        <div class="text-center">
          <p class="text-lg font-light text-[var(--color-axis-accent)]">{customerCount}</p>
          <p class="text-[9px] uppercase tracking-[0.2em] text-slate-500">customer</p>
        </div>
      </div>
    </aside>

    <section>
      <PatternList {patterns} cloneId={clone.id} />
    </section>
  </div>
</div>
