import { expect, test, type Page } from "@playwright/test";

const smith = { id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 1, reps: 1, weight: 20 };

function baseState() {
  return {
    currentEnvironment: "健身房",
    environments: ["健身房", "家里"],
    plans: [
      { id: "chest", name: "胸部基础", environment: "健身房", exercises: [smith] },
      { id: "back", name: "背部基础", environment: "健身房", exercises: [{ ...smith, id: "row", name: "坐姿划船", muscle: "背" }] },
    ],
    cycleIdsByEnvironment: { 健身房: ["chest", "back"], 家里: [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false },
    sessions: [],
    activeWorkout: null,
  };
}

async function seed(page: Page, state: ReturnType<typeof baseState>) {
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), state);
}

async function readState(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
}

test("completed cycle workout saves an immutable session and advances only its environment", async ({ page }) => {
  const state = baseState();
  state.cycleIndexByEnvironment.家里 = 0;
  await seed(page, state);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: /START 胸部基础/ }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  await expect.poll(async () => (await readState(page)).sessions.length, { timeout: 7_000 }).toBe(1);

  const saved = await readState(page);
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0]).toMatchObject({ source: "cycle", environmentId: "健身房", planId: "chest", completed: true });
  expect(saved.sessions[0].exercises[0].completedSets[0]).toMatchObject({ setNumber: 1, actualReps: 1, weight: 20, completed: true });
  expect(saved.cycleIndexByEnvironment.健身房).toBe(1);
  expect(saved.cycleIndexByEnvironment.家里).toBe(0);
  expect(saved.activeWorkout.phase).toBe("cooldown");
});

test("recommended and custom recovered workouts save their source without advancing NEXT", async ({ page }) => {
  for (const source of ["recommended", "custom"] as const) {
    const state = baseState();
    state.activeWorkout = {
      id: `session-${source}`,
      source,
      environmentId: "健身房",
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      planName: source === "recommended" ? "推荐训练" : "自定义临时训练",
      exercises: [smith],
      exerciseIndex: 0,
      setNumber: 1,
      targetReps: 1,
      weight: 20,
      stage: "active",
      restRemaining: 90,
      paused: false,
      completedSets: {},
    } as never;
    await seed(page, state);
    await page.goto("/?flow=training");
    await expect(page.getByText("训练已完成并保存")).toBeVisible({ timeout: 4_000 });
    const saved = await readState(page);
    expect(saved.sessions.at(-1).source).toBe(source);
    expect(saved.cycleIndexByEnvironment.健身房).toBe(0);
    await page.context().clearCookies();
  }
});

test("cancelling a workout clears progress without a session or cycle advance", async ({ page }) => {
  await seed(page, baseState());
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: /START 胸部基础/ }).click();
  await expect(page.locator(".training-screen")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator(".active-content")).toBeVisible({ timeout: 6_000 });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "结束训练" }).click();
  await page.getByRole("button", { name: "提前结束训练" }).click();
  await expect(page.getByText("没有已完成组，未生成训练记录")).toBeVisible();
  const saved = await readState(page);
  expect(saved.sessions).toHaveLength(0);
  expect(saved.cycleIndexByEnvironment.健身房).toBe(0);
  expect(saved.activeWorkout).toBeNull();
});

test("refresh restores an unfinished transition instead of completing it", async ({ page }) => {
  const state = baseState();
  state.activeWorkout = {
    id: "session-resume",
    source: "cycle",
    environmentId: "健身房",
    startedAt: new Date().toISOString(),
    planId: "chest",
    planName: "胸部基础",
    exercises: [{ ...smith, sets: 1 }, { ...smith, id: "incline", name: "上斜哑铃卧推" }],
    exerciseIndex: 0,
    setNumber: 1,
    targetReps: 1,
    weight: 20,
    stage: "transition",
    restRemaining: 90,
    paused: false,
    completedSets: { "0": [{ setNumber: 1, targetReps: 1, actualReps: 1, weight: 20, completed: true }] },
  } as never;
  await seed(page, state);
  await page.goto("/?flow=training");
  await expect(page.getByRole("heading", { name: "上斜哑铃卧推" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "上斜哑铃卧推" })).toBeVisible();
  const saved = await readState(page);
  expect(saved.sessions).toHaveLength(0);
  expect(saved.cycleIndexByEnvironment.健身房).toBe(0);
});

test("rest parameter editing pauses and resumes the remaining countdown", async ({ page }) => {
  const state = baseState();
  state.activeWorkout = {
    id: "session-rest",
    source: "cycle",
    environmentId: "健身房",
    startedAt: new Date().toISOString(),
    planId: "chest",
    planName: "胸部基础",
    exercises: [{ ...smith, sets: 2 }],
    exerciseIndex: 0,
    setNumber: 1,
    targetReps: 10,
    weight: 20,
    stage: "rest",
    restRemaining: 55,
    paused: false,
    completedSets: { "0": [{ setNumber: 1, targetReps: 10, actualReps: 10, weight: 20, completed: true }] },
  } as never;
  await seed(page, state);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: /^下一组/ }).click();
  await expect(page.getByRole("heading", { name: "调整下一组" })).toBeVisible();
  await expect(page.getByText(/已暂停计时/)).toHaveCount(0);
  await expect(page.getByText("修正上一组实际次数")).toHaveCount(0);
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.getByRole("button", { name: "增加下一组重量" }).click();
  await expect(page.locator(".rest-parameter-row").first()).toContainText("11");
  const pausedRemaining = (await readState(page)).activeWorkout.restRemaining;
  await page.waitForTimeout(1_000);
  expect((await readState(page)).activeWorkout.restRemaining).toBe(pausedRemaining);
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect.poll(async () => (await readState(page)).activeWorkout.nextSetAdjustment?.targetReps).toBe(11);
  expect((await readState(page)).activeWorkout.targetReps).toBe(10);
  expect((await readState(page)).activeWorkout.nextSetAdjustment?.weight).toBe(20.5);
  expect((await readState(page)).activeWorkout.weight).toBe(20);
  await page.waitForTimeout(1_200);
  expect((await readState(page)).activeWorkout.restRemaining).toBeLessThan(pausedRemaining);
});

test("history supports multiple sessions on one day and does not depend on current plans", async ({ page }) => {
  const state = baseState();
  const now = new Date();
  const completedSets = [{ setNumber: 1, targetReps: 10, actualReps: 9, weight: 22.5, completed: true }];
  state.sessions = ["one", "two"].map((id, index) => ({
    id,
    source: index ? "custom" : "cycle",
    environmentId: "健身房",
    startedAt: new Date(now.getTime() - (index + 2) * 60_000).toISOString(),
    endedAt: new Date(now.getTime() - index * 60_000).toISOString(),
    planId: index ? undefined : "deleted-plan",
    planName: index ? "自定义临时训练" : "已删除方案的历史快照",
    completed: true,
    exercises: [{ ...smith, name: index ? "Smith 卧推" : "历史动作名称", completedSets }],
  })) as never;
  state.plans = [];
  state.cycleIdsByEnvironment.健身房 = [];
  await seed(page, state);
  await page.goto("/?flow=records");
  await expect(page.locator(".session-card")).toHaveCount(2);
  await expect(page.getByText("历史动作名称")).toBeVisible();
  await expect(page.getByText("9 次", { exact: false }).first()).toBeVisible();
  const selectedDay = page.locator(".week-grid button.selected");
  expect(await selectedDay.locator(".weekday-label").evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(183, 255, 25)");
  expect(await selectedDay.locator(".date-number").evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(255, 71, 80)");
  await page.locator(".records-screen .mobile-scroll").evaluate((node) => node.scrollTo({ top: 430, behavior: "instant" }));
  await page.addStyleTag({ content: ".phone-bezel{clip-path:inset(70px 192px 861px 192px)!important}.device-screen{border-radius:0!important;box-shadow:none!important}" });
  const screen = await page.getByTestId("device-screen").boundingBox();
  await page.screenshot({ path: "reports/ritmo-feedback-v1-qa/records-history-after.png", clip: { x: screen!.x, y: screen!.y, width: 393, height: 852 } });
});
