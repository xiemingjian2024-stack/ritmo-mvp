import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const output = process.env.RITMO_REVIEW_OUTPUT || join(process.cwd(), "reports", "ritmo-v1.3-visual-qa-final", "screenshots");

const smith = { id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 3, reps: 10, weight: 20 };
const incline = { id: "incline", name: "上斜哑铃卧推", muscle: "胸", equipment: "哑铃", sets: 3, reps: 10, weight: 12 };
const fly = { id: "fly", name: "蝴蝶机夹胸", muscle: "胸", equipment: "蝴蝶机", sets: 3, reps: 12, weight: 25 };
const pushup = { id: "pushup", name: "俯卧撑", muscle: "胸", equipment: "徒手", sets: 3, reps: 12, weight: 0 };

function baseState() {
  return {
    currentEnvironment: "健身房",
    environments: ["健身房", "家里"],
    plans: [
      { id: "chest", name: "胸部基础", environment: "健身房", exercises: [smith, incline, fly, pushup] },
      { id: "back", name: "背部训练", environment: "健身房", exercises: [{ ...smith, id: "row", name: "坐姿划船", muscle: "背" }] },
      { id: "legs", name: "腿部训练", environment: "健身房", exercises: [{ ...smith, id: "squat", name: "史密斯深蹲", muscle: "腿" }] },
      { id: "shoulders", name: "肩部训练", environment: "健身房", exercises: [{ ...smith, id: "press", name: "坐姿哑铃推举", muscle: "肩" }] },
      { id: "arms", name: "手臂强化", environment: "健身房", exercises: [{ ...smith, id: "curl", name: "哑铃弯举", muscle: "手臂" }] },
      { id: "core", name: "核心激活", environment: "健身房", exercises: [{ ...pushup, id: "plank", name: "平板支撑", muscle: "核心" }] },
    ],
    cycleIdsByEnvironment: { 健身房: ["chest", "back", "legs", "shoulders"], 家里: [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false },
    sessions: [],
    activeWorkout: null,
  };
}

function activeWorkout(stage: "active" | "rest" | "transition") {
  return {
    id: `visual-${stage}`,
    source: "cycle",
    environmentId: "健身房",
    startedAt: new Date().toISOString(),
    planId: "chest",
    planName: "胸部基础",
    exercises: [smith, incline],
    exerciseIndex: stage === "transition" ? 0 : 0,
    setNumber: 1,
    targetReps: 10,
    weight: 20,
    stage,
    restRemaining: 90,
    paused: true,
    completedSets: stage === "active" ? {} : { "0": [{ setNumber: 1, targetReps: 10, actualReps: 10, weight: 20, completed: true }] },
  };
}

async function seed(page: Page, state: ReturnType<typeof baseState>) {
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), state);
}

async function capture(page: Page, name: string) {
  const screen = page.getByTestId("device-screen");
  await expect(screen).toBeVisible();
  await page.waitForTimeout(650);
  const box = await screen.boundingBox();
  expect(box?.width).toBeCloseTo(393, 0);
  expect(box?.height).toBeCloseTo(852, 0);
  await page.screenshot({ path: join(output, name), clip: { x: Math.round(box!.x), y: Math.round(box!.y), width: 393, height: 852 } });
}

test.beforeAll(() => mkdirSync(output, { recursive: true }));
test.beforeEach(async ({ page }) => page.setViewportSize({ width: 1200, height: 1100 }));

test("capture final Visual QA states", async ({ browser }) => {
  const take = async (name: string, route: string, state = baseState(), action?: (page: Page) => Promise<void>) => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 1100 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await seed(page, state);
    await page.goto(route);
    if (action) await action(page);
    await capture(page, name);
    expect(consoleErrors, `${name} should render without console errors`).toEqual([]);
    await context.close();
  };

  await take("01-training-next.png", "/?flow=training");
  await take("02-training-recommended.png", "/?flow=training&empty=1&environment=home");
  await take("03-plans-home.png", "/?flow=plans");
  await take("04-create-plan.png", "/?flow=plans", baseState(), async (page) => {
    await page.getByRole("button", { name: /^创建/ }).click();
  });
  await take("05-plan-detail.png", "/?flow=plans", baseState(), async (page) => {
    await page.getByRole("button", { name: /^创建/ }).click();
    await page.getByRole("button", { name: "创建自定义方案" }).click();
  });
  await take("06-add-exercise.png", "/?flow=plans", baseState(), async (page) => {
    await page.getByRole("button", { name: /^创建/ }).click();
    await page.getByRole("button", { name: "创建自定义方案" }).click();
    await page.getByRole("button", { name: /添加动作/ }).click();
    for (let index = 0; index < 3; index += 1) await page.locator(".library-list > button").nth(index).click();
  });

  for (const [name, stage] of [["07-active-set.png", "active"], ["08-rest.png", "rest"], ["10-next-exercise.png", "transition"]] as const) {
    const state = baseState();
    state.activeWorkout = { ...activeWorkout(stage), paused: false } as never;
    await take(name, "/?flow=training", state);
  }

  const restState = baseState();
  restState.activeWorkout = activeWorkout("rest") as never;
  await take("09-rest-parameters.png", "/?flow=training", restState, async (page) => {
    await page.getByRole("button", { name: /^下一组/ }).click();
  });

  const recordsState = baseState();
  const now = new Date();
  recordsState.sessions = [0, 1].map((index) => ({
    id: `visual-record-${index}`,
    source: index ? "custom" : "cycle",
    environmentId: "健身房",
    startedAt: new Date(now.getTime() - (75 + index * 45) * 60_000).toISOString(),
    endedAt: new Date(now.getTime() - index * 15 * 60_000).toISOString(),
    planId: index ? undefined : "chest",
    planName: index ? "自定义临时训练" : "胸部基础",
    completed: true,
    exercises: [{ ...smith, completedSets: [{ setNumber: 1, targetReps: 10, actualReps: 10 - index, weight: 20, completed: true }] }],
  })) as never;
  await take("11-records-home.png", "/?flow=records", recordsState);
});
