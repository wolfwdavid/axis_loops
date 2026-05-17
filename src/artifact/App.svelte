<script lang="ts">
  import GridView from './GridView.svelte';
  import DetailView from './DetailView.svelte';
  import IntakeView from './IntakeView.svelte';
  import { SEEDED_CLONES } from './data';
  import { readSpawnedClones, writeSpawnedClones } from './storage';
  import type { Clone } from './types';

  type View = 'grid' | 'detail' | 'intake';

  const spawned = readSpawnedClones();
  let clones = $state<Clone[]>([...SEEDED_CLONES, ...spawned]);
  let view = $state<View>('grid');
  let selectedId = $state<string | null>(null);

  const selected = $derived(clones.find((c) => c.id === selectedId) ?? null);

  function gotoDetail(id: string) {
    selectedId = id;
    view = 'detail';
  }

  function gotoIntake() {
    view = 'intake';
  }

  function gotoGrid() {
    selectedId = null;
    view = 'grid';
  }

  function handleSpawn(c: Clone) {
    clones = [...clones, c];
    const persisted = readSpawnedClones();
    writeSpawnedClones([...persisted, c]);
    gotoGrid();
  }
</script>

{#if view === 'grid'}
  <GridView {clones} onCloneClick={gotoDetail} onIntakeClick={gotoIntake} />
{:else if view === 'detail' && selected}
  <DetailView clone={selected} onBack={gotoGrid} />
{:else if view === 'intake'}
  <IntakeView onSpawn={handleSpawn} onBack={gotoGrid} />
{/if}
