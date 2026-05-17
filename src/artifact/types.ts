// Standalone types for the artifact build (no Zod, no SvelteKit aliases).
// Mirrors src/lib/types.ts in shape.

export type Citation = {
  transcriptFile: string;
  quote: string;
  speaker?: string;
  timestamp?: string;
};

export type Implications = {
  icp?: string;
  messaging?: string;
  competitive?: string;
  dealFriction?: string;
  accountHealth?: string;
  featureRequest?: string;
  upsell?: string;
};

export type Pattern = {
  id: string;
  loop: 'presales' | 'customer';
  title: string;
  description: string;
  implications: Implications;
  recommendation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  weight: number;
  citations: Citation[];
  sourceAgent: string;
};

export type Profile = {
  vertical: string;
  icp: string;
  salesMotion: string;
  vocab: string[];
  weights: { revenue: number; frequency: number; recency: number };
  systemPromptOverrides?: string;
};

export type Clone = {
  id: string;
  name: string;
  createdAt: string;
  profile: Profile;
  transcriptFiles: string[];
  cachedPatterns?: Pattern[];
  lastAnalyzedAt?: string;
  role: 'presales-focused' | 'customer-focused' | 'balanced';
  activityCount: number;
};

export type Decision = {
  id: string;
  cloneId: string;
  patternId: string;
  verdict: 'approve' | 'reject' | 'defer';
  sentTo?: ('salesforce' | 'linear' | 'slack')[];
  timestamp: string;
};

export type Intake = {
  companyName: string;
  vertical: string;
  icp: string;
  salesMotion: string;
  notes?: string;
};
