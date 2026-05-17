import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getClone } from '$lib/server/store';
import type { Pattern } from '$lib/types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const clone = await getClone(params.id);
  if (!clone) {
    throw error(404, 'clone not found');
  }

  let patterns: Pattern[] = clone.cachedPatterns ?? [];
  let cached = patterns.length > 0;

  if (!cached) {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cloneId: clone.id })
      });
      if (res.ok) {
        const data = (await res.json()) as { patterns: Pattern[]; cached: boolean };
        patterns = data.patterns ?? [];
        cached = data.cached;
      }
    } catch {
      // analyze unavailable — fall back to whatever we had
    }
  }

  return { clone, patterns, cached };
};
