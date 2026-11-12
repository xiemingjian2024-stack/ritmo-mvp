import data from './data/personalTrainingLibrary.json';
import type { ExerciseSpec } from './exerciseCatalog';
import type { ExerciseMedia } from './exerciseMedia';
import type { PhaseItem } from './phaseExerciseCatalog';

export type LibraryExercise = ExerciseSpec & { sourceActionId?: string; homeTemplateEquipment?: boolean; mediaSegment?: 'whole' | 'left' | 'right' };
export type PhasePlan = { phaseItems?: { warmup: PhaseItem[]; cooldown: PhaseItem[] }; requirements?: string; templateSource?: string };
export const videoLibrarySpecs = data.specs as LibraryExercise[];
export const videoLibrarySpecById = new Map(videoLibrarySpecs.map(item => [item.id, item]));
export const homeVideoPlans = data.homePlans as unknown as (PhasePlan & {id:string;name:string;environment:string;exercises:LibraryExercise[]})[];
export const removedRecommendationIds = new Set(['smith', 'row']);
export const videoLibraryMedia: Record<string, ExerciseMedia> = Object.fromEntries(Object.entries(data.media).map(([id, asset]) => [id, {
  ...asset, mediaId:id, placeholder:false, reviewOnly:true, personalStatus:'personal_test_ready',
  source:'RITMO self-produced; designer visual accepted 2026-10-30', sourceVersion:data.version,
  rightsHolder:'RITMO in-project production', localUse:'self_produced_personal_test', professionalApproval:'not_verified',
} as ExerciseMedia]));
// Existing one-side strength plans retain their explicit historical demonstration.
// New six-video templates use independent :left/:right variants for both sides.
for (const id of ['one-arm-row', 'ritmo:video:rack-supported-kickback', 'ritmo:video:rear-foot-elevated-db-split-squat', 'ritmo:alternative:forearm-side-plank-hold']) {
  const item = videoLibraryMedia[id];
  if (item?.segments?.right) item.segments.whole = item.segments.right;
}
export function planPhaseItems(plan: PhasePlan | null | undefined, phase:'warmup'|'cooldown', fallback:()=>PhaseItem[]) {
  return plan?.phaseItems?.[phase] ?? fallback();
}
