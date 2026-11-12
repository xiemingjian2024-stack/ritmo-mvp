import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, type Page } from "@playwright/test";

const output = join(process.cwd(), "reports", "ritmo-v1.3", "screenshots");

const smith = { id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 3, reps: 10, weight: 20 };
const incline = { id: "incline-db", name: "上斜哑铃卧推", muscle: "胸", equipment: "哑铃", sets: 3, reps: 10, weight: 12 };
const fly = { id: "pec-deck", name: "蝴蝶机夹胸", muscle: "胸", equipment: "固定器械", sets: 3, reps: 12, weight: 25 };
const cable = { id: "cable-fly", name: "绳索夹胸", muscle: "胸", equipment: "绳索", sets: 3, reps: 12, weight: 10 };

function baseState() {
  return {
    currentEnvironment: "健身房",
    environments: ["健身房", "家里"],
    plans: [
      { id: "chest", name: "胸部基础", environment: "健身房", exercises: [smith, incline, fly, cable] },
      { id: "back", name: "背部训练", environment: "健身房", exercises: [{ ...smith, id: "row", name: "坐姿划船", muscle: "背" }] },
      { id: "legs", name: "腿部训练", environment: "健身房", exercises: [{ ...smith, id: "squat", name: "深蹲", muscle: "腿" }] },
      { id: "shoulders", name: "肩部训练", environment: "健身房", exercises: [{ ...smith, id: "press", name: "肩上推举", muscle: "肩" }] },
      { id: "arms", name: "手臂补充", environment: "健身房", exercises: [{ ...smith, id: "curl", name: "哑铃弯举", muscle: "手臂" }] },
      { id: "core", name: "核心稳定", environment: "健身房", exercises: [{ ...smith, id: "plank", name: "平板支撑", muscle: "核心", weight: 0 }] },
    ],
    cycleIdsByEnvironment: { 健身房: ["chest", "back", "legs", "shoulders"], 家里: [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false },
    sessions: [],
    activeWorkout: null,
  };
}

async function seed(page: Page, state: ReturnType<typeof baseState>) {
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), state);
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: join(output, name), fullPage: true });
}

test.beforeAll(() => mkdirSync(output, { recursive: true }));
test.beforeEach(async ({ page }) => page.setViewportSize({ width: 393, height: 852 }));

test("capture V1.3 report screens", async ({ page }) => {
  const state = baseState();
  await seed(page, state);
  await page.goto("/?flow=training");
  await capture(page, "01-training-home.png");

  await page.goto("/?flow=plans");
  await capture(page, "02-plans-home.png");

  await page.getByRole("button", { name: "创建", exact: true }).click();
  await page.locator(".mobile-scroll").evaluate((node) => { node.scrollTop = 0; });
  await capture(page, "07-create-plan.png");
});

test("capture records with real session snapshots", async ({ page }) => {
  const state = baseState();
  const now = new Date();
  state.sessions = [0, 1].map((index) => ({
    id: `report-session-${index}`,
    source: index ? "custom" : "cycle",
    environmentId: "健身房",
    startedAt: new Date(now.getTime() - (index + 1) * 45 * 60_000).toISOString(),
    endedAt: new Date(now.getTime() - index * 20 * 60_000).toISOString(),
    planId: index ? undefined : "chest",
    planName: index ? "自定义临时训练" : "胸部基础",
    completed: true,
    exercises: [{ ...smith, completedSets: [{ setNumber: 1, targetReps: 10, actualReps: 10 - index, weight: 20, completed: true }] }],
  })) as never;
  await seed(page, state);
  await page.goto("/?flow=records");
  await capture(page, "03-records-home.png");
});

function activeWorkout(stage: "active" | "rest" | "transition") {
  return {
    id: `report-${stage}`,
    source: "cycle",
    environmentId: "健身房",
    startedAt: new Date().toISOString(),
    planId: "chest",
    planName: "胸部基础",
    exercises: [smith, incline],
    exerciseIndex: 0,
    setNumber: 1,
    targetReps: 10,
    weight: 20,
    stage,
    restRemaining: 75,
    paused: true,
    completedSets: stage === "active" ? {} : { "0": [{ setNumber: 1, targetReps: 10, actualReps: 10, weight: 20, completed: true }] },
  };
}

test("capture active set", async ({ page }) => {
  const activeState = baseState();
  activeState.activeWorkout = activeWorkout("active") as never;
  await seed(page, activeState);
  await page.goto("/?flow=training");
  await capture(page, "04-active-set.png");
});

test("capture rest", async ({ page }) => {
  const restState = baseState();
  restState.activeWorkout = activeWorkout("rest") as never;
  await seed(page, restState);
  await page.goto("/?flow=training");
  await capture(page, "05-rest.png");
});

test("capture next exercise", async ({ page }) => {
  const transitionState = baseState();
  transitionState.activeWorkout = { ...activeWorkout("transition"), paused: false } as never;
  await seed(page, transitionState);
  await page.goto("/?flow=training");
  await capture(page, "06-next-exercise.png");
});
