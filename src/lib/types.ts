import { z } from 'zod';

// A verbatim quote pulled from a source transcript — provenance for a pattern
export const CitationSchema = z.object({
  transcriptFile: z.string(),
  quote: z.string(),
  speaker: z.string().optional(),
  timestamp: z.string().optional()
});
export type Citation = z.infer<typeof CitationSchema>;

// Structured implications surface across the 14-agent role taxonomy
export const ImplicationsSchema = z.object({
  icp: z.string().optional(),
  messaging: z.string().optional(),
  competitive: z.string().optional(),
  dealFriction: z.string().optional(),
  accountHealth: z.string().optional(),
  featureRequest: z.string().optional(),
  upsell: z.string().optional()
});
export type Implications = z.infer<typeof ImplicationsSchema>;

// A pattern = a structured theme with implications, a recommendation, and weighted severity
export const PatternSchema = z.object({
  id: z.string(),
  loop: z.enum(['presales', 'customer']),
  title: z.string(),
  description: z.string(),
  implications: ImplicationsSchema,
  recommendation: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  weight: z.number(),
  citations: z.array(CitationSchema).min(1),
  sourceAgent: z.string()
});
export type Pattern = z.infer<typeof PatternSchema>;

// The OpenClaw output — a profile that parameterizes a clone
export const ProfileSchema = z.object({
  vertical: z.string(),
  icp: z.string(),
  salesMotion: z.string(),
  vocab: z.array(z.string()),
  weights: z.object({
    revenue: z.number(),
    frequency: z.number(),
    recency: z.number()
  }),
  systemPromptOverrides: z.string().optional()
});
export type Profile = z.infer<typeof ProfileSchema>;

// A clone = a deployed instance with a profile, transcripts, and cached patterns
export const CloneSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  profile: ProfileSchema,
  transcriptFiles: z.array(z.string()),
  cachedPatterns: z.array(PatternSchema).optional(),
  lastAnalyzedAt: z.string().optional(),
  role: z.enum(['presales-focused', 'customer-focused', 'balanced']).default('balanced'),
  activityCount: z.number().default(0)
});
export type Clone = z.infer<typeof CloneSchema>;

// A decision = approve/reject/defer on a pattern + optional downstream routing
export const DecisionSchema = z.object({
  id: z.string(),
  cloneId: z.string(),
  patternId: z.string(),
  verdict: z.enum(['approve', 'reject', 'defer']),
  sentTo: z.array(z.enum(['salesforce', 'linear', 'slack'])).optional(),
  timestamp: z.string()
});
export type Decision = z.infer<typeof DecisionSchema>;

// Intake form payload — what the user fills out to spawn a clone
export const IntakeSchema = z.object({
  companyName: z.string().min(1),
  vertical: z.string().min(1),
  icp: z.string().min(1),
  salesMotion: z.string().min(1),
  notes: z.string().optional()
});
export type Intake = z.infer<typeof IntakeSchema>;

// API response shapes
export type AnalyzeResponse = { cloneId: string; patterns: Pattern[]; cached: boolean };
export type SpawnResponse = { clone: Clone };
export type DecideResponse = { ok: boolean; decision: Decision };
export type IntakeResponse = { profile: Profile; suggestedName: string };
