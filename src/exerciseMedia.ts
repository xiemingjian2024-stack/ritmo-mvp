import { videoLibraryMedia } from "./personalTrainingLibrary";
import { exerciseCatalog } from "./exerciseCatalog";
import { priorityMediaById } from "./priorityMediaIndex";
import { localTestMediaById, localTestMediaEnabled } from "./localTestMedia";
import { personalSequenceMedia } from "./personalSequenceMedia";
import { personalPhaseMedia } from "./personalPhaseMedia";
import type { PhaseSegment } from "./phaseExerciseCatalog";

export type PersonalMediaStatus = "personal_test_ready" | "pending_confirmation" | "on_hold";
export type MediaAsset = { staticImage?: string; animation?: string; animationFormat?: "mp4" | "webm" | "gif" };
export type ExerciseMedia = MediaAsset & { mediaId: string; segments?: Partial<Record<PhaseSegment, MediaAsset>>; reviewOnly?: boolean; placeholder: boolean; source: string; sourceVersion?: string; sourcePath?: string; technicalReview?: string; rightsHolder: string; licenseEvidence?: string; localUse: "existing_asset" | "licensed_review_asset" | "local_private_test" | "self_produced_personal_test" | "none"; personalStatus?: PersonalMediaStatus; professionalApproval?: "not_verified" };
export const personalMediaById = new Map<string, (typeof personalSequenceMedia.items)[number]>(personalSequenceMedia.items.map((item) => [item.id, item]));
// Existing local Smith image is retained; its commercial rights are not asserted here.
export const exerciseMedia: Record<string, ExerciseMedia> = Object.fromEntries(exerciseCatalog.map(({ id, mediaId }) => [id,
  id === "smith"
    ? { mediaId, staticImage: "/assets/workout/smith-press.png", placeholder: false, source: "existing RITMO project asset", rightsHolder: "not documented", localUse: "existing_asset" }
    : { mediaId, placeholder: true, source: "none", rightsHolder: "none", localUse: "none" },
]));
export const mediaForExercise = (id: string): ExerciseMedia => {
  if (videoLibraryMedia[id]) return videoLibraryMedia[id];
  const phaseMedia = personalPhaseMedia[id];
  if (phaseMedia) return phaseMedia;
  // The 51 audited IDs are governed by the personal-test allowlist even when
  // the retired third-party localMedia QA switch is present in the URL.
  const personal = personalMediaById.get(id);
  if (!personal && import.meta.env?.DEV && localTestMediaEnabled()) {
    const localTest = localTestMediaById[id];
    if (localTest) return {
      mediaId: id, animation: `http://127.0.0.1:4184/${localTest.mp4}`, animationFormat: "mp4", reviewOnly: true, placeholder: false,
      source: `hasaneyldrm/exercises-dataset: ${localTest.originalGif} (local test conversion)`, rightsHolder: "Gym visual",
      licenseEvidence: "https://github.com/hasaneyldrm/exercises-dataset/blob/main/NOTICE.md", localUse: "local_private_test",
    };
  }
  if (personal?.status === "personal_test_ready" && "asset" in personal && personal.asset) return {
    mediaId: id, animation: personal.asset, animationFormat: "mp4", reviewOnly: true, placeholder: false,
    source: personal.source, sourceVersion: personal.sourceVersion, sourcePath: personal.sourcePath, technicalReview: personal.technicalReview,
    rightsHolder: "RITMO in-project production", localUse: "self_produced_personal_test",
    personalStatus: "personal_test_ready", professionalApproval: "not_verified",
  };
  const indexed = priorityMediaById.get(id);
  if (!personal && indexed?.useStatus === "licensed_review_only" && indexed.localAsset) return {
    mediaId: id, animation: indexed.localAsset, animationFormat: indexed.format ?? "mp4", reviewOnly: true, placeholder: false,
    source: "Workout Guide — Plank (single-pose derivative)", rightsHolder: indexed.rightsHolder ?? "unknown",
    licenseEvidence: "https://github.com/bryllim/workout-guide/blob/main/LICENSE-ASSETS", localUse: "licensed_review_asset",
  };
  return personal ? {
    ...(exerciseMedia[id] ?? { mediaId: id, placeholder: true, source: indexed?.sourceRef ?? "none", rightsHolder: indexed?.rightsHolder ?? "none", localUse: "none" }),
    personalStatus: personal.status as PersonalMediaStatus, professionalApproval: "not_verified",
  } : exerciseMedia[id] ?? { mediaId: id, placeholder: true, source: indexed?.sourceRef ?? "none", rightsHolder: indexed?.rightsHolder ?? "none", localUse: "none" };
};
