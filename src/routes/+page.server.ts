import type { PageServerLoad } from './$types';
import { readClones } from '$lib/server/store';

export const load: PageServerLoad = async () => {
  const clones = await readClones();
  return { clones };
};
