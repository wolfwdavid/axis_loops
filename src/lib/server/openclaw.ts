// OpenClaw — expands a user intake into a Profile (vocab, weights, prompt overrides)
// and composes role-specific system prompts.
//
// Smoke test:
//   curl -s -X POST http://localhost:5173/api/intake -H 'content-type: application/json' \
//     -d '{"companyName":"FreightOps","vertical":"Freight & logistics SaaS","icp":"Mid-market 3PLs","salesMotion":"Sales-led enterprise","notes":"expansion + new business"}'

import Anthropic from '@anthropic-ai/sdk';
import { ProfileSchema, type Intake, type Profile } from '$lib/types';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

function buildClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env to call OpenClaw / agents.'
    );
  }
  return new Anthropic({ apiKey });
}

function stripJson(text: string): string {
  // Accept either <json>...</json>, ```json ... ```, or raw JSON.
  const tagMatch = text.match(/<json>([\s\S]*?)<\/json>/i);
  if (tagMatch) return tagMatch[1].trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return text.trim();
}

function fallbackProfile(intake: Intake): Profile {
  const vert = intake.vertical.toLowerCase();
  const isLogistics =
    vert.includes('logistic') ||
    vert.includes('freight') ||
    vert.includes('shipping') ||
    vert.includes('supply chain');

  const vocab = isLogistics
    ? [
        'EDI',
        'EDIFACT',
        'IFTMIN',
        'carrier integration',
        'webhook coverage',
        'shipment visibility',
        'TMS',
        'security review',
        'SOC 2',
        'onboarding velocity'
      ]
    : [
        intake.vertical,
        intake.salesMotion,
        'integration',
        'security review',
        'expansion',
        'churn risk',
        'onboarding',
        'competitive displacement'
      ];

  return {
    vertical: intake.vertical,
    icp: intake.icp,
    salesMotion: intake.salesMotion,
    vocab,
    weights: { revenue: 0.5, frequency: 0.3, recency: 0.2 },
    systemPromptOverrides: intake.notes ?? undefined
  };
}

const PROFILE_INSTRUCTIONS = `You are OpenClaw, the profile-templating module of a GTM intelligence platform.

Given a user intake (company, vertical, ICP, sales motion, notes), return a JSON profile that
parameterizes downstream pattern-extraction agents.

Output strict JSON wrapped in <json>...</json> with this exact shape:

{
  "vertical": string,
  "icp": string,
  "salesMotion": string,
  "vocab": string[],          // 5-10 vertical-specific terms agents should detect
  "weights": {
    "revenue": number,        // 0..1, sums to 1.0 with the others
    "frequency": number,
    "recency": number
  },
  "systemPromptOverrides": string  // 1-2 sentences of role-shaping guidance
}

Rules:
- vocab must be vertical-specific (e.g. EDI/EDIFACT for logistics, HIPAA/HL7 for healthcare).
- weights must sum to 1.0 (within 0.01).
- Bias weights toward "revenue" for enterprise motions, "frequency" for PLG/mid-market,
  "recency" when the notes mention churn or competitive pressure.
- Keep systemPromptOverrides terse; it will be appended to every downstream prompt.`;

export async function generateProfile(
  intake: Intake
): Promise<{ profile: Profile; suggestedName: string }> {
  const suggestedName = `${intake.companyName} Clone`;

  // If no API key, return a deterministic fallback so the demo still runs.
  if (!process.env.ANTHROPIC_API_KEY) {
    return { profile: fallbackProfile(intake), suggestedName };
  }

  const client = buildClient();
  const userPayload = JSON.stringify(
    {
      companyName: intake.companyName,
      vertical: intake.vertical,
      icp: intake.icp,
      salesMotion: intake.salesMotion,
      notes: intake.notes ?? ''
    },
    null,
    2
  );

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: PROFILE_INSTRUCTIONS,
        messages: [
          {
            role: 'user',
            content: `Intake:\n${userPayload}\n\nReturn only the <json>...</json> block.`
          }
        ]
      });
      const textBlock = resp.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') throw new Error('No text in response');
      const jsonText = stripJson(textBlock.text);
      const parsed = JSON.parse(jsonText);
      const profile = ProfileSchema.parse(parsed);
      return { profile, suggestedName };
    } catch (err) {
      if (attempt === 1) {
        // Final fallback — never block the user.
        console.warn('[openclaw] profile generation failed, using fallback:', err);
        return { profile: fallbackProfile(intake), suggestedName };
      }
    }
  }

  return { profile: fallbackProfile(intake), suggestedName };
}

const ROLE_BASES: Record<
  'theme-extraction' | 'presales-synth' | 'customer-synth',
  string
> = {
  'theme-extraction': `You are a theme-extraction agent. Read sales/customer transcripts and surface
distinct themes. For every theme, return a verbatim citation: the transcript filename, an
exact quote (no paraphrasing), the speaker name if present, and the timestamp if present.
Prefer themes that recur across multiple calls or that block deals / threaten renewal.`,
  'presales-synth': `You are the pre-sales synthesis agent. You ingest themes drawn ONLY from pre-sales calls
(discovery, technical evaluation, security review, late-stage). You cover five sub-roles:
ICP refinement, messaging effectiveness, competitive intel, deal friction, and signal
summary. For each pattern you emit, set sourceAgent to one of:
"ICP Refinement Agent", "Messaging Effectiveness Agent", "Competitive Intel Agent",
"Deal Friction Agent", "Signal Summary Agent". Cite verbatim quotes for every claim.`,
  'customer-synth': `You are the customer synthesis agent. You ingest themes drawn ONLY from existing-customer
calls (QBRs, feature requests, renewal-risk). You cover four sub-roles: account health,
feature request, upsell/cross-sell, and feedback structuring. For each pattern you emit,
set sourceAgent to one of: "Account Health Agent", "Feature Request Agent",
"Upsell/Cross-Sell Agent", "Feedback Structuring Agent". Cite verbatim quotes for every
claim, and prefer patterns that recur across multiple accounts.`
};

export function buildSystemPrompt(
  profile: Profile,
  role: 'theme-extraction' | 'presales-synth' | 'customer-synth'
): string {
  const base = ROLE_BASES[role];
  const vocabLine =
    profile.vocab.length > 0
      ? `Vocabulary to surface aggressively when present: ${profile.vocab.join(', ')}.`
      : '';
  const overrides = profile.systemPromptOverrides
    ? `Account-specific guidance: ${profile.systemPromptOverrides}`
    : '';
  return [
    base,
    `Vertical: ${profile.vertical}. ICP: ${profile.icp}. Sales motion: ${profile.salesMotion}.`,
    vocabLine,
    overrides,
    'Always return strict JSON wrapped in <json>...</json>. No prose outside the tags.'
  ]
    .filter(Boolean)
    .join('\n\n');
}
