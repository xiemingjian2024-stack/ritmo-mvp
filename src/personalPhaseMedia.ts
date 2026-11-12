import type { ExerciseMedia } from "./exerciseMedia";

// Original audited phase media plus independently reviewed later additions.
// Back/leg assets and the revised knee-hug substitution have designer visual
// acceptance; their professional movement review remains separate.
// None has professional movement approval.
const common = {
  placeholder: false,
  reviewOnly: true,
  rightsHolder: "RITMO in-project production",
  localUse: "self_produced_personal_test",
  personalStatus: "personal_test_ready",
  professionalApproval: "not_verified",
  technicalReview: "通过初步技术核验；非专业教练审校",
  sourceVersion: "5325160 phase-media technical audit",
} as const;

export const personalPhaseMedia: Record<string, ExerciseMedia> = {
  "ritmo:warmup:cat-cow": {
    ...common, mediaId: "ritmo:warmup:cat-cow",
    animation: "/media/personal-v16/cat-cow.mp4", animationFormat: "mp4",
    source: "RITMO self-produced V1.6 fixed-scene Cat-Cow Sequence",
    sourcePath: "reports/ritmo-v16-back-leg-final/media/cat-cow/sequence.mp4",
    sourceVersion: "V1.6 back/leg final batch; designer visual accepted 2026-10-24",
    technicalReview: "Initial ACE Cat-Cow pose and support-point check; no obvious structural mismatch; not professional approval",
  },
  "ritmo:warmup:bodyweight-squat": {
    ...common, mediaId: "ritmo:warmup:bodyweight-squat",
    animation: "/media/personal-v16/bodyweight-squat-v16.mp4", animationFormat: "mp4",
    source: "RITMO self-produced V1.6 fixed-scene two-pose bodyweight squat; old failed media retained separately",
    sourcePath: "reports/ritmo-v16-back-leg-final/media/bodyweight-squat/sequence.mp4",
    sourceVersion: "V1.6 back/leg final batch; designer visual accepted 2026-10-24",
    technicalReview: "Initial stance, foot-contact, knee/hip direction check against ACE bodyweight squat; not professional approval",
  },
  "ritmo:stretch:child-pose": {
    ...common, mediaId: "ritmo:stretch:child-pose",
    staticImage: "/media/personal-v16/child-pose-v2.webp",
    source: "RITMO self-produced V1.6 no-equipment Child's Pose static image",
    sourcePath: "reports/ritmo-v16-back-leg-final/media/child-pose/whole.png",
    sourceVersion: "V1.6 back/leg final batch; designer visual accepted 2026-10-24",
    technicalReview: "Initial ACE Child's Pose back/hip target and contact-point check; not professional approval",
  },
  "ritmo:stretch:double-knee-hug": {
    ...common, mediaId: "ritmo:stretch:double-knee-hug",
    staticImage: "/media/personal-v16/double-knee-hug-v2.webp",
    source: "RITMO self-produced V1.6 static supine double-knee-hug stretch",
    sourcePath: "reports/ritmo-v16-knee-hug-substitution/revision-2026-10-24/selected-full-v2.png",
    sourceVersion: "V1.6 knee-hug anatomy redraw v2; designer visual accepted 2026-10-24",
    technicalReview: "Designer rejected v1 leg anatomy and visually accepted elevated-angle v2. Initial pose check only; professional movement review pending",
  },
  "ritmo:stretch:standing-quad": {
    ...common, mediaId: "ritmo:stretch:standing-quad",
    segments: {
      left: { staticImage: "/media/personal-v16/standing-quad-left.webp" },
      right: { staticImage: "/media/personal-v16/standing-quad-right.webp" },
    },
    source: "RITMO self-produced V1.6 existing static standing quadriceps stretch poses",
    sourcePath: "reports/ritmo-v16-back-leg-final/media/standing-quad/left-source.png;reports/ritmo-v16-back-leg-final/media/standing-quad/right-source.png",
    sourceVersion: "Existing batch1 media reused; designer visual accepted 2026-10-24",
    technicalReview: "Initial side-label, foot hold, and balance check; not professional approval",
  },
  "ritmo:warmup:standing-chest-open-close": {
    ...common, mediaId: "ritmo:warmup:standing-chest-open-close",
    animation: "/media/personal-v16/standing-chest-open-close.mp4", animationFormat: "mp4",
    source: "RITMO self-produced V1.6 independent bodyweight chest warmup Sequence",
    sourcePath: "reports/ritmo-v16-chest-candidates/warmup/sequence.mp4",
    sourceVersion: "a4e667d; designer visual acceptance 2026-10-24",
    technicalReview: "Initial visual movement check found no obvious shoulder-path error; not a professional movement approval",
  },
  "ritmo:stretch:standing-chest-stretch": {
    ...common, mediaId: "ritmo:stretch:standing-chest-stretch",
    staticImage: "/media/personal-v16/standing-chest-stretch.webp",
    source: "RITMO self-produced V1.6 independent no-equipment standing chest stretch",
    sourcePath: "reports/ritmo-v16-chest-candidates/stretch/standing-chest-stretch-720.webp",
    sourceVersion: "a4e667d; designer visual acceptance 2026-10-24",
    technicalReview: "Initial pose comparison with ACE Standing Chest Stretch found no obvious mismatch; not a professional movement approval",
  },
  "ritmo:warmup:light-lateral-raise": {
    ...common, mediaId: "ritmo:warmup:light-lateral-raise",
    animation: "/media/personal-v15/raise.mp4", animationFormat: "mp4",
    source: "RITMO self-produced V1.5 Sequence; matched pose reused for V1.6 warmup",
    sourcePath: "public/media/personal-v15/raise.mp4",
  },
  "ritmo:warmup:lean-lateral-raise": {
    ...common, mediaId: "ritmo:warmup:lean-lateral-raise",
    animation: "/media/personal-v16/lean-lateral-raise.mp4", animationFormat: "mp4",
    source: "RITMO self-produced V1.6 Sequence",
    sourcePath: "reports/ritmo-v16-phase-media-batch3/lean/sequence.mp4",
  },
  "ritmo:warmup:light-alternating-curl": {
    ...common, mediaId: "ritmo:warmup:light-alternating-curl",
    animation: "/media/personal-v16/light-alternating-curl.mp4", animationFormat: "mp4",
    source: "RITMO self-produced V1.6 Sequence",
    sourcePath: "reports/ritmo-v16-phase-media-batch3/curl/sequence.mp4",
  },
  "ritmo:warmup:light-two-hand-overhead-extension": {
    ...common, mediaId: "ritmo:warmup:light-two-hand-overhead-extension",
    animation: "/media/personal-v16/light-two-hand-overhead-extension.mp4", animationFormat: "mp4",
    source: "RITMO self-produced V1.6 Sequence",
    sourcePath: "reports/ritmo-v16-phase-media-batch3/overhead/sequence.mp4",
  },
  "ritmo:warmup:forearm-plank-activation": {
    ...common, mediaId: "ritmo:warmup:forearm-plank-activation",
    animation: "/media/personal-v15/plank.mp4", animationFormat: "mp4",
    source: "RITMO self-produced V1.5 Sequence; matched pose reused for V1.6 warmup",
    sourcePath: "public/media/personal-v15/plank.mp4",
  },
  "ritmo:stretch:cross-body-rear-delt": {
    ...common, mediaId: "ritmo:stretch:cross-body-rear-delt",
    segments: {
      left: { staticImage: "/media/personal-v16/cross-body-rear-delt-left.png" },
      right: { staticImage: "/media/personal-v16/cross-body-rear-delt-right.png" },
    },
    source: "RITMO self-produced V1.6 static poses",
    sourcePath: "reports/ritmo-v16-phase-media-batch2/cross-body-rear-delt/left.png;reports/ritmo-v16-phase-media-batch2/cross-body-rear-delt/right.png",
  },
  "ritmo:stretch:standing-supported-lat": {
    ...common, mediaId: "ritmo:stretch:standing-supported-lat",
    staticImage: "/media/personal-v16/standing-supported-lat.png",
    source: "RITMO self-produced V1.6 static pose",
    sourcePath: "reports/ritmo-v16-phase-media-batch2/standing-supported-lat/whole.png",
  },
  "ritmo:stretch:overhead-triceps": {
    ...common, mediaId: "ritmo:stretch:overhead-triceps",
    segments: {
      left: { staticImage: "/media/personal-v16/overhead-triceps-left.png" },
      right: { staticImage: "/media/personal-v16/overhead-triceps-right.png" },
    },
    source: "RITMO self-produced V1.6 static poses; left/right denote the stretched arm",
    sourcePath: "reports/ritmo-v16-phase-media-batch1/overhead-triceps/left.png;reports/ritmo-v16-phase-media-batch1/overhead-triceps/right.png",
    sourceVersion: "78354eb visual candidate; designer accepted 2026-10-24",
    technicalReview: "ACE pose comparison and body-side check passed for personal test; professional review pending",
  },
  "ritmo:stretch:prone-abdominal-extension": {
    ...common, mediaId: "ritmo:stretch:prone-abdominal-extension",
    staticImage: "/media/personal-v16/prone-abdominal-extension.png",
    source: "RITMO self-produced V1.6 center pose reused for independent no-rotation variant",
    sourcePath: "reports/ritmo-v16-phase-media-batch1/abdomen-rotation/center.png",
    sourceVersion: "78354eb visual candidate; designer accepted 2026-10-24",
    technicalReview: "ACE Cobra pose comparison passed for personal test; no rotation is represented; professional review pending",
  },
};
