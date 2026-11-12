import type { MuscleId } from "./exerciseCatalog";

export type PhaseGroup = "胸" | "背" | "肩" | "手臂" | "腿" | "核心";
export type WorkoutPhase = "warmup" | "strength" | "cooldown";
export type PhaseSegment = "whole" | "forward" | "back" | "center" | "left" | "right";
export type PhaseItem = {
  id: string;
  sets?: number;
  segmentsPerSet?: number;
  homeTemplateEquipment?: boolean;
  phase: "warmup" | "cooldown";
  name: string;
  groups: PhaseGroup[];
  equipment: "bodyweight" | "dumbbell" | "fixed-support";
  measurementType: "reps" | "duration";
  target: number;
  segments: PhaseSegment[];
  exerciseRef?: string;
  matchStatus: "exact_pose_candidate" | "variant_pending" | "new_definition";
  sourceVideo: string;
  sourceDose: string;
  defaultDose: string;
  reviewStatus: "pending_professional_review";
  dataVersion: 1 | 2 | 3 | 4 | 5;
};

const item = (value: Omit<PhaseItem, "reviewStatus" | "dataVersion"> & { dataVersion?: PhaseItem["dataVersion"] }): PhaseItem => ({
  ...value, reviewStatus: "pending_professional_review", dataVersion: value.dataVersion ?? 1,
});

// RITMO phase records are independent of editable strength exercises. Source
// doses are transcription evidence; target/defaultDose are V1.6 execution defaults.
export const PHASE_CATALOG_VERSION = 5;
export const phaseExerciseCatalog: PhaseItem[] = [
  item({ id: "ritmo:warmup:shoulder-circles", phase: "warmup", name: "双臂肩关节绕环", groups: ["胸", "背", "肩", "手臂"], equipment: "bodyweight", measurementType: "reps", target: 10, segments: ["forward", "back"], matchStatus: "new_definition", sourceVideo: "687610 0:22–0:30", sourceDose: "前后各 10 次", defaultDose: "前后各 10 次 · 1 组" }),
  item({ id: "ritmo:warmup:low-high-chest-squeeze", phase: "warmup", name: "轻哑铃站姿低位夹胸", groups: ["胸"], equipment: "dumbbell", measurementType: "reps", target: 12, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "687610 0:31–0:42", sourceDose: "次数未显示；视频称 2 组", defaultDose: "12 次 · 1 组" }),
  item({ id: "ritmo:warmup:standing-chest-open-close", phase: "warmup", name: "徒手站姿胸前开合", groups: ["胸"], equipment: "bodyweight", measurementType: "reps", target: 12, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "RITMO 独立徒手胸前开合变式；不是 687610 轻哑铃低位夹胸", sourceDose: "独立变式无原视频次数", defaultDose: "12 次 · 1 组（RITMO 默认）", dataVersion: 3 }),
  item({ id: "ritmo:warmup:light-lateral-raise", phase: "warmup", name: "轻哑铃站姿侧平举", groups: ["肩"], equipment: "dumbbell", measurementType: "reps", target: 8, segments: ["whole"], exerciseRef: "raise", matchStatus: "variant_pending", sourceVideo: "245563 0:23–0:32", sourceDose: "8 次", defaultDose: "8 次 · 1 组" }),
  item({ id: "ritmo:warmup:lean-lateral-raise", phase: "warmup", name: "前倾轻哑铃侧平举", groups: ["肩"], equipment: "dumbbell", measurementType: "reps", target: 8, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "245563 0:33–0:36", sourceDose: "8 次", defaultDose: "8 次 · 1 组" }),
  item({ id: "ritmo:warmup:bent-rear-raise", phase: "warmup", name: "俯身轻哑铃后束平举", groups: ["肩"], equipment: "dumbbell", measurementType: "reps", target: 8, segments: ["whole"], exerciseRef: "hasan:0380", matchStatus: "variant_pending", sourceVideo: "245563 0:37–0:45", sourceDose: "8 次", defaultDose: "8 次 · 1 组" }),
  item({ id: "ritmo:warmup:bent-scapular-activation", phase: "warmup", name: "俯身轻哑铃肩胛激活", groups: ["背"], equipment: "dumbbell", measurementType: "reps", target: 10, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "532155 0:25–0:42", sourceDose: "10–12 次 × 2 组；轨迹待核", defaultDose: "10 次 · 1 组" }),
  item({ id: "ritmo:warmup:elbows-tucked-external-rotation", phase: "warmup", name: "肘贴身轻哑铃外旋", groups: ["背"], equipment: "dumbbell", measurementType: "reps", target: 10, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "532155 0:43–0:54", sourceDose: "10 次/组", defaultDose: "10 次 · 1 组" }),
  item({ id: "ritmo:warmup:cat-cow", phase: "warmup", name: "四点跪姿猫牛式", groups: ["背"], equipment: "bodyweight", measurementType: "reps", target: 10, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "RITMO 独立无器械变式；参考 ACE Cat-Cow，不替代原哑铃肩胛激活", sourceDose: "独立变式无原视频参数", defaultDose: "缓慢 10 次 · 1 组（RITMO 默认）", dataVersion: 4 }),
  item({ id: "ritmo:warmup:light-alternating-curl", phase: "warmup", name: "轻哑铃交替弯举", groups: ["手臂"], equipment: "dumbbell", measurementType: "reps", target: 12, segments: ["whole"], exerciseRef: "hasan:0285", matchStatus: "variant_pending", sourceVideo: "314043 0:19–0:30", sourceDose: "次数未显示；视频称 2 组", defaultDose: "左右交替共 12 次 · 1 组" }),
  item({ id: "ritmo:warmup:light-two-hand-overhead-extension", phase: "warmup", name: "轻哑铃双手过顶臂屈伸", groups: ["手臂"], equipment: "dumbbell", measurementType: "reps", target: 10, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "314043 0:31–0:40", sourceDose: "10 次 × 2 组", defaultDose: "10 次 · 1 组" }),
  item({ id: "ritmo:warmup:bodyweight-squat", phase: "warmup", name: "徒手深蹲热身", groups: ["腿"], equipment: "bodyweight", measurementType: "reps", target: 15, segments: ["whole"], exerciseRef: "body-squat", matchStatus: "exact_pose_candidate", sourceVideo: "287739 0:24–0:40", sourceDose: "15–20 次 × 2 组", defaultDose: "15 次 · 1 组" }),
  item({ id: "ritmo:warmup:squat-to-toe-grasp", phase: "warmup", name: "深蹲握脚尖伸膝活动", groups: ["腿"], equipment: "bodyweight", measurementType: "reps", target: 15, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "287739 0:41–0:56", sourceDose: "15–20 次；组数未明确", defaultDose: "15 次 · 1 组" }),
  item({ id: "ritmo:warmup:forearm-plank-activation", phase: "warmup", name: "前臂平板支撑激活", groups: ["核心"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["whole"], exerciseRef: "plank", matchStatus: "exact_pose_candidate", sourceVideo: "203452 0:21–0:34", sourceDose: "30–40 秒", defaultDose: "30 秒 · 1 组" }),
  item({ id: "ritmo:stretch:doorway-single-arm-chest", phase: "cooldown", name: "门框单臂胸肌拉伸", groups: ["胸"], equipment: "fixed-support", measurementType: "duration", target: 30, segments: ["left", "right"], matchStatus: "new_definition", sourceVideo: "687610 3:51–4:01", sourceDose: "两侧；时长未给", defaultDose: "每侧 30 秒 · 1 轮" }),
  item({ id: "ritmo:stretch:standing-chest-stretch", phase: "cooldown", name: "站姿徒手胸部伸展", groups: ["胸"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "RITMO 独立无器械变式；参考 ACE Standing Chest Stretch，不是 687610 门框单臂变式", sourceDose: "独立变式无原视频时长", defaultDose: "30 秒 · 1 轮（RITMO 默认）", dataVersion: 3 }),
  item({ id: "ritmo:stretch:cross-body-rear-delt", phase: "cooldown", name: "横臂后束拉伸", groups: ["肩"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["left", "right"], exerciseRef: "hasan:0669", matchStatus: "variant_pending", sourceVideo: "245563 3:11–3:16", sourceDose: "每侧 30 秒", defaultDose: "每侧 30 秒 · 1 轮" }),
  item({ id: "ritmo:stretch:arm-back-front-delt", phase: "cooldown", name: "扶架前三角拉伸", groups: ["肩"], equipment: "fixed-support", measurementType: "duration", target: 30, segments: ["left", "right"], matchStatus: "new_definition", sourceVideo: "245563 3:17–3:23", sourceDose: "每侧 30 秒", defaultDose: "每侧 30 秒 · 1 轮" }),
  item({ id: "ritmo:stretch:standing-supported-lat", phase: "cooldown", name: "扶架背阔肌下压拉伸", groups: ["背"], equipment: "fixed-support", measurementType: "duration", target: 30, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "532155 3:25–3:30", sourceDose: "30 秒", defaultDose: "30 秒 · 1 轮" }),
  item({ id: "ritmo:stretch:child-pose", phase: "cooldown", name: "婴儿式背髋伸展", groups: ["背", "腿"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "RITMO 独立无器械变式；参考 ACE Child's Pose，不冒用扶架拉伸或站姿 4 字臀拉伸", sourceDose: "独立变式无原视频时长", defaultDose: "30 秒 · 1 轮（RITMO 默认）", dataVersion: 4 }),
  item({ id: "ritmo:stretch:double-knee-hug", phase: "cooldown", name: "仰卧双膝抱胸臀背拉伸", groups: ["腿"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "RITMO 独立无器械替代；参考 South Tees NHS Knee to chest 与 Leicestershire NHS Knee Hugs；不冒用仰卧 4 字臀拉伸", sourceDose: "独立变式无原视频时长", defaultDose: "30 秒 · 1 轮（RITMO 默认）", dataVersion: 5 }),
  item({ id: "ritmo:stretch:single-side-supported-lat", phase: "cooldown", name: "单侧扶架背阔肌拉伸", groups: ["背"], equipment: "fixed-support", measurementType: "duration", target: 30, segments: ["left", "right"], matchStatus: "new_definition", sourceVideo: "532155 3:31–3:33", sourceDose: "每侧 30 秒", defaultDose: "每侧 30 秒 · 1 轮" }),
  item({ id: "ritmo:stretch:overhead-triceps", phase: "cooldown", name: "过顶肱三头肌拉伸", groups: ["手臂"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["left", "right"], exerciseRef: "hasan:0817", matchStatus: "variant_pending", sourceVideo: "314043 3:01–3:07", sourceDose: "每侧 30–40 秒", defaultDose: "每侧 30 秒 · 1 轮" }),
  item({ id: "ritmo:stretch:straight-arm-wrist-pull", phase: "cooldown", name: "直臂手腕牵拉", groups: ["手臂"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["left", "right"], exerciseRef: "hasan:0721", matchStatus: "variant_pending", sourceVideo: "314043 3:08–3:13", sourceDose: "每侧 30–40 秒", defaultDose: "每侧 30 秒 · 1 轮" }),
  item({ id: "ritmo:stretch:standing-quad", phase: "cooldown", name: "站姿股四头肌拉伸", groups: ["腿"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["left", "right"], matchStatus: "new_definition", sourceVideo: "287739 3:43–3:50", sourceDose: "每侧 30–40 秒", defaultDose: "每侧 30 秒 · 1 轮；扶架可选" }),
  item({ id: "ritmo:stretch:standing-figure-four", phase: "cooldown", name: "站姿 4 字臀部拉伸", groups: ["腿"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["left", "right"], matchStatus: "new_definition", sourceVideo: "287739 3:51–3:57", sourceDose: "每侧 30–40 秒", defaultDose: "每侧 30 秒 · 1 轮；扶架可选" }),
  item({ id: "ritmo:stretch:cross-leg-posterior-chain", phase: "cooldown", name: "交叉腿俯身后链拉伸", groups: ["腿"], equipment: "bodyweight", measurementType: "duration", target: 30, segments: ["left", "right"], matchStatus: "new_definition", sourceVideo: "287739 3:58–4:05", sourceDose: "每侧 30–40 秒", defaultDose: "每侧 30 秒 · 1 轮；扶架可选" }),
  item({ id: "ritmo:stretch:prone-press-up-rotation", phase: "cooldown", name: "俯卧撑起腹部伸展与转体", groups: ["核心"], equipment: "bodyweight", measurementType: "duration", target: 20, segments: ["center", "left", "right"], matchStatus: "new_definition", sourceVideo: "203452 2:05–2:25", sourceDose: "中间与两侧各约 20 秒", defaultDose: "中间与每侧各 20 秒 · 1 轮" }),
  item({ id: "ritmo:stretch:prone-abdominal-extension", phase: "cooldown", name: "俯卧腹部伸展", groups: ["核心"], equipment: "bodyweight", measurementType: "duration", target: 20, segments: ["whole"], matchStatus: "new_definition", sourceVideo: "RITMO 独立无转体变式；参考 203452 2:05–2:25 的中心姿势", sourceDose: "原视频只展示复合动作；无转体变式没有独立原视频参数", defaultDose: "20 秒 · 1 轮（RITMO 默认）", dataVersion: 2 }),
];

export const phaseById = new Map(phaseExerciseCatalog.map((entry) => [entry.id, entry]));

// The source catalog remains intact. Only these phase/group recommendations
// have enough audited personal-test media to omit known-unfit demonstrations.
// Existing workout snapshots retain their stored warmupIds/cooldownIds.
const personalPhaseSelection: Partial<Record<PhaseGroup, Partial<Record<PhaseItem["phase"], string[]>>>> = {
  胸: {
    warmup: ["ritmo:warmup:standing-chest-open-close"],
    cooldown: ["ritmo:stretch:standing-chest-stretch"],
  },
  背: {
    warmup: ["ritmo:warmup:cat-cow"],
    cooldown: ["ritmo:stretch:child-pose"],
  },
  肩: {
    warmup: ["ritmo:warmup:light-lateral-raise", "ritmo:warmup:lean-lateral-raise"],
    cooldown: ["ritmo:stretch:cross-body-rear-delt"],
  },
  手臂: {
    warmup: ["ritmo:warmup:light-alternating-curl", "ritmo:warmup:light-two-hand-overhead-extension"],
    cooldown: ["ritmo:stretch:overhead-triceps"],
  },
  核心: {
    cooldown: ["ritmo:stretch:prone-abdominal-extension"],
  },
  腿: {
    warmup: ["ritmo:warmup:bodyweight-squat"],
    cooldown: ["ritmo:stretch:standing-quad", "ritmo:stretch:double-knee-hug"],
  },
};

const muscleToGroup: Record<MuscleId, PhaseGroup> = {
  CHEST: "胸", LATS: "背", RHOMBOIDS: "背", BACK_LOWER: "背", TRAPEZIUS: "背",
  SHOULDERS_FRONT: "肩", SHOULDERS_SIDE: "肩", SHOULDERS_REAR: "肩",
  BICEPS: "手臂", TRICEPS: "手臂", FOREARMS: "手臂",
  QUADS: "腿", HAMSTRINGS: "腿", GLUTES: "腿", CALVES: "腿", ADDUCTORS: "腿", ABDUCTORS: "腿",
  CORE: "核心", OBLIQUES: "核心",
};
export const PHASE_GROUP_ORDER: PhaseGroup[] = ["胸", "背", "肩", "手臂", "腿", "核心"];
export function resolvePrimaryGroup(exercises: Array<{ muscle?: string; primaryMuscleIds?: MuscleId[] }>): PhaseGroup | null {
  const contributions = new Map<PhaseGroup, number>();
  for (const exercise of exercises) {
    const fromIds = [...new Set((exercise.primaryMuscleIds ?? []).map((id) => muscleToGroup[id]).filter(Boolean))];
    const fallback = PHASE_GROUP_ORDER.includes(exercise.muscle as PhaseGroup) ? exercise.muscle as PhaseGroup : null;
    const groups = fromIds.length ? fromIds : fallback ? [fallback] : [];
    for (const group of groups) contributions.set(group, (contributions.get(group) ?? 0) + 1 / groups.length);
  }
  if (!contributions.size) return null;
  const maximum = Math.max(...contributions.values());
  const tied = [...contributions.keys()].filter((group) => contributions.get(group) === maximum);
  // A fixed order makes ties independent of exercise ordering and parameter edits.
  return PHASE_GROUP_ORDER.find((group) => tied.includes(group)) ?? null;
}

export function phaseItemsFor(group: PhaseGroup | null, phase: PhaseItem["phase"]): PhaseItem[] {
  if (!group) return [];
  const selectedIds = personalPhaseSelection[group]?.[phase];
  if (selectedIds) return selectedIds.map((id) => phaseById.get(id)).filter((entry): entry is PhaseItem => Boolean(entry));
  return phaseExerciseCatalog.filter((entry) => entry.phase === phase && entry.groups.includes(group));
}

export function phaseItemAvailable(item: PhaseItem, environment: string): boolean {
  if (environment === "家里" && item.homeTemplateEquipment) return true;
  if (item.equipment === "bodyweight") return true;
  if (environment === "健身房") return true;
  if (environment === "家里") return item.equipment === "dumbbell";
  // Custom environments have no stored equipment inventory. Do not infer it.
  return false;
}
