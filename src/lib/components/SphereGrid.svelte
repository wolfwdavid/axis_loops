<script lang="ts">
  import { T } from '@threlte/core';
  import { OrbitControls, Stars } from '@threlte/extras';
  import * as THREE from 'three';
  import CloneNode from './CloneNode.svelte';
  import type { Clone } from '$lib/types';

  let { clones }: { clones: Clone[] } = $props();

  type EmptyNode = {
    id: string;
    name: string;
    role: 'empty';
    activityCount: 0;
    empty: true;
  };

  type Node = (Clone | EmptyNode) & { position: [number, number, number] };

  const MIN_NODES = 10;

  // Fibonacci spiral around a vertical axis with rising z (FF13 sphere-grid feel)
  function spiralPositions(n: number): [number, number, number][] {
    const phi = Math.PI * (3 - Math.sqrt(5));
    const out: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(n - 1, 1);
      const radius = 2.4 + t * 3.2;
      const angle = i * phi;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (t - 0.5) * 2.4;
      out.push([x, y, z]);
    }
    return out;
  }

  const nodes = $derived.by<Node[]>(() => {
    const total = Math.max(clones.length, MIN_NODES);
    const positions = spiralPositions(total);
    const list: Node[] = [];
    for (let i = 0; i < total; i++) {
      if (i < clones.length) {
        list.push({ ...clones[i], position: positions[i] });
      } else {
        list.push({
          id: `empty-${i}`,
          name: '',
          role: 'empty',
          activityCount: 0,
          empty: true,
          position: positions[i]
        });
      }
    }
    return list;
  });

  // Connect each node to its nearest 2 neighbors (creates a web)
  const edges = $derived.by<Array<{ a: [number, number, number]; b: [number, number, number]; lit: boolean }>>(() => {
    const out: Array<{ a: [number, number, number]; b: [number, number, number]; lit: boolean }> = [];
    const seen = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
      const distances = nodes
        .map((m, j) => ({ j, d: dist(nodes[i].position, m.position) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { j } of distances) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const aReal = !('empty' in nodes[i]) || !(nodes[i] as EmptyNode).empty;
        const bReal = !('empty' in nodes[j]) || !(nodes[j] as EmptyNode).empty;
        out.push({ a: nodes[i].position, b: nodes[j].position, lit: aReal && bReal });
      }
    }
    return out;
  });

  function dist(a: [number, number, number], b: [number, number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function edgeGeometry(a: [number, number, number], b: [number, number, number]): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const verts = new Float32Array([a[0], a[1], a[2], b[0], b[1], b[2]]);
    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    return geom;
  }
</script>

<T.PerspectiveCamera makeDefault position={[8, 4, 10]} fov={55}>
  <OrbitControls
    autoRotate
    autoRotateSpeed={0.3}
    enablePan={false}
    enableZoom={true}
    minDistance={6}
    maxDistance={18}
    target={[0, 0, 0]}
  />
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.35} color="#8ab4f8" />
<T.DirectionalLight position={[8, 10, 6]} intensity={0.6} color="#ffffff" />
<T.PointLight position={[0, 0, 0]} intensity={0.6} color="#7dd3fc" distance={20} />

<Stars
  radius={120}
  depth={60}
  count={3500}
  factor={4}
  saturation={0.2}
  fade
  speed={0.4}
/>

{#each edges as edge (edge.a.join(',') + '-' + edge.b.join(','))}
  <T.Line>
    <T is={edgeGeometry(edge.a, edge.b)} attach="geometry" />
    <T.LineBasicMaterial
      color={edge.lit ? '#7dd3fc' : '#1e293b'}
      transparent
      opacity={edge.lit ? 0.55 : 0.18}
    />
  </T.Line>
{/each}

{#each nodes as node (node.id)}
  <CloneNode clone={node} position={node.position} />
{/each}
