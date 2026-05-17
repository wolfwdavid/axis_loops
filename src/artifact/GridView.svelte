<script lang="ts">
  import { Canvas } from '@threlte/core';
  import SphereGrid from './SphereGrid.svelte';
  import type { Clone } from './types';

  let {
    clones,
    onCloneClick,
    onIntakeClick
  }: {
    clones: Clone[];
    onCloneClick: (id: string) => void;
    onIntakeClick: () => void;
  } = $props();

  const totalSignals = $derived(clones.reduce((s, c) => s + c.activityCount, 0));
</script>

<div class="relative h-screen w-screen overflow-hidden">
  <div class="absolute inset-0">
    <Canvas>
      <SphereGrid {clones} {onCloneClick} />
    </Canvas>
  </div>

  <div
    class="pointer-events-none absolute inset-0"
    style="background: radial-gradient(ellipse at center, transparent 40%, rgba(5,8,22,0.85) 100%);"
  ></div>

  <div class="pointer-events-none absolute left-8 top-8 z-10">
    <h1 class="text-2xl font-light uppercase tracking-[0.45em] text-slate-100">
      2nd <span class="text-[var(--color-axis-glow)]">axis</span>
    </h1>
    <p class="mt-1 text-[11px] lowercase tracking-[0.3em] text-slate-500">
      dual-loop gtm intelligence
    </p>
  </div>

  <div class="absolute right-8 top-8 z-10">
    <button
      onclick={onIntakeClick}
      class="group relative overflow-hidden rounded-full border border-[var(--color-axis-glow)]/60 px-5 py-2 text-[11px] lowercase tracking-[0.3em] text-[var(--color-axis-glow)] transition-all hover:bg-[var(--color-axis-glow)]/15 hover:shadow-[0_0_24px_rgba(125,211,252,0.4)]"
    >
      <span class="relative z-10">+ spawn new clone</span>
    </button>
  </div>

  <div class="pointer-events-none absolute left-1/2 top-8 z-10 -translate-x-1/2 text-center">
    <p class="text-[10px] uppercase tracking-[0.5em] text-slate-600">clone.matrix</p>
    <p class="mt-1 text-[10px] lowercase tracking-[0.3em] text-slate-500">
      {clones.length} active · {totalSignals} signals
    </p>
  </div>

  <div class="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
    <div
      class="flex items-center gap-6 rounded-full border border-slate-800/60 bg-slate-900/40 px-6 py-3 backdrop-blur-md"
    >
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 rounded-full bg-[var(--color-axis-glow)] shadow-[0_0_8px_var(--color-axis-glow)]"></span>
        <span class="text-[10px] lowercase tracking-[0.25em] text-slate-400">presales</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 rounded-full bg-[var(--color-axis-accent)] shadow-[0_0_8px_var(--color-axis-accent)]"></span>
        <span class="text-[10px] lowercase tracking-[0.25em] text-slate-400">customer</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 rounded-full bg-slate-200 shadow-[0_0_8px_#e2e8f0]"></span>
        <span class="text-[10px] lowercase tracking-[0.25em] text-slate-400">balanced</span>
      </div>
    </div>
  </div>

  {#if clones.length === 0}
    <div class="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <div class="pointer-events-auto rounded-2xl border border-slate-800/60 bg-slate-900/60 px-8 py-6 backdrop-blur-md">
        <p class="text-center text-[11px] lowercase tracking-[0.3em] text-slate-400">
          no clones detected · initialize the matrix
        </p>
        <button
          onclick={onIntakeClick}
          class="mt-4 w-full rounded-full border border-[var(--color-axis-glow)]/60 px-5 py-2 text-[11px] lowercase tracking-[0.3em] text-[var(--color-axis-glow)] transition-all hover:bg-[var(--color-axis-glow)]/15"
        >
          + spawn first clone
        </button>
      </div>
    </div>
  {/if}
</div>
