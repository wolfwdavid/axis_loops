<script lang="ts">
  import { goto } from '$app/navigation';
  import IntakeForm from '$lib/components/IntakeForm.svelte';
</script>

<div class="relative min-h-screen overflow-hidden px-4 py-12">
  <!-- ambient drifting starfield via CSS -->
  <div class="pointer-events-none absolute inset-0 opacity-50"
       style="background:
         radial-gradient(2px 2px at 20% 30%, #7dd3fc55, transparent 50%),
         radial-gradient(1px 1px at 70% 60%, #c084fc55, transparent 50%),
         radial-gradient(1.5px 1.5px at 40% 80%, #ffffff44, transparent 50%),
         radial-gradient(1px 1px at 85% 20%, #7dd3fc44, transparent 50%),
         radial-gradient(2px 2px at 10% 70%, #ffffff33, transparent 50%);">
  </div>

  <!-- header -->
  <div class="mx-auto flex max-w-3xl items-center justify-between">
    <button
      onclick={() => goto('/')}
      class="group flex items-center gap-2 rounded-full border border-slate-800/60 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
    >
      <span class="transition group-hover:-translate-x-0.5">←</span>
      back to grid
    </button>
    <p class="text-[10px] uppercase tracking-[0.4em] text-slate-600">intake.protocol</p>
  </div>

  <!-- centered card -->
  <div class="mx-auto mt-10 max-w-xl">
    <div class="text-center">
      <p class="text-[10px] uppercase tracking-[0.5em] text-slate-600">2nd axis</p>
      <h1
        class="mt-3 text-3xl font-light tracking-[0.2em] text-slate-100"
        style="text-shadow: 0 0 32px rgba(125,211,252,0.45);"
      >
        spawn new clone
      </h1>
      <p class="mt-3 text-[11px] lowercase tracking-[0.25em] text-slate-500">
        define the substrate · let openclaw derive the profile
      </p>
    </div>

    <div
      class="relative mt-8 overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/50 p-8 backdrop-blur-xl"
    >
      <!-- top accent -->
      <div
        class="absolute inset-x-0 top-0 h-[2px]"
        style="background: linear-gradient(90deg, transparent, var(--color-axis-glow), var(--color-axis-accent), transparent);"
      ></div>

      <IntakeForm />
    </div>

    <p class="mt-6 text-center text-[9px] uppercase tracking-[0.4em] text-slate-700">
      openclaw v0.1 · profile inference engine
    </p>
  </div>
</div>
