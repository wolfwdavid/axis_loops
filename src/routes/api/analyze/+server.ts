import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import type { AnalyzeResponse } from '$lib/types';
import { getClone, readClones, writeClones } from '$lib/server/store';
import { runAnalysis } from '$lib/server/agents';

const AnalyzeBodySchema = z.object({
  cloneId: z.string().min(1),
  refresh: z.boolean().optional()
});

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  const parsed = AnalyzeBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Invalid analyze body', issues: parsed.error.issues }, { status: 400 });
  }

  const { cloneId, refresh } = parsed.data;
  const clone = await getClone(cloneId);
  if (!clone) {
    return json({ error: `Clone ${cloneId} not found` }, { status: 404 });
  }

  if (clone.cachedPatterns && clone.cachedPatterns.length > 0 && !refresh) {
    const response: AnalyzeResponse = {
      cloneId: clone.id,
      patterns: clone.cachedPatterns,
      cached: true
    };
    return json(response);
  }

  try {
    const patterns = await runAnalysis(clone);
    const clones = await readClones();
    const idx = clones.findIndex((c) => c.id === cloneId);
    if (idx >= 0) {
      clones[idx] = {
        ...clones[idx],
        cachedPatterns: patterns,
        lastAnalyzedAt: new Date().toISOString()
      };
      await writeClones(clones);
    }
    const response: AnalyzeResponse = { cloneId, patterns, cached: false };
    return json(response);
  } catch (err) {
    console.error('[api/analyze]', err);
    return json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    );
  }
};
