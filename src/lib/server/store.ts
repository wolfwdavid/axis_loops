// File-based persistence for 2nd Axis. Uses Node fs/promises against
// data/clones.json, data/decisions.jsonl, and data/transcripts/<file>.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Clone, Decision } from '$lib/types';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const TRANSCRIPTS_DIR = path.join(DATA_DIR, 'transcripts');
const CLONES_PATH = path.join(DATA_DIR, 'clones.json');
const DECISIONS_PATH = path.join(DATA_DIR, 'decisions.jsonl');

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });
}

async function ensureFile(filePath: string, fallback: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await ensureDataDir();
    await fs.writeFile(filePath, fallback, 'utf8');
  }
}

export async function readClones(): Promise<Clone[]> {
  await ensureFile(CLONES_PATH, '[]');
  const raw = await fs.readFile(CLONES_PATH, 'utf8');
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? (parsed as Clone[]) : [];
  } catch {
    return [];
  }
}

export async function writeClones(clones: Clone[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CLONES_PATH, JSON.stringify(clones, null, 2), 'utf8');
}

export async function getClone(id: string): Promise<Clone | null> {
  const clones = await readClones();
  return clones.find((c) => c.id === id) ?? null;
}

export async function appendDecision(d: Decision): Promise<void> {
  await ensureDataDir();
  await ensureFile(DECISIONS_PATH, '');
  await fs.appendFile(DECISIONS_PATH, JSON.stringify(d) + '\n', 'utf8');
}

export async function readTranscript(filename: string): Promise<string> {
  // Guard against traversal — only accept bare filenames
  const safe = path.basename(filename);
  const full = path.join(TRANSCRIPTS_DIR, safe);
  return fs.readFile(full, 'utf8');
}
