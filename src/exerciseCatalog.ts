import { videoLibrarySpecById } from "./personalTrainingLibrary";
import { getExtendedExerciseSpec } from "./extendedExerciseCatalog";

// RITMO-owned metadata. All anatomical/variant assignments are provisional until professional review.
export const EXERCISE_DATA_VERSION = 1;
export const MUSCLE_REGIONS = {
  ABDUCTORS: "髋外展肌群", ADDUCTORS: "髋内收肌群", BACK_LOWER: "下背部", BICEPS: "肱二头肌",
  CALVES: "小腿肌群", CHEST: "胸大肌", CORE: "腹直肌群", FOREARMS: "前臂肌群",
  GLUTES: "臀大肌", HAMSTRINGS: "腘绳肌群", LATS: "背阔肌", OBLIQUES: "腹斜肌群",
  QUADS: "股四头肌", RHOMBOIDS: "菱形肌群", SHOULDERS_FRONT: "三角肌前束",
  SHOULDERS_REAR: "三角肌后束", SHOULDERS_SIDE: "三角肌中束", TRAPEZIUS: "斜方肌", TRICEPS: "肱三头肌",
} as const;
export type MuscleId = keyof typeof MUSCLE_REGIONS;
export const MUSCLE_TO_SVG_REGION: Record<MuscleId, string> = {
  ABDUCTORS: "ABDUCTORS", ADDUCTORS: "ADDUCTORS", BACK_LOWER: "BACK_LOWER", BICEPS: "BICEPS",
  CALVES: "CALVES", CHEST: "CHEST", CORE: "CORE", FOREARMS: "FOREARMS", GLUTES: "GLUTES",
  HAMSTRINGS: "HAMSTRINGS", LATS: "LATS", OBLIQUES: "OBLIQUES", QUADS: "QUADS",
  RHOMBOIDS: "RHOMBOIDS", SHOULDERS_FRONT: "SHOULDERS_FRONT", SHOULDERS_REAR: "SHOULDERS_REAR",
  SHOULDERS_SIDE: "SHOULDERS_SIDE", TRAPEZIUS: "TRAPEZIUS", TRICEPS: "TRICEPS",
};
export const muscleRegionId = (id: MuscleId) => MUSCLE_TO_SVG_REGION[id];

export type ExerciseSpec = {
  id: string; name: string; standardName: string; muscle: string; equipment: string;
  variant: string; primaryMuscleIds: MuscleId[]; secondaryMuscleIds: MuscleId[];
  measurementType: "reps" | "duration"; sets: number; reps: number; targetDurationSeconds?: number;
  weight: number; restSeconds: number; mediaId: string; dataSource: "RITMO V1.3 local defaults" | "hasaneyldrm/exercises-dataset MIT";
  reviewStatus: "pending_professional_review"; reviewNotes?: string; dataVersion: number;
};

const spec = (id: string, name: string, standardName: string, muscle: string, equipment: string,
  variant: string, primary: MuscleId[], secondary: MuscleId[], reps: number, weight: number,
  options: { duration?: number; notes?: string } = {}): ExerciseSpec => ({
  id, name, standardName, muscle, equipment, variant, primaryMuscleIds: primary, secondaryMuscleIds: secondary,
  measurementType: options.duration ? "duration" : "reps", sets: 3, reps: options.duration ? 0 : reps,
  targetDurationSeconds: options.duration, weight, restSeconds: 90, mediaId: id,
  dataSource: "RITMO V1.3 local defaults", reviewStatus: "pending_professional_review",
  reviewNotes: options.notes, dataVersion: EXERCISE_DATA_VERSION,
});

export const exerciseCatalog: ExerciseSpec[] = [
  spec("smith", "Smith 卧推", "史密斯机平板卧推", "胸", "Smith 架", "平板；握距待审校", ["CHEST"], ["TRICEPS", "SHOULDERS_FRONT"], 10, 20),
  spec("incline", "上斜哑铃卧推", "上斜哑铃卧推", "胸", "哑铃", "上斜角度待审校", ["CHEST"], ["TRICEPS", "SHOULDERS_FRONT"], 10, 10),
  spec("fly", "蝴蝶机夹胸", "蝴蝶机夹胸", "胸", "蝴蝶机", "坐姿；把手待审校", ["CHEST"], ["SHOULDERS_FRONT"], 12, 25),
  spec("pushup", "俯卧撑", "标准俯卧撑", "胸", "徒手", "标准支撑", ["CHEST"], ["TRICEPS", "SHOULDERS_FRONT", "CORE"], 10, 0),
  spec("pulldown", "高位下拉", "高位下拉（变式待确认）", "背", "高位下拉器", "握法、把手及拉向待确认", ["LATS"], ["BICEPS", "RHOMBOIDS"], 10, 25, { notes: "变式不明确，不能视为已验证" }),
  spec("row", "坐姿划船", "坐姿器械划船（变式待确认）", "背", "划船器", "把手及握法待确认", ["LATS", "RHOMBOIDS"], ["BICEPS", "TRAPEZIUS"], 10, 25, { notes: "变式不明确，不能视为已验证" }),
  spec("one-arm-row", "单臂哑铃划船", "单臂哑铃划船", "背", "哑铃", "支撑姿势待审校", ["LATS"], ["RHOMBOIDS", "BICEPS"], 10, 12.5),
  spec("straight-pull", "直臂下压", "绳索直臂下压", "背", "绳索", "把手待审校", ["LATS"], ["TRICEPS"], 12, 15),
  spec("raise", "哑铃侧平举", "站姿哑铃侧平举", "肩", "哑铃", "站姿待审校", ["SHOULDERS_SIDE"], ["TRAPEZIUS"], 12, 5),
  spec("press", "坐姿哑铃推举", "坐姿哑铃肩推", "肩", "哑铃", "靠背角度待审校", ["SHOULDERS_FRONT", "SHOULDERS_SIDE"], ["TRICEPS"], 10, 8),
  spec("curl", "哑铃弯举", "哑铃弯举", "手臂", "哑铃", "握法及站坐姿待审校", ["BICEPS"], ["FOREARMS"], 10, 8),
  spec("triceps", "绳索下压", "绳索肱三头肌下压（把手待确认）", "手臂", "绳索", "绳把/直杆待确认", ["TRICEPS"], ["FOREARMS"], 12, 12.5, { notes: "把手不明确，不能视为已验证" }),
  spec("plank", "平板支撑", "前臂平板支撑", "核心", "徒手", "前臂支撑", ["CORE"], ["OBLIQUES", "GLUTES"], 0, 0, { duration: 30 }),
  spec("crunch", "卷腹", "仰卧卷腹", "核心", "徒手", "仰卧", ["CORE"], ["OBLIQUES"], 15, 0),
  spec("squat", "史密斯深蹲", "史密斯机深蹲", "腿", "Smith 架", "脚位及深度待审校", ["QUADS", "GLUTES"], ["HAMSTRINGS", "BACK_LOWER"], 10, 30),
  spec("leg-press", "腿举", "腿举机腿举（机型待确认）", "腿", "腿举机", "机型、脚位及轨迹待确认", ["QUADS", "GLUTES"], ["HAMSTRINGS", "CALVES"], 12, 40, { notes: "机型不明确，不能视为已验证" }),
  spec("pike-pushup", "派克俯卧撑", "派克俯卧撑", "肩", "徒手", "倒 V 支撑", ["SHOULDERS_FRONT"], ["TRICEPS", "SHOULDERS_SIDE"], 8, 0),
  spec("superman", "俯卧挺身", "俯卧挺身", "背", "徒手", "俯卧；动作幅度待审校", ["BACK_LOWER"], ["GLUTES", "HAMSTRINGS"], 12, 0),
  spec("body-squat", "徒手深蹲", "徒手深蹲", "腿", "徒手", "站姿", ["QUADS", "GLUTES"], ["HAMSTRINGS"], 15, 0),
  spec("glute-bridge", "臀桥", "徒手臀桥", "腿", "徒手", "仰卧", ["GLUTES"], ["HAMSTRINGS", "CORE"], 15, 0),
];

export const exerciseById = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
export const getExerciseSpec = (id: string): ExerciseSpec | undefined => exerciseById.get(id) ?? videoLibrarySpecById.get(id) ?? getExtendedExerciseSpec(id);
export const getDurationSeconds = (exercise: { id: string; targetDurationSeconds?: number }) =>
  exercise.targetDurationSeconds ?? getExerciseSpec(exercise.id)?.targetDurationSeconds ?? 0;
export const exerciseSummary = (exercise: { id: string; reps: number; targetDurationSeconds?: number }) =>
  getExerciseSpec(exercise.id)?.measurementType === "duration" ? `${getDurationSeconds(exercise)} 秒` : `${exercise.reps} 次`;
