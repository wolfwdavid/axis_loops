// Seeded clones, inlined at build time from data/clones.json via Vite's JSON import.

import type { Clone, Profile, Intake } from './types';
import seeded from '../../data/clones.json';

export const SEEDED_CLONES: Clone[] = seeded as unknown as Clone[];

// Deterministic profile generator for the artifact build (no Claude API call).
// Mirrors the fallback in src/lib/server/openclaw.ts.
export function generateProfileLocal(intake: Intake): { profile: Profile; suggestedName: string } {
  const motionWeights: Record<string, Profile['weights']> = {
    enterprise: { revenue: 0.55, frequency: 0.25, recency: 0.2 },
    'mid-market': { revenue: 0.5, frequency: 0.3, recency: 0.2 },
    plg: { revenue: 0.35, frequency: 0.4, recency: 0.25 },
    services: { revenue: 0.6, frequency: 0.2, recency: 0.2 }
  };

  const baseVocab = ['integration', 'security review', 'pricing', 'onboarding', 'support'];
  const verticalVocab = intake.vertical
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 2)
    .slice(0, 5);

  return {
    profile: {
      vertical: intake.vertical,
      icp: intake.icp,
      salesMotion: intake.salesMotion,
      vocab: Array.from(new Set([...verticalVocab, ...baseVocab])).slice(0, 10),
      weights: motionWeights[intake.salesMotion] ?? motionWeights['mid-market']
    },
    suggestedName: `${intake.companyName} GTM`
  };
}

export function spawnCloneLocal(intake: Intake, profile: Profile): Clone {
  const notes = (intake.notes ?? '').toLowerCase();
  const role: Clone['role'] = notes.includes('expansion')
    ? 'customer-focused'
    : notes.includes('new business') || notes.includes('outbound')
    ? 'presales-focused'
    : 'balanced';

  return {
    id: crypto.randomUUID(),
    name: intake.companyName,
    createdAt: new Date().toISOString(),
    profile,
    transcriptFiles: [],
    role,
    activityCount: 8,
    cachedPatterns: []
  };
}
