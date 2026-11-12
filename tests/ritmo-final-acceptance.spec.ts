import { expect, test, type Page } from "@playwright/test";

const exercise = { id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 2, reps: 10, weight: 20 };
const completedSet = { setNumber: 1, targetReps: 10, recordedReps: 10, actualReps: 10, repsSource: "default", weight: 20, completed: true };

function state() {
  return {
    currentEnvironment: "健身房",
    environments: ["健身房", "家里"],
    plans: [{ id: "chest", name: "胸部基础", environment: "健身房", exercises: [exercise] }],
    cycleIdsByEnvironment: { 健身房: ["chest"], 家里: [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false },
    sessions: [] as unknown[],
    activeWorkout: null as unknown,
  };
}

async function seed(page: Page, value: ReturnType<typeof state>) {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("ritmo-demo-v3")) localStorage.setItem("ritmo-demo-v3", JSON.stringify(data));
  }, value);
}

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
}

test("90-second rest lasts 90 real seconds before advancing one set", async ({ page }) => {
  test.setTimeout(110_000);
  const value = state();
  const longSet = { ...exercise, reps: 1000 };
  value.plans[0].exercises = [longSet];
  value.activeWorkout = {
    id: "real-rest", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(),
    planId: "chest", planName: "胸部基础", exercises: [longSet], exerciseIndex: 0, setNumber: 1,
    targetReps: 1000, weight: 20, stage: "rest", restRemaining: 90, paused: false,
    completedSets: { "0": [{ ...completedSet, targetReps: 1000, recordedReps: 1000, actualReps: 1000 }] },
  };
  await seed(page, value);
  await page.goto("/?flow=training");
  await expect(page.locator(".rest-timer")).toContainText("01:30");
  const visibleAt = Date.now();
  await page.locator(".active-content").waitFor({ timeout: 95_000 });
  const elapsedMs = Date.now() - visibleAt;
  console.log(`REAL_REST_ELAPSED_MS=${elapsedMs}`);
  expect(elapsedMs).toBeGreaterThanOrEqual(88_000);
  expect(elapsedMs).toBeLessThanOrEqual(93_000);
  const data = await saved(page);
  expect(data.activeWorkout.setNumber).toBe(2);
  expect(data.sessions).toHaveLength(0);
});

test("rest deadline survives +15, background, refresh, pause, cancelled edits and resume", async ({ page }) => {
  const value = state();
  value.activeWorkout = {
    id: "rest-resume", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(),
    planId: "chest", planName: "胸部基础", exercises: [exercise], exerciseIndex: 0, setNumber: 1,
    targetReps: 10, weight: 20, stage: "rest", restRemaining: 30, paused: false,
    completedSets: { "0": [completedSet] },
  };
  await seed(page, value);
  await page.goto("/?flow=training");
  await expect(page.locator(".rest-timer")).toContainText("00:30");
  await page.getByRole("button", { name: "+15 秒" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.restRemaining).toBeGreaterThanOrEqual(44);
  const afterAdd = (await saved(page)).activeWorkout.restRemaining;
  const background = await page.context().newPage();
  await background.bringToFront();
  await page.waitForTimeout(2_400);
  await page.bringToFront();
  await expect.poll(async () => (await saved(page)).activeWorkout.restRemaining).toBeLessThanOrEqual(afterAdd - 2);
  await background.close();
  const beforeReload = (await saved(page)).activeWorkout.restRemaining;
  await page.reload();
  await expect.poll(async () => (await saved(page)).activeWorkout.restRemaining).toBeLessThanOrEqual(beforeReload);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  const pausedRemaining = (await saved(page)).activeWorkout.restRemaining;
  await page.waitForTimeout(1_500);
  expect((await saved(page)).activeWorkout.restRemaining).toBe(pausedRemaining);
  await page.getByRole("button", { name: "调整参数" }).click();
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.keyboard.press("Escape");
  expect((await saved(page)).activeWorkout.targetReps).toBe(10);
  expect((await saved(page)).activeWorkout.paused).toBe(true);
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.restRemaining).toBeLessThan(pausedRemaining);
  expect((await saved(page)).sessions).toHaveLength(0);
});

test("3-2-1 uses real seconds and does not create a session during preparation", async ({ page }) => {
  await seed(page, state());
  await page.goto("/?flow=training");
  await page.locator(".training-next-start").click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  const startedAt = Date.now();
  await page.locator(".active-content").waitFor({ timeout: 5_000 });
  const elapsedMs = Date.now() - startedAt;
  console.log(`REAL_PREPARE_ELAPSED_MS=${elapsedMs}`);
  expect(elapsedMs).toBeGreaterThanOrEqual(2_500);
  expect(elapsedMs).toBeLessThanOrEqual(4_000);
  const data = await saved(page);
  expect(data.sessions).toHaveLength(0);
  expect(data.cycleIndexByEnvironment.健身房).toBe(0);
});

test("rapid repeated early-finish click creates at most one partial session", async ({ page }) => {
  const value = state();
  value.activeWorkout = {
    id: "double-submit", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(),
    planId: "chest", planName: "胸部基础", exercises: [exercise], exerciseIndex: 0, setNumber: 1,
    targetReps: 10, weight: 20, stage: "rest", restRemaining: 60, paused: true,
    completedSets: { "0": [completedSet] },
  };
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "结束训练" }).click();
  await page.getByRole("button", { name: "提前结束训练" }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).sessions.length).toBe(1);
  const data = await saved(page);
  expect(data.sessions[0].status).toBe("partial");
  expect(data.cycleIndexByEnvironment.健身房).toBe(0);
  await page.reload();
  expect((await saved(page)).sessions).toHaveLength(1);
});
