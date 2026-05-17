<script lang="ts">
  import type { Intake, Clone } from './types';
  import { generateProfileLocal, spawnCloneLocal } from './data';

  let { onSpawn }: { onSpawn: (c: Clone) => void } = $props();

  let companyName = $state('');
  let vertical = $state('');
  let icp = $state('');
  let salesMotion = $state<'enterprise' | 'mid-market' | 'plg' | 'services'>('enterprise');
  let notes = $state('');

  let stage = $state<'idle' | 'profiling' | 'spawning' | 'done'>('idle');
  let suggestedName = $state<string | null>(null);

  const canSubmit = $derived(
    companyName.trim() && vertical.trim() && icp.trim() && salesMotion && stage === 'idle'
  );

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: Intake = {
      companyName: companyName.trim(),
      vertical: vertical.trim(),
      icp: icp.trim(),
      salesMotion,
      notes: notes.trim() || undefined
    };

    stage = 'profiling';
    await new Promise((r) => setTimeout(r, 700));
    const { profile, suggestedName: sn } = generateProfileLocal(payload);
    suggestedName = sn;

    stage = 'spawning';
    await new Promise((r) => setTimeout(r, 1100));
    const clone = spawnCloneLocal(payload, profile);

    stage = 'done';
    await new Promise((r) => setTimeout(r, 400));
    onSpawn(clone);
  }
</script>

<form onsubmit={onSubmit} class="space-y-5">
  <div>
    <label for="companyName" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500">
      company name
    </label>
    <input
      id="companyName"
      type="text"
      bind:value={companyName}
      placeholder="acme corp"
      class="mt-2 w-full rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-[var(--color-axis-glow)]/60 focus:shadow-[0_0_18px_rgba(125,211,252,0.2)]"
    />
  </div>

  <div>
    <label for="vertical" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500">
      vertical
    </label>
    <input
      id="vertical"
      type="text"
      bind:value={vertical}
      placeholder="fintech, healthtech, devtools..."
      class="mt-2 w-full rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-[var(--color-axis-glow)]/60 focus:shadow-[0_0_18px_rgba(125,211,252,0.2)]"
    />
  </div>

  <div>
    <label for="icp" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500">
      ideal customer profile
    </label>
    <textarea
      id="icp"
      rows="3"
      bind:value={icp}
      placeholder="who buys · pain · trigger · authority..."
      class="mt-2 w-full resize-none rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-[var(--color-axis-glow)]/60 focus:shadow-[0_0_18px_rgba(125,211,252,0.2)]"
    ></textarea>
  </div>

  <div>
    <label for="motion" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500">
      sales motion
    </label>
    <select
      id="motion"
      bind:value={salesMotion}
      class="mt-2 w-full appearance-none rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[var(--color-axis-glow)]/60"
    >
      <option value="enterprise">enterprise</option>
      <option value="mid-market">mid-market</option>
      <option value="plg">plg</option>
      <option value="services">services</option>
    </select>
  </div>

  <div>
    <label for="notes" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500">
      notes <span class="text-slate-700">· optional</span>
    </label>
    <textarea
      id="notes"
      rows="2"
      bind:value={notes}
      placeholder="anything else the clone should know..."
      class="mt-2 w-full resize-none rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-[var(--color-axis-glow)]/60 focus:shadow-[0_0_18px_rgba(125,211,252,0.2)]"
    ></textarea>
  </div>

  <button
    type="submit"
    disabled={!canSubmit}
    class="group relative w-full overflow-hidden rounded-full border border-[var(--color-axis-glow)]/60 px-6 py-3 text-[11px] uppercase tracking-[0.4em] text-[var(--color-axis-glow)] transition-all hover:bg-[var(--color-axis-glow)]/15 hover:shadow-[0_0_30px_rgba(125,211,252,0.4)] disabled:opacity-40"
  >
    <span class="relative z-10">
      {#if stage === 'idle'}
        initiate spawn protocol
      {:else if stage === 'profiling'}
        analyzing intake...
      {:else if stage === 'spawning'}
        spawning clone {suggestedName ? `· ${suggestedName}` : ''}
      {:else if stage === 'done'}
        ✓ clone instantiated
      {/if}
    </span>
  </button>

  {#if stage === 'spawning' || stage === 'profiling'}
    <div class="flex items-center justify-center gap-1">
      <span class="h-1 w-1 animate-pulse rounded-full bg-[var(--color-axis-glow)]"></span>
      <span class="h-1 w-1 animate-pulse rounded-full bg-[var(--color-axis-glow)] [animation-delay:200ms]"></span>
      <span class="h-1 w-1 animate-pulse rounded-full bg-[var(--color-axis-glow)] [animation-delay:400ms]"></span>
    </div>
  {/if}
</form>
