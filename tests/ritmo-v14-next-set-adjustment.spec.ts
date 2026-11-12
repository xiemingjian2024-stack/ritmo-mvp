import { expect, test, type Page } from "@playwright/test";

const smith = { id: "smith", name: "史密斯卧推", muscle: "胸", equipment: "Smith 架", sets: 3, reps: 10, weight: 20 };
const plank = { id: "plank", name: "前臂平板支撑", muscle: "核心", equipment: "徒手", sets: 2, reps: 0, weight: 0, targetDurationSeconds: 8 };
const completed = { setNumber: 1, targetReps: 10, recordedReps: 10, actualReps: 10, repsSource: "default", weight: 20, completed: true };
type Exercise = typeof smith | typeof plank;
function seedData(exercise: Exercise, stage: "active" | "rest", options: { paused?: boolean; rest?: number; remaining?: number; rep?: number } = {}) {
  const timed = exercise.id === "plank";
  return {
    currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [{ id: "adjust-plan", name: "调整测试", environment: "健身房", exercises: [exercise] }],
    cycleIdsByEnvironment: { 健身房: ["adjust-plan"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [],
    activeWorkout: { id: "adjust-session", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(),
      planId: "adjust-plan", planName: "调整测试", exercises: [exercise], exerciseIndex: 0, setNumber: 1,
      rep: options.rep ?? 1, targetReps: exercise.reps, targetDurationSeconds: timed ? 8 : 0,
      activeRemainingSeconds: timed ? options.remaining ?? 8 : 0, weight: exercise.weight, stage,
      restRemaining: options.rest ?? 50, paused: options.paused ?? false,
      completedSets: stage === "rest" ? { "0": [completed] } : {},
    },
  };
}
async function load(page: Page, data: ReturnType<typeof seedData>) {
  await page.goto("/?flow=training");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), data);
  await page.reload();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}")); }

test("active edits affect only the next set, preserve current rhythm and survive refresh", async ({ page }, testInfo) => {
  const exercise = { ...smith, reps: 20 };
  await load(page, seedData(exercise, "active", { rep: 4 }));
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  const before = Number(await page.locator(".rep-count strong").textContent());
  await page.getByRole("button", { name: "调整参数" }).click();
  await expect(page.getByRole("heading", { name: "调整下一组" })).toBeVisible();
  await expect(page.getByTestId("bottom-sheet").getByText("第 2 / 3 组")).toBeVisible();
  await page.waitForTimeout(450);
  await page.mouse.move(20, 20);
  await page.screenshot({ path: testInfo.outputPath("active-next-set.png") });
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.getByRole("button", { name: "增加下一组重量" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect(page.locator(".active-content")).toBeVisible();
  await expect(page.locator(".countdown-screen")).toHaveCount(0);
  await expect.poll(async () => (await saved(page)).activeWorkout.nextSetAdjustment?.targetReps).toBe(21);
  let state = (await saved(page)).activeWorkout;
  expect(state.targetReps).toBe(20);
  expect(state.weight).toBe(20);
  expect(state.nextSetAdjustment.weight).toBe(20.5);
  expect(state.rep).toBeGreaterThanOrEqual(before);
  expect(state.paused).toBe(false);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  const pausedRep = Number(await page.locator(".rep-count strong").textContent());
  await page.reload();
  await expect(page.locator(".rep-count strong")).toHaveText(String(pausedRep));
  state = (await saved(page)).activeWorkout;
  expect(state.nextSetAdjustment).toMatchObject({ targetReps: 21, weight: 20.5 });
  expect(state.targetReps).toBe(20);
  expect(state.weight).toBe(20);
  expect(state.paused).toBe(true);
});

test("finishing the edited active set records its original target and weight", async ({ page }) => {
  await load(page, seedData({ ...smith, reps: 4 }, "active", { rep: 2 }));
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "调整参数" }).click();
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.getByRole("button", { name: "增加下一组重量" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect(page.locator(".rest-content")).toBeVisible({ timeout: 5_000 });
  let state = (await saved(page)).activeWorkout;
  expect(state.completedSets["0"][0]).toMatchObject({ setNumber: 1, targetReps: 4, recordedReps: 4, weight: 20 });
  expect(state.nextSetAdjustment).toMatchObject({ targetReps: 5, weight: 20.5 });
  await page.getByRole("button", { name: "提前开始下一组" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.setNumber).toBe(2);
  state = (await saved(page)).activeWorkout;
  expect(state.targetReps).toBe(5);
  expect(state.weight).toBe(20.5);
  expect(state.completedSets["0"][0]).toMatchObject({ setNumber: 1, targetReps: 4, recordedReps: 4, weight: 20 });
});

test("rest cancellation discards drafts; save resumes remaining time and next set consumes the adjustment", async ({ page }, testInfo) => {
  await load(page, seedData(smith, "rest", { rest: 50 }));
  await page.getByRole("button", { name: /^下一组/ }).click();
  await expect(page.getByTestId("bottom-sheet").getByText("第 2 / 3 组")).toBeVisible();
  const frozen = (await saved(page)).activeWorkout.restRemaining;
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.getByRole("button", { name: "增加下一组重量" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "调整下一组" })).toHaveCount(0);
  await page.waitForTimeout(1_100);
  let state = (await saved(page)).activeWorkout;
  expect(state.restRemaining).toBe(frozen);
  expect(state.paused).toBe(true);
  expect(state.nextSetAdjustment).toBeNull();
  expect(state.completedSets["0"][0]).toMatchObject(completed);

  await page.getByRole("button", { name: /^下一组/ }).click();
  await expect(page.locator(".rest-parameter-row").first()).toContainText("10");
  await page.waitForTimeout(450);
  await page.mouse.move(20, 20);
  await page.screenshot({ path: testInfo.outputPath("rest-next-set.png") });
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.getByRole("button", { name: "增加下一组重量" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.nextSetAdjustment?.targetReps).toBe(11);
  state = (await saved(page)).activeWorkout;
  expect(state.targetReps).toBe(10);
  expect(state.weight).toBe(20);
  expect(state.completedSets["0"][0]).toMatchObject(completed);
  expect(state.paused).toBe(false);
  await expect.poll(async () => (await saved(page)).activeWorkout.restRemaining, { timeout: 3_000 }).toBeLessThan(frozen);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.paused).toBe(true);
  const beforeReload = (await saved(page)).activeWorkout.restRemaining;
  await page.reload();
  state = (await saved(page)).activeWorkout;
  expect(state.paused).toBe(true);
  expect(state.restRemaining).toBe(beforeReload);
  expect(state.nextSetAdjustment).toMatchObject({ targetReps: 11, weight: 20.5 });
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "提前开始下一组" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.setNumber).toBe(2);
  state = (await saved(page)).activeWorkout;
  expect(state.targetReps).toBe(11);
  expect(state.weight).toBe(20.5);
  expect(state.nextSetAdjustment).toBeNull();
  expect(state.completedSets["0"][0]).toMatchObject(completed);
});

test("manual pause stays safe on cancel; explicit save and continue resumes", async ({ page }) => {
  await load(page, seedData(smith, "rest", { paused: true, rest: 42 }));
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "调整参数" }).click();
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await saved(page)).activeWorkout.paused).toBe(true);
  expect((await saved(page)).activeWorkout.nextSetAdjustment).toBeNull();
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "调整参数" }).click();
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.paused).toBe(false);
  await expect.poll(async () => (await saved(page)).activeWorkout.nextSetAdjustment?.targetReps).toBe(11);
});

test("timed next-set edit leaves current remaining time unchanged and applies only after rest", async ({ page }) => {
  await load(page, seedData(plank, "active", { paused: true, remaining: 4 }));
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "调整参数" }).click();
  await page.getByRole("button", { name: "增加下一组秒数" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout?.nextSetAdjustment?.targetDurationSeconds).toBe(9);
  let state = (await saved(page)).activeWorkout;
  expect(state.targetDurationSeconds).toBe(8);
  expect(state.activeRemainingSeconds).toBeLessThanOrEqual(4);
  expect(state.nextSetAdjustment.targetDurationSeconds).toBe(9);
  await expect(page.locator(".rest-content")).toBeVisible({ timeout: 6_000 });
  await expect(page.getByRole("button", { name: /^下一组 9 秒/ })).toBeVisible();
  await page.getByRole("button", { name: "提前开始下一组" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.setNumber).toBe(2);
  state = (await saved(page)).activeWorkout;
  expect(state.targetDurationSeconds).toBe(9);
  expect(state.activeRemainingSeconds).toBeLessThanOrEqual(9);
  expect(state.completedSets["0"][0].targetDurationSeconds).toBe(8);
  expect(state.completedSets["0"][0].recordedDurationSeconds).toBe(8);
});
