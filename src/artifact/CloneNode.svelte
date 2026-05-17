<script lang="ts">
  import { T } from '@threlte/core';
  import { HTML, interactivity } from '@threlte/extras';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import type { Clone } from './types';

  type EmptyNode = {
    id: string;
    name: string;
    role: 'empty';
    activityCount: 0;
    empty: true;
  };

  let {
    clone,
    position,
    onClick
  }: {
    clone: Clone | EmptyNode;
    position: [number, number, number];
    onClick?: (id: string) => void;
  } = $props();

  interactivity();

  const isEmpty = $derived('empty' in clone && clone.empty === true);

  const roleColor = $derived.by(() => {
    if (isEmpty) return '#334155';
    const c = clone as Clone;
    if (c.role === 'presales-focused') return '#7dd3fc';
    if (c.role === 'customer-focused') return '#c084fc';
    return '#e2e8f0';
  });

  const baseSize = $derived.by(() => {
    if (isEmpty) return 0.45;
    const c = clone as Clone;
    return 0.45 + Math.min(c.activityCount, 50) / 50;
  });

  let hovered = $state(false);
  const scale = new Tween(1, { duration: 220, easing: cubicOut });
  const emissive = new Tween(1.0, { duration: 220, easing: cubicOut });

  $effect(() => {
    scale.target = hovered && !isEmpty ? 1.15 : 1;
    emissive.target = hovered && !isEmpty ? 1.9 : 1.0;
  });

  function handleClick() {
    if (isEmpty) return;
    const c = clone as Clone;
    onClick?.(c.id);
  }
</script>

<T.Group {position}>
  <T.Mesh
    scale={scale.current}
    onpointerenter={() => (hovered = true)}
    onpointerleave={() => (hovered = false)}
    onclick={handleClick}
  >
    <T.SphereGeometry args={[baseSize, 32, 32]} />
    <T.MeshStandardMaterial
      color={roleColor}
      emissive={roleColor}
      emissiveIntensity={emissive.current}
      roughness={0.2}
      metalness={0.1}
      transparent
      opacity={isEmpty ? 0.25 : 0.85}
    />
  </T.Mesh>

  {#if !isEmpty}
    <T.Mesh scale={scale.current * 1.35}>
      <T.SphereGeometry args={[baseSize, 24, 24]} />
      <T.MeshBasicMaterial color={roleColor} transparent opacity={0.08} depthWrite={false} />
    </T.Mesh>
  {/if}

  {#if !isEmpty}
    <HTML position={[0, baseSize * 1.7, 0]} center transform={false}>
      <div
        class="pointer-events-none select-none whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-slate-200"
        style="text-shadow: 0 0 8px {roleColor}99;"
      >
        {clone.name}
      </div>
    </HTML>
  {/if}
</T.Group>
