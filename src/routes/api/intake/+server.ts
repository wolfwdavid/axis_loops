import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { IntakeSchema, type IntakeResponse } from '$lib/types';
import { generateProfile } from '$lib/server/openclaw';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Invalid intake', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const { profile, suggestedName } = await generateProfile(parsed.data);
    const response: IntakeResponse = { profile, suggestedName };
    return json(response);
  } catch (err) {
    console.error('[api/intake]', err);
    return json(
      { error: err instanceof Error ? err.message : 'Profile generation failed' },
      { status: 500 }
    );
  }
};
