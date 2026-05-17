// agents.ts — the 3-call Claude chain: theme extraction → presales synth + customer synth.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  CitationSchema,
  PatternSchema,
  type Citation,
  type Clone,
  type Pattern
} from '$lib/types';
import { buildSystemPrompt } from './openclaw';
import { readTranscript } from './store';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

function buildClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. runAnalysis cannot call Anthropic without it.'
    );
  }
  return new Anthropic({ apiKey });
}

function stripJson(text: string): string {
  const tagMatch = text.match(/<json>([\s\S]*?)<\/json>/i);
  if (tagMatch) return tagMatch[1].trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return text.trim();
}

// --- Theme schema (intermediate, internal) ----------------------------------

const ThemeSchema = z.object({
  theme: z.string(),
  description: z.string(),
  loopHint: z.enum(['presales', 'customer']).optional(),
  citations: z.array(CitationSchema).min(1)
});
type Theme = z.infer<typeof ThemeSchema>;

const ThemeArraySchema = z.object({ themes: z.array(ThemeSchema) });

// --- Pattern (pre-weight) ---------------------------------------------------

const RawPatternSchema = PatternSchema.omit({ id: true, weight: true }).extend({
  id: z.string().optional(),
  weight: z.number().optional()
});
const RawPatternArraySchema = z.object({ patterns: z.array(RawPatternSchema) });

// --- Severity → numeric -----------------------------------------------------

const SEVERITY_NUM: Record<Pattern['severity'], number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  critical: 1.0
};

// --- Helpers ----------------------------------------------------------------

async function callClaude(
  client: Anthropic,
  system: string,
  user: string,
  maxTokens = 4096
): Promise<string> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }]
  });
  const textBlock = resp.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text in response');
  return textBlock.text;
}

async function callWithRetry<T>(
  fn: () => Promise<string>,
  parse: (raw: string) => T,
  label: string
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await fn();
      const json = stripJson(raw);
      return parse(JSON.parse(json));
    } catch (err) {
      lastErr = err;
      console.warn(`[agents] ${label} attempt ${attempt + 1} failed:`, err);
    }
  }
  throw new Error(`[agents] ${label} failed after 2 attempts: ${String(lastErr)}`);
}

function computeWeight(
  severity: Pattern['severity'],
  citations: Citation[],
  weights: { revenue: number; frequency: number; recency: number }
): number {
  const sev = SEVERITY_NUM[severity];
  // frequency proxy: distinct transcripts citing this pattern, normalized to 1.0 cap at 4.
  const distinctFiles = new Set(citations.map((c) => c.transcriptFile)).size;
  const freqProxy = Math.min(distinctFiles / 4, 1);
  // recency proxy: if any citation timestamp parses as a date, prefer it; otherwise default 0.6.
  const recencyProxy = 0.6;
  const composite =
    sev * (weights.revenue + weights.frequency * freqProxy + weights.recency * recencyProxy);
  return Math.round(composite * 1000) / 1000;
}

// --- Main entrypoint --------------------------------------------------------

export async function runAnalysis(clone: Clone): Promise<Pattern[]> {
  const client = buildClient();

  // Load all transcripts
  const transcripts: { filename: string; loop: 'presales' | 'customer'; body: string }[] =
    await Promise.all(
      clone.transcriptFiles.map(async (filename) => {
        const body = await readTranscript(filename);
        const loop: 'presales' | 'customer' = filename.startsWith('presales')
          ? 'presales'
          : 'customer';
        return { filename, loop, body };
      })
    );

  // ---- Call 1: theme extraction --------------------------------------------
  const themeSystem = buildSystemPrompt(clone.profile, 'theme-extraction');
  const themeUser = [
    'Extract themes from the following transcripts. Each theme must include at least one verbatim citation.',
    '',
    'Return JSON wrapped in <json>...</json> with this exact shape:',
    '{ "themes": [ { "theme": string, "description": string, "loopHint": "presales"|"customer", "citations": [ { "transcriptFile": string, "quote": string, "speaker": string?, "timestamp": string? } ] } ] }',
    '',
    'Transcripts:',
    ...transcripts.map(
      (t) =>
        `\n----- BEGIN ${t.filename} (loop=${t.loop}) -----\n${t.body}\n----- END ${t.filename} -----`
    )
  ].join('\n');

  const themesResult = await callWithRetry(
    () => callClaude(client, themeSystem, themeUser, 4096),
    (parsed) => ThemeArraySchema.parse(parsed),
    'theme-extraction'
  );
  const allThemes = themesResult.themes;

  // Helpers to split themes by loop based on the file each citation references.
  const presalesFiles = new Set(
    transcripts.filter((t) => t.loop === 'presales').map((t) => t.filename)
  );
  const customerFiles = new Set(
    transcripts.filter((t) => t.loop === 'customer').map((t) => t.filename)
  );

  function filterThemes(loop: 'presales' | 'customer'): Theme[] {
    const allowed = loop === 'presales' ? presalesFiles : customerFiles;
    return allThemes
      .map((t) => {
        const cites = t.citations.filter((c) => allowed.has(c.transcriptFile));
        if (cites.length === 0) return null;
        return { ...t, citations: cites };
      })
      .filter((t): t is Theme => t !== null);
  }

  const presalesThemes = filterThemes('presales');
  const customerThemes = filterThemes('customer');

  // ---- Call 2: pre-sales synthesis -----------------------------------------
  const presalesPatterns = presalesThemes.length
    ? await synthesizeLoop(client, clone, presalesThemes, 'presales')
    : [];

  // ---- Call 3: customer synthesis ------------------------------------------
  const customerPatterns = customerThemes.length
    ? await synthesizeLoop(client, clone, customerThemes, 'customer')
    : [];

  // ---- Merge, weight, rank --------------------------------------------------
  const all: Pattern[] = [...presalesPatterns, ...customerPatterns];
  all.sort((a, b) => b.weight - a.weight);

  // Top 3 from each loop = up to 6, biases the demo toward balanced output.
  const topPresales = all.filter((p) => p.loop === 'presales').slice(0, 3);
  const topCustomer = all.filter((p) => p.loop === 'customer').slice(0, 3);
  const merged = [...topPresales, ...topCustomer].sort((a, b) => b.weight - a.weight);
  return merged;
}

async function synthesizeLoop(
  client: Anthropic,
  clone: Clone,
  themes: Theme[],
  loop: 'presales' | 'customer'
): Promise<Pattern[]> {
  const system = buildSystemPrompt(
    clone.profile,
    loop === 'presales' ? 'presales-synth' : 'customer-synth'
  );
  const subRoleHints =
    loop === 'presales'
      ? '"ICP Refinement Agent" | "Messaging Effectiveness Agent" | "Competitive Intel Agent" | "Deal Friction Agent" | "Signal Summary Agent"'
      : '"Account Health Agent" | "Feature Request Agent" | "Upsell/Cross-Sell Agent" | "Feedback Structuring Agent"';

  const user = [
    `Synthesize up to 5 patterns for the ${loop} loop from the themes below.`,
    'Each pattern must have at least one verbatim citation copied from a theme.',
    'Set "loop" to ' + JSON.stringify(loop) + ' for every pattern.',
    'Set "sourceAgent" to one of: ' + subRoleHints + '.',
    '',
    'Return JSON wrapped in <json>...</json> with this exact shape:',
    '{ "patterns": [ { "title": string, "description": string, "loop": "presales"|"customer", "severity": "low"|"medium"|"high"|"critical", "implications": { "icp"?: string, "messaging"?: string, "competitive"?: string, "dealFriction"?: string, "accountHealth"?: string, "featureRequest"?: string, "upsell"?: string }, "recommendation": string, "citations": [ {"transcriptFile": string, "quote": string, "speaker"?: string, "timestamp"?: string } ], "sourceAgent": string } ] }',
    '',
    'Themes:',
    JSON.stringify(themes, null, 2)
  ].join('\n');

  const result = await callWithRetry(
    () => callClaude(client, system, user, 4096),
    (parsed) => RawPatternArraySchema.parse(parsed),
    `${loop}-synth`
  );

  return result.patterns.map((raw) => {
    const id = raw.id ?? randomUUID();
    const weight =
      raw.weight ?? computeWeight(raw.severity, raw.citations, clone.profile.weights);
    const pattern: Pattern = {
      id,
      loop,
      title: raw.title,
      description: raw.description,
      implications: raw.implications,
      recommendation: raw.recommendation,
      severity: raw.severity,
      weight,
      citations: raw.citations,
      sourceAgent: raw.sourceAgent
    };
    return PatternSchema.parse(pattern);
  });
}
