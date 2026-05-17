/**
 * 2nd Axis MCP Bridge Server
 *
 * Exposes 7 tools via the Model Context Protocol (stdio transport):
 *   list_clones, get_clone, list_patterns, analyze_clone,
 *   spawn_clone, decide, read_transcript
 *
 * Auth modes:
 *   - Unauthenticated (dev): MCP_API_KEY is unset. A console warning is printed at startup.
 *     Every tool call is processed without credential checks.
 *   - Authenticated (prod): set MCP_API_KEY=<secret>. Every tool call input MUST include
 *     an "apiKey" field equal to that secret, or the call is rejected with an auth error.
 *
 * Run:
 *   npm run mcp
 *   or: node --experimental-strip-types src/mcp/server.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

// Use relative imports — $lib alias is not available outside SvelteKit bundler context
import {
  CloneSchema,
  IntakeSchema,
  DecisionSchema,
  type Clone,
  type Decision
} from '../lib/types.js';
import {
  readClones,
  writeClones,
  getClone,
  appendDecision,
  readTranscript
} from '../lib/server/store.js';
import { generateProfile } from '../lib/server/openclaw.js';
import { runAnalysis } from '../lib/server/agents.js';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const API_KEY = process.env.MCP_API_KEY ?? null;

if (!API_KEY) {
  console.warn(
    '[mcp] WARNING: MCP_API_KEY is not set — running in unauthenticated dev mode. ' +
      'Set MCP_API_KEY=<secret> in production.'
  );
}

function checkAuth(input: Record<string, unknown>): void {
  if (!API_KEY) return;
  if (input['apiKey'] !== API_KEY) {
    throw new McpError(ErrorCode.InvalidRequest, 'Invalid or missing apiKey');
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Wrap a JSON-serializable result as an MCP text content array. */
function ok(result: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
  };
}

/** Convert a Zod error into a human-readable string. */
function zodMsg(err: z.ZodError): string {
  return err.errors
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join('; ');
}

// Optional apiKey field that is silently accepted but not required at the schema level
// (actual enforcement happens in checkAuth at runtime).
const ApiKeyField = { apiKey: z.string().optional() };

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'list_clones',
    description:
      'Return all clones stored in the system. Each clone has a profile, cached patterns, and transcript references.',
    inputSchema: {
      type: 'object' as const,
      properties: { apiKey: { type: 'string', description: 'Required when MCP_API_KEY is set.' } },
      required: []
    }
  },
  {
    name: 'get_clone',
    description: 'Fetch a single clone by its UUID. Returns null if not found.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Clone UUID.' },
        apiKey: { type: 'string' }
      },
      required: ['id']
    }
  },
  {
    name: 'list_patterns',
    description:
      'Return cached patterns for a clone. Optionally filter by loop: "presales" or "customer".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        cloneId: { type: 'string', description: 'Clone UUID.' },
        loop: {
          type: 'string',
          enum: ['presales', 'customer'],
          description: 'Optional loop filter.'
        },
        apiKey: { type: 'string' }
      },
      required: ['cloneId']
    }
  },
  {
    name: 'analyze_clone',
    description:
      'Return patterns for a clone. Uses cached patterns unless refresh=true or none exist. ' +
      'Calling with refresh=true triggers the full 3-call LLM analysis chain and requires ANTHROPIC_API_KEY.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        cloneId: { type: 'string', description: 'Clone UUID.' },
        refresh: {
          type: 'boolean',
          description: 'Force re-analysis even if cached patterns exist.'
        },
        apiKey: { type: 'string' }
      },
      required: ['cloneId']
    }
  },
  {
    name: 'spawn_clone',
    description:
      'Create a new clone from an intake form. Calls OpenClaw to generate a profile, ' +
      'persists the clone, and returns it with a suggested display name. ' +
      'Requires ANTHROPIC_API_KEY for full profile generation; falls back to deterministic profile if unset.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        companyName: { type: 'string', description: 'Name of the company.' },
        vertical: { type: 'string', description: 'Industry vertical (e.g. "Freight & logistics SaaS").' },
        icp: { type: 'string', description: 'Ideal customer profile description.' },
        salesMotion: { type: 'string', description: 'Sales motion (e.g. "Sales-led enterprise", "PLG").' },
        notes: { type: 'string', description: 'Optional additional context or guidance.' },
        apiKey: { type: 'string' }
      },
      required: ['companyName', 'vertical', 'icp', 'salesMotion']
    }
  },
  {
    name: 'decide',
    description:
      'Record a verdict (approve / reject / defer) on a pattern and optionally route it to ' +
      'downstream integrations (salesforce, linear, slack). Appended to decisions.jsonl.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        cloneId: { type: 'string', description: 'Clone UUID.' },
        patternId: { type: 'string', description: 'Pattern UUID.' },
        verdict: {
          type: 'string',
          enum: ['approve', 'reject', 'defer'],
          description: 'Decision verdict.'
        },
        sentTo: {
          type: 'array',
          items: { type: 'string', enum: ['salesforce', 'linear', 'slack'] },
          description: 'Optional list of downstream systems to route this decision to.'
        },
        apiKey: { type: 'string' }
      },
      required: ['cloneId', 'patternId', 'verdict']
    }
  },
  {
    name: 'read_transcript',
    description:
      'Read the raw text of a transcript file from data/transcripts/. ' +
      'Pass only the bare filename (e.g. "presales-acme.txt") — path traversal is blocked.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filename: { type: 'string', description: 'Bare filename inside data/transcripts/.' },
        apiKey: { type: 'string' }
      },
      required: ['filename']
    }
  }
] as const;

// ---------------------------------------------------------------------------
// Zod input validators (used at call-time)
// ---------------------------------------------------------------------------

const ListClonesInput = z.object({ ...ApiKeyField });

const GetCloneInput = z.object({
  id: z.string().min(1, 'id is required'),
  ...ApiKeyField
});

const ListPatternsInput = z.object({
  cloneId: z.string().min(1, 'cloneId is required'),
  loop: z.enum(['presales', 'customer']).optional(),
  ...ApiKeyField
});

const AnalyzeCloneInput = z.object({
  cloneId: z.string().min(1, 'cloneId is required'),
  refresh: z.boolean().optional(),
  ...ApiKeyField
});

const SpawnCloneInput = IntakeSchema.extend({ ...ApiKeyField });

const DecideInput = z.object({
  cloneId: z.string().min(1, 'cloneId is required'),
  patternId: z.string().min(1, 'patternId is required'),
  verdict: z.enum(['approve', 'reject', 'defer']),
  sentTo: z.array(z.enum(['salesforce', 'linear', 'slack'])).optional(),
  ...ApiKeyField
});

const ReadTranscriptInput = z.object({
  filename: z.string().min(1, 'filename is required'),
  ...ApiKeyField
});

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: '2nd-axis-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

// ---------------------------------------------------------------------------
// tools/list handler
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

// ---------------------------------------------------------------------------
// tools/call handler
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs ?? {}) as Record<string, unknown>;

  try {
    checkAuth(args);
  } catch (e) {
    if (e instanceof McpError) throw e;
    throw new McpError(ErrorCode.InvalidRequest, 'Auth check failed');
  }

  switch (name) {
    // -----------------------------------------------------------------------
    case 'list_clones': {
      ListClonesInput.parse(args);
      try {
        const clones = await readClones();
        return ok({ clones });
      } catch (e) {
        throw new McpError(ErrorCode.InternalError, `store error: ${String(e)}`);
      }
    }

    // -----------------------------------------------------------------------
    case 'get_clone': {
      const parsed = (() => {
        const r = GetCloneInput.safeParse(args);
        if (!r.success) throw new McpError(ErrorCode.InvalidParams, zodMsg(r.error));
        return r.data;
      })();
      try {
        const clone = await getClone(parsed.id);
        return ok({ clone });
      } catch (e) {
        throw new McpError(ErrorCode.InternalError, `store error: ${String(e)}`);
      }
    }

    // -----------------------------------------------------------------------
    case 'list_patterns': {
      const parsed = (() => {
        const r = ListPatternsInput.safeParse(args);
        if (!r.success) throw new McpError(ErrorCode.InvalidParams, zodMsg(r.error));
        return r.data;
      })();
      try {
        const clone = await getClone(parsed.cloneId);
        if (!clone) {
          throw new McpError(ErrorCode.InvalidParams, `clone not found: ${parsed.cloneId}`);
        }
        const patterns = (clone.cachedPatterns ?? []).filter(
          (p) => !parsed.loop || p.loop === parsed.loop
        );
        return ok({ patterns });
      } catch (e) {
        if (e instanceof McpError) throw e;
        throw new McpError(ErrorCode.InternalError, `store error: ${String(e)}`);
      }
    }

    // -----------------------------------------------------------------------
    case 'analyze_clone': {
      const parsed = (() => {
        const r = AnalyzeCloneInput.safeParse(args);
        if (!r.success) throw new McpError(ErrorCode.InvalidParams, zodMsg(r.error));
        return r.data;
      })();
      try {
        const clone = await getClone(parsed.cloneId);
        if (!clone) {
          throw new McpError(ErrorCode.InvalidParams, `clone not found: ${parsed.cloneId}`);
        }
        const hasCached = (clone.cachedPatterns ?? []).length > 0;
        if (hasCached && !parsed.refresh) {
          return ok({ patterns: clone.cachedPatterns, cached: true });
        }
        // Run fresh analysis
        const patterns = await runAnalysis(clone);
        // Persist updated cache
        const all = await readClones();
        const idx = all.findIndex((c) => c.id === parsed.cloneId);
        if (idx !== -1) {
          all[idx] = {
            ...all[idx],
            cachedPatterns: patterns,
            lastAnalyzedAt: new Date().toISOString()
          };
          await writeClones(all);
        }
        return ok({ patterns, cached: false });
      } catch (e) {
        if (e instanceof McpError) throw e;
        throw new McpError(ErrorCode.InternalError, `analysis error: ${String(e)}`);
      }
    }

    // -----------------------------------------------------------------------
    case 'spawn_clone': {
      const parsed = (() => {
        const r = SpawnCloneInput.safeParse(args);
        if (!r.success) throw new McpError(ErrorCode.InvalidParams, zodMsg(r.error));
        return r.data;
      })();
      try {
        const intake = {
          companyName: parsed.companyName,
          vertical: parsed.vertical,
          icp: parsed.icp,
          salesMotion: parsed.salesMotion,
          notes: parsed.notes
        };
        const { profile, suggestedName } = await generateProfile(intake);
        const clone: Clone = CloneSchema.parse({
          id: randomUUID(),
          name: suggestedName,
          createdAt: new Date().toISOString(),
          profile,
          transcriptFiles: [],
          cachedPatterns: [],
          role: 'balanced',
          activityCount: 0
        });
        const all = await readClones();
        all.push(clone);
        await writeClones(all);
        return ok({ clone, suggestedName });
      } catch (e) {
        if (e instanceof McpError) throw e;
        throw new McpError(ErrorCode.InternalError, `spawn error: ${String(e)}`);
      }
    }

    // -----------------------------------------------------------------------
    case 'decide': {
      const parsed = (() => {
        const r = DecideInput.safeParse(args);
        if (!r.success) throw new McpError(ErrorCode.InvalidParams, zodMsg(r.error));
        return r.data;
      })();
      try {
        const decision: Decision = DecisionSchema.parse({
          id: randomUUID(),
          cloneId: parsed.cloneId,
          patternId: parsed.patternId,
          verdict: parsed.verdict,
          sentTo: parsed.sentTo,
          timestamp: new Date().toISOString()
        });
        await appendDecision(decision);
        return ok({ decision });
      } catch (e) {
        if (e instanceof McpError) throw e;
        throw new McpError(ErrorCode.InternalError, `store error: ${String(e)}`);
      }
    }

    // -----------------------------------------------------------------------
    case 'read_transcript': {
      const parsed = (() => {
        const r = ReadTranscriptInput.safeParse(args);
        if (!r.success) throw new McpError(ErrorCode.InvalidParams, zodMsg(r.error));
        return r.data;
      })();
      try {
        const content = await readTranscript(parsed.filename);
        return ok({ content });
      } catch (e) {
        if (e instanceof McpError) throw e;
        throw new McpError(ErrorCode.InternalError, `store error: ${String(e)}`);
      }
    }

    // -----------------------------------------------------------------------
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers communicate over stdio; logging goes to stderr only.
  process.stderr.write('[mcp] 2nd-axis-mcp server ready\n');
}

main().catch((err) => {
  process.stderr.write(`[mcp] fatal: ${err}\n`);
  process.exit(1);
});
