import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import {
  ProfileSchema,
  type Clone,
  type SpawnResponse
} from '$lib/types';
import { readClones, writeClones } from '$lib/server/store';
import { runAnalysis } from '$lib/server/agents';

const SpawnBodySchema = z.object({
  profile: ProfileSchema,
  companyName: z.string().min(1),
  notes: z.string().optional()
});

const ALL_TRANSCRIPTS = [
  'presales_01.txt',
  'presales_02.txt',
  'presales_03.txt',
  'customer_01.txt',
  'customer_02.txt',
  'customer_03.txt'
];

function inferRole(notes: string | undefined): Clone['role'] {
  const n = (notes ?? '').toLowerCase();
  const hasExpansion = n.includes('expansion') || n.includes('renewal') || n.includes('upsell');
  const hasNewBiz = n.includes('new business') || n.includes('pipeline') || n.includes('discovery');
  if (hasExpansion && !hasNewBiz) return 'customer-focused';
  if (hasNewBiz && !hasExpansion) return 'presales-focused';
  return 'balanced';
}

function pickTranscripts(role: Clone['role']): string[] {
  // Demo bias: always include all 6 so the agents have full ground truth.
  if (role === 'presales-focused')
    return ['presales_01.txt', 'presales_02.txt', 'presales_03.txt'];
  if (role === 'customer-focused')
    return ['customer_01.txt', 'customer_02.txt', 'customer_03.txt'];
  return ALL_TRANSCRIPTS.slice();
}

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  const parsed = SpawnBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Invalid spawn body', issues: parsed.error.issues }, { status: 400 });
  }

  const { profile, companyName, notes } = parsed.data;
  const role = inferRole(notes);
  const transcriptFiles = pickTranscripts(role);

  const clone: Clone = {
    id: randomUUID(),
    name: companyName,
    createdAt: new Date().toISOString(),
    profile,
    transcriptFiles,
    role,
    activityCount: transcriptFiles.length * 3
  };

  // Optional analysis if API key is set — don't block spawn on failure.
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const patterns = await runAnalysis(clone);
      clone.cachedPatterns = patterns;
      clone.lastAnalyzedAt = new Date().toISOString();
    } catch (err) {
      console.warn('[api/spawn] runAnalysis failed; spawning without cached patterns:', err);
    }
  }

  const clones = await readClones();
  clones.push(clone);
  await writeClones(clones);

  const response: SpawnResponse = { clone };
  return json(response);
};
