export const trainingHomeVisualQaData = {
  currentEnvironment: "健身房",
  environments: ["健身房", "家里"],
  plans: [
    {
      id: "qa-chest-next",
      name: "胸部训练",
      environment: "健身房",
      exercises: [
        { id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 3, reps: 10, weight: 20 },
        { id: "incline", name: "上斜哑铃卧推", muscle: "胸", equipment: "哑铃", sets: 3, reps: 10, weight: 10 },
        { id: "fly", name: "蝴蝶机夹胸", muscle: "胸", equipment: "蝴蝶机", sets: 3, reps: 12, weight: 25 },
        { id: "pushup", name: "俯卧撑", muscle: "胸", equipment: "徒手", sets: 3, reps: 12, weight: 0 },
      ],
    },
  ],
  cycleIdsByEnvironment: { 健身房: ["qa-chest-next"], 家里: [] },
  cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
  cycleEnabledByEnvironment: { 健身房: true, 家里: false },
  sessions: [],
  activeWorkout: null,
};

// Browser-only, repeatable states for the five-page visual review. These objects
// are cloned in memory and never written to the user's saved RITMO data.
const smith = { id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 3, reps: 10, weight: 20 };
const incline = { id: "incline", name: "上斜哑铃卧推", muscle: "胸", equipment: "哑铃", sets: 3, reps: 10, weight: 20 };
const fly = { id: "fly", name: "蝴蝶机夹胸", muscle: "胸", equipment: "蝴蝶机", sets: 3, reps: 12, weight: 20 };
const pushup = { id: "pushup", name: "俯卧撑", muscle: "胸", equipment: "徒手", sets: 3, reps: 10, weight: 0 };
const fourExercises = [smith, incline, fly, pushup];
const plan = (id: string, name: string) => ({ id, name, environment: "健身房", exercises: fourExercises.map((exercise) => ({ ...exercise })) });

export const firstBatchVisualQaData = {
  currentEnvironment: "健身房",
  environments: ["健身房", "家里"],
  plans: [
    plan("qa-chest", "胸部基础"),
    plan("qa-back", "背部力量"),
    plan("qa-legs", "腿部训练"),
    plan("qa-shoulders", "肩部训练"),
    plan("qa-chest-independent", "胸部基础"),
    plan("qa-back-independent", "背部力量"),
    plan("qa-core", "核心激活"),
  ],
  cycleIdsByEnvironment: { 健身房: ["qa-chest", "qa-back", "qa-legs", "qa-shoulders"], 家里: [] },
  cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
  cycleEnabledByEnvironment: { 健身房: true, 家里: false },
  sessions: [],
  activeWorkout: null,
};

export const firstBatchDetailDraft = plan("qa-detail", "未命名方案");

export const firstBatchRecommendedPlans = [
  { ...plan("qa-template-chest", "胸部训练"), exercises: fourExercises.map((exercise) => ({ ...exercise, reps: 10 })) },
  { id: "qa-template-back", name: "背部训练", environment: "健身房", exercises: [
    { id: "pulldown", name: "高位下拉", muscle: "背", equipment: "高位下拉器", sets: 3, reps: 10, weight: 25 },
    { id: "row", name: "坐姿划船", muscle: "背", equipment: "划船器", sets: 3, reps: 10, weight: 25 },
    { id: "one-arm-row", name: "单臂哑铃划船", muscle: "背", equipment: "哑铃", sets: 3, reps: 10, weight: 12.5 },
    { id: "straight-pull", name: "直臂下压", muscle: "背", equipment: "绳索", sets: 3, reps: 10, weight: 15 },
  ] },
];
