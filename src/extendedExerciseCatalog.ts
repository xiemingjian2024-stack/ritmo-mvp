import dataset from "./data/exercises-dataset.json" with { type: "json" };
import type { ExerciseSpec, MuscleId } from "./exerciseCatalog";
import { priorityById, priorityRank, prioritySearchText } from "./priorityExerciseCatalog";

export type ExtendedExercise = (typeof dataset.records)[number];
export const extendedSource = dataset.metadata;
// The source's equipment field omits accessories in several instructions (for
// example, body-weight dips on parallel bars and dumbbell curls on a bench).
// Keep the imported source data intact and apply a conservative runtime guard.
const extraHomeApparatus = /\b(?:bench|bars?|rings?|handles?|chair|box|stepbox|balance board|exercise ball|stability ball|resistance band|cable machine|step platform|suspension trainer|straps?|arm blaster|towel)\b/i;
const apparatusVariant = /\b(?:incline|decline|preacher|peacher|chest dip|triceps dip|pull[- ]?up|chin[- ]?up|suspended|suspension|ring dips?|inverted row)\b/i;
export function isExtendedHomeEligible(entry: ExtendedExercise): boolean {
  return entry.homeEligible && !apparatusVariant.test(entry.name) && !extraHomeApparatus.test(`${entry.name} ${entry.instructionsEn.join(" ")}`);
}
export const extendedCatalog: ExtendedExercise[] = dataset.records;
export const extendedById = new Map(extendedCatalog.map((entry) => [entry.id, entry]));
// Source instructions explicitly require a dumbbell for these entries, despite
// their body-weight equipment field. Keep the source record and ID unchanged.
export const extendedEquipmentCorrections: Record<string, { name?: string; equipment: string; reason: string }> = {
  "hasan:1770": { equipment: "dumbbell + bench", reason: "说明要求哑铃和训练凳，来源器械字段为 body weight" },
  "hasan:3156": { name: "dumbbell standing close-grip one arm row", equipment: "dumbbell", reason: "说明要求哑铃，来源名称和器械字段误写为 bodyweight" },
  "hasan:3162": { name: "dumbbell standing one arm row", equipment: "dumbbell", reason: "说明要求哑铃，来源名称和器械字段误写为 bodyweight" },
};

const bodyPartToTab: Record<string, string> = {
  chest: "胸", back: "背", shoulders: "肩", "upper arms": "手臂", "lower arms": "手臂",
  "upper legs": "腿", "lower legs": "腿", waist: "核心",
};
const targetToMuscle: Record<string, MuscleId> = {
  pectorals: "CHEST", biceps: "BICEPS", triceps: "TRICEPS", delts: "SHOULDERS_SIDE",
  lats: "LATS", "upper back": "RHOMBOIDS", abs: "CORE", glutes: "GLUTES",
  quads: "QUADS", hamstrings: "HAMSTRINGS", calves: "CALVES", forearms: "FOREARMS",
  spine: "BACK_LOWER", traps: "TRAPEZIUS", adductors: "ADDUCTORS", abductors: "ABDUCTORS",
  quadriceps: "QUADS", trapezius: "TRAPEZIUS", rhomboids: "RHOMBOIDS",
  "lower back": "BACK_LOWER", obliques: "OBLIQUES", core: "CORE", chest: "CHEST",
};
export function unmappedSourceMuscles(entry: ExtendedExercise): string[] {
  return [...new Set([entry.target, ...entry.secondaryMuscles].filter((name) => !targetToMuscle[name]))];
}
const coreIdSet = new Set(["smith", "incline", "fly", "pushup", "pulldown", "row", "one-arm-row", "straight-pull", "raise", "press", "curl", "triceps", "plank", "crunch", "squat", "leg-press", "pike-pushup", "superman", "body-squat", "glute-bridge"]);
export const coreCrosswalk: Record<string, { sourceId: string; relation: "candidate" | "rejected"; reason: string }> = {
  smith: { sourceId: "0748", relation: "candidate", reason: "Smith 平板与握距待核" },
  incline: { sourceId: "0314", relation: "candidate", reason: "上斜角度待核" },
  fly: { sourceId: "0596", relation: "candidate", reason: "蝴蝶机把手待核" },
  pushup: { sourceId: "0662", relation: "candidate", reason: "手距与幅度待核" },
  pulldown: { sourceId: "2330", relation: "rejected", reason: "实际站姿双侧绳索，非坐姿宽握直杆" },
  row: { sourceId: "1350", relation: "candidate", reason: "坐姿器械与把手待核" },
  "one-arm-row": { sourceId: "0292", relation: "candidate", reason: "支撑姿势待核" },
  "straight-pull": { sourceId: "0238", relation: "candidate", reason: "直杆/绳把待核" },
  raise: { sourceId: "0334", relation: "candidate", reason: "站姿与幅度待核" },
  press: { sourceId: "0405", relation: "candidate", reason: "坐姿靠背待核" },
  curl: { sourceId: "0294", relation: "candidate", reason: "握法待核" },
  triceps: { sourceId: "0241", relation: "candidate", reason: "V 把是否符合待核" },
  crunch: { sourceId: "0274", relation: "candidate", reason: "动作幅度待核" },
  squat: { sourceId: "0770", relation: "candidate", reason: "脚位待核" },
  "leg-press": { sourceId: "0739", relation: "candidate", reason: "仅 45 度腿举；RITMO 机型未定" },
  "glute-bridge": { sourceId: "3013", relation: "candidate", reason: "动作幅度待核" },
};
export const crosswalkByExternalId = new Map(Object.entries(coreCrosswalk).map(([ritmoId, link]) => [`hasan:${link.sourceId}`, { ritmoId, ...link }]));

export function extendedTab(entry: ExtendedExercise): string | null { return bodyPartToTab[entry.bodyPart] ?? null; }
export function extendedSearch(query: string, tab: string, environment: string, availableOnly: boolean, includeNiche = false): ExtendedExercise[] {
  const term = query.trim().toLocaleLowerCase();
  return extendedCatalog.filter((entry) => {
    if (!includeNiche && entry.tier === "niche") return false;
    if (extendedTab(entry) !== tab) return false;
    if (availableOnly && environment === "家里" && !isExtendedHomeEligible(entry)) return false;
    if (!term && priorityById.get(entry.id)?.beginnerStatus === "not_for_beginners") return false;
    return !term || entry.name.toLocaleLowerCase().includes(term) || extendedEquipmentCorrections[entry.id]?.name?.toLocaleLowerCase().includes(term) || prioritySearchText(entry.id).includes(term);
  }).sort((left, right) => (priorityRank.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (priorityRank.get(right.id) ?? Number.MAX_SAFE_INTEGER)).slice(0, 60);
}
export function extendedSpec(entry: ExtendedExercise): ExerciseSpec {
  const correction = extendedEquipmentCorrections[entry.id];
  const priority = priorityById.get(entry.id);
  const primary = priority?.primaryRegionIds ?? (targetToMuscle[entry.target] ? [targetToMuscle[entry.target]] : []);
  const secondary = [...new Set(entry.secondaryMuscles.flatMap((name) => targetToMuscle[name] ? [targetToMuscle[name]] : []))];
  const unmapped = unmappedSourceMuscles(entry);
  // Only source descriptions that explicitly prescribe a held position are
  // classified here. Similar names are not enough to infer timed exercise.
  const targetDurationSeconds = entry.id === "hasan:0705" ? 30 : undefined;
  return {
    id: entry.id, name: priority?.nameZh ?? correction?.name ?? entry.name, standardName: entry.name, muscle: extendedTab(entry) ?? "其他",
    equipment: correction?.equipment ?? entry.equipment, variant: priority?.variantZh ?? "来源动作变式待专业审校", primaryMuscleIds: primary,
    secondaryMuscleIds: secondary, measurementType: targetDurationSeconds ? "duration" : "reps", sets: 3, reps: targetDurationSeconds ? 0 : 10, targetDurationSeconds, weight: 0,
    restSeconds: 90, mediaId: entry.id, dataSource: "hasaneyldrm/exercises-dataset MIT" as ExerciseSpec["dataSource"],
    reviewStatus: "pending_professional_review", reviewNotes: `仅作为用户可编辑草稿；组数和次数为 RITMO 草稿值，非外部训练处方。${correction ? ` ${correction.reason}；修正待专业审校。` : "计时型动作尚未审校。"}${unmapped.length ? ` 来源肌群未定位到具体 SVG 区域：${unmapped.join("、")}；未自动映射。` : ""}`,
    dataVersion: 1,
  };
}
export function getExtendedExerciseSpec(id: string): ExerciseSpec | undefined {
  const entry = extendedById.get(id);
  return entry ? extendedSpec(entry) : undefined;
}
export function isCoreId(id: string) { return coreIdSet.has(id); }
