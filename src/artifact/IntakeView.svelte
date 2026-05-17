<script lang="ts">
  import IntakeForm from './IntakeForm.svelte';
  import type { Clone } from './types';

  let { onSpawn, onBack }: { onSpawn: (c: Clone) => void; onBack: () => void } = $props();
</script>

<div class="min-h-screen px-8 py-12">
  <button
    onclick={onBack}
    class="mb-8 inline-flex items-center gap-2 text-[11px] lowercase tracking-[0.3em] text-slate-500 transition hover:text-slate-200"
  >
    ← back to grid
  </button>

  <div class="mx-auto max-w-lg">
    <div class="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/40 p-8 backdrop-blur-md">
      <div
        class="absolute inset-x-0 top-0 h-px"
        style="background: linear-gradient(90deg, transparent, var(--color-axis-glow), transparent);"
      ></div>

      <h1 class="text-xl font-light uppercase tracking-[0.4em] text-slate-100">
        intake<span class="text-[var(--color-axis-glow)]">.</span>protocol
      </h1>
      <p class="mt-2 text-[11px] lowercase tracking-[0.3em] text-slate-500">
        describe the business · the prime agent will spawn a clone tuned to it
      </p>

      <div class="mt-8">
        <IntakeForm {onSpawn} />
      </div>
    </div>
  </div>
</div>
