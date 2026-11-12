import { coreCrosswalk, extendedById } from "./extendedExerciseCatalog";
import { priorityExercises } from "./priorityExerciseCatalog";

export type MediaMatchStatus = "accurate_match" | "pending_review" | "mismatch" | "missing";
export type MediaUseStatus = "licensed_review_only" | "awaiting_license" | "blocked_mismatch" | "missing";
export type PriorityMediaEntry = {
  ritmoId: string;
  externalId: string | null;
  sourceRef: string | null;
  rightsHolder: string | null;
  matchStatus: MediaMatchStatus;
  useStatus: MediaUseStatus;
  localAsset: string | null;
  format: "mp4" | null;
  variantNote: string;
};

// Source references are metadata only. A Gym visual reference must never become
// a playback URL until its independent media rights and exact variant are cleared.
export const priorityMediaIndex: PriorityMediaEntry[] = priorityExercises.map((exercise) => {
  const crosswalk = coreCrosswalk[exercise.id];
  const externalId = exercise.id.startsWith("hasan:") ? exercise.id : crosswalk ? `hasan:${crosswalk.sourceId}` : null;
  const external = externalId ? extendedById.get(externalId) : undefined;
  const sourceRef = external?.media.sourceRef ?? null;
  if (exercise.id === "plank") return {
    ritmoId: exercise.id, externalId, sourceRef: "workout-guide:plank:frame-1", rightsHolder: "Everkinetic / Bryl Lim",
    matchStatus: "pending_review", useStatus: "licensed_review_only", localAsset: "/media/exercises/plank__forearm-hold__review-only.mp4",
    format: "mp4", variantNote: "前臂静态姿势；仅单帧保持循环，专业动作审校未完成",
  };
  if (crosswalk?.relation === "rejected") return {
    ritmoId: exercise.id, externalId, sourceRef, rightsHolder: sourceRef ? "Gym visual" : null,
    matchStatus: "mismatch", useStatus: "blocked_mismatch", localAsset: null, format: null, variantNote: crosswalk.reason,
  };
  return {
    ritmoId: exercise.id, externalId, sourceRef, rightsHolder: sourceRef ? "Gym visual" : null,
    matchStatus: sourceRef ? "pending_review" : "missing", useStatus: sourceRef ? "awaiting_license" : "missing",
    localAsset: null, format: null, variantNote: crosswalk?.reason ?? exercise.variantZh,
  };
});

export const priorityMediaById = new Map(priorityMediaIndex.map((entry) => [entry.ritmoId, entry]));
