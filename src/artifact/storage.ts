import type { Clone, Decision } from './types';

const DECISIONS_KEY = '2nd-axis:decisions';
const CLONES_KEY = '2nd-axis:clones';

export function readDecisions(): Decision[] {
  try {
    return JSON.parse(localStorage.getItem(DECISIONS_KEY) ?? '[]') as Decision[];
  } catch {
    return [];
  }
}

export function appendDecision(d: Decision): void {
  const existing = readDecisions();
  existing.push(d);
  localStorage.setItem(DECISIONS_KEY, JSON.stringify(existing));
}

export function readSpawnedClones(): Clone[] {
  try {
    return JSON.parse(localStorage.getItem(CLONES_KEY) ?? '[]') as Clone[];
  } catch {
    return [];
  }
}

export function writeSpawnedClones(clones: Clone[]): void {
  localStorage.setItem(CLONES_KEY, JSON.stringify(clones));
}
