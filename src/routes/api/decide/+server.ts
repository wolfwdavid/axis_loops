import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import type { DecideResponse, Decision } from '$lib/types';
import { appendDecision, getClone } from '$lib/server/store';

const DecideBodySchema = z.object({
  cloneId: z.string().min(1),
  patternId: z.string().min(1),
  verdict: z.enum(['approve', 'reject', 'defer']),
  sentTo: z.array(z.enum(['salesforce', 'linear', 'slack'])).optional()
});

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  const parsed = DecideBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Invalid decide body', issues: parsed.error.issues }, { status: 400 });
  }

  const { cloneId, patternId, verdict, sentTo } = parsed.data;
  const clone = await getClone(cloneId);
  if (!clone) {
    return json({ error: `Clone ${cloneId} not found` }, { status: 404 });
  }

  const decision: Decision = {
    id: randomUUID(),
    cloneId,
    patternId,
    verdict,
    sentTo,
    timestamp: new Date().toISOString()
  };

  await appendDecision(decision);

  const response: DecideResponse = { ok: true, decision };
  return json(response);
};
