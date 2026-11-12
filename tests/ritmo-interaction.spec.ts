import { expect, test, type Page } from "@playwright/test";

const smith = { id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 2, reps: 10, weight: 20 };
const completed = { setNumber: 1, targetReps: 10, actualReps: 10, weight: 20, completed: true };
function state() {
  return {
    currentEnvironment: "健身房", environments: ["健身房", "家里", "公园"],
    plans: [{ id: "chest", name: "胸部基础", environment: "健身房", exercises: [smith] }],
    cycleIdsByEnvironment: { 健身房: ["chest"], 家里: [], 公园: [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0, 公园: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false, 公园: false },
    sessions: [] as unknown[], activeWorkout: null as unknown,
  };
}
async function seed(page: Page, value: ReturnType<typeof state>) {
  await page.addInitScript((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), value);
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}")); }

test("early finish saves completed sets only and never advances NEXT", async ({ page }) => {
  const value = state();
  value.plans.push({ id: "back", name: "背部训练", environment: "健身房", exercises: [{ ...smith, id: "row", name: "坐姿划船" }] });
  value.cycleIdsByEnvironment.健身房.push("back");
  value.activeWorkout = { id: "partial-one", source: "cycle", environmentId: "健身房", startedAt: new Date(Date.now() - 30_000).toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 1, targetReps: 10, weight: 20, stage: "rest", restRemaining: 90, paused: true, completedSets: { "0": [completed] } };
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "结束训练" }).click();
  await page.getByRole("button", { name: "提前结束训练" }).click();
  await expect(page.getByText("已保存提前结束的训练")).toBeVisible();
  const data = await saved(page);
  expect(data.sessions).toHaveLength(1);
  expect(data.sessions[0]).toMatchObject({ status: "partial", completed: false, source: "cycle" });
  expect(data.sessions[0].exercises[0].completedSets).toHaveLength(1);
  expect(data.cycleIndexByEnvironment.健身房).toBe(0);
  expect(data.activeWorkout).toBeNull();
  await expect(page.locator(".records-screen")).toBeVisible();
  await expect(page.locator(".session-card")).toContainText("胸部基础");
  await expect(page.locator(".session-card")).not.toContainText("提前结束");
});

test("empty early finish cannot create a partial session", async ({ page }) => {
  const value = state();
  value.activeWorkout = { id: "empty", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 1, targetReps: 10, weight: 20, stage: "active", restRemaining: 90, paused: true, completedSets: {} };
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "结束训练" }).click();
  await page.getByRole("button", { name: "提前结束训练" }).click();
  await expect(page.getByRole("button", { name: "确认放弃训练" })).toHaveCount(0);
  await expect(page.getByText("没有已完成组，未生成训练记录")).toBeVisible();
  expect((await saved(page)).sessions).toHaveLength(0);
});

test("early finish discards the unfinished current set", async ({ page }) => {
  const value = state();
  value.activeWorkout = { id: "during-set", source: "cycle", environmentId: "健身房", startedAt: new Date(Date.now() - 30_000).toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 2, targetReps: 10, weight: 20, stage: "active", restRemaining: 90, paused: true, completedSets: { "0": [completed] } };
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "结束训练" }).click();
  await page.getByRole("button", { name: "提前结束训练" }).click();
  await expect.poll(async () => (await saved(page)).sessions.length).toBe(1);
  const sets = (await saved(page)).sessions[0].exercises[0].completedSets;
  expect(sets).toHaveLength(1);
  expect(sets[0].setNumber).toBe(1);
});

test("rest clock respects real time and +15 seconds", async ({ page }) => {
  const value = state();
  value.activeWorkout = { id: "clock", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 1, targetReps: 10, weight: 20, stage: "rest", restRemaining: 90, paused: false, completedSets: { "0": [completed] } };
  await seed(page, value);
  await page.goto("/?flow=training");
  await expect(page.locator(".rest-timer")).toContainText("01:30");
  await page.waitForTimeout(1_200);
  const remaining = (await saved(page)).activeWorkout.restRemaining;
  expect(remaining).toBeGreaterThanOrEqual(88);
  expect(remaining).toBeLessThanOrEqual(89);
  await page.getByRole("button", { name: "+15 秒" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.restRemaining).toBeGreaterThanOrEqual(remaining + 14);
});

test("0 kg and zero rest are not restored as defaults", async ({ page }) => {
  const value = state();
  const bodyweight = { ...smith, id: "pushup", name: "俯卧撑", equipment: "徒手", weight: 0 };
  value.activeWorkout = { id: "zero", source: "custom", environmentId: "家里", startedAt: new Date().toISOString(), planName: "徒手训练", exercises: [bodyweight], exerciseIndex: 0, setNumber: 1, targetReps: 10, weight: 0, stage: "rest", restRemaining: 0, paused: true, completedSets: { "0": [completed] } };
  await seed(page, value);
  await page.goto("/?flow=training");
  const data = await saved(page);
  expect(data.activeWorkout.weight).toBe(0);
  expect(data.activeWorkout.restRemaining).toBe(0);
  await expect(page.locator(".rest-timer")).toContainText("00:00");
});

test("corrupt local data remains untouched", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ritmo-demo-v3", "{invalid"));
  await page.goto("/?flow=training");
  await expect(page.getByRole("alert")).toContainText("原始数据已保留");
  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe("{invalid");
});

test("incompatible structured data remains untouched", async ({ page }) => {
  const raw = JSON.stringify({ ...state(), sessions: [{ id: "broken", exercises: "not-an-array" }] });
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", value), raw);
  await page.goto("/?flow=records");
  await expect(page.getByRole("alert")).toContainText("原始数据已保留");
  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe(raw);
});

test("legacy completed sessions migrate reps provenance without losing history", async ({ page }) => {
  const value = state();
  value.sessions = [{ id: "legacy", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), planId: "chest", planName: "旧方案", completed: true, exercises: [{ ...smith, completedSets: [completed] }] }];
  await seed(page, value);
  await page.goto("/?flow=records");
  const data = await saved(page);
  expect(data.sessions[0]).toMatchObject({ id: "legacy", status: "completed", completed: true });
  expect(data.sessions[0].exercises[0].completedSets[0]).toMatchObject({ recordedReps: 10, repsSource: "default" });
});

test("storage write failure reports failure without claiming success", async ({ page }) => {
  await page.addInitScript((value) => { localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)); Storage.prototype.setItem = function () { throw new Error("quota"); }; }, state());
  await page.goto("/?flow=training");
  await expect(page.getByRole("alert")).toContainText("当前修改尚未保存");
  await page.getByRole("button", { name: /START 胸部基础/ }).click();
  await expect(page.locator(".training-screen")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("当前修改尚未保存");
});

test("environment with plans cannot be deleted or silently migrated", async ({ page }) => {
  const value = state();
  value.plans.push({ id: "park-plan", name: "公园训练", environment: "公园", exercises: [smith] });
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "设置" }).click();
  await page.getByRole("button", { name: "管理训练环境" }).click();
  await page.getByRole("button", { name: "删除公园" }).click();
  await expect(page.getByText("该环境仍有关联方案，请先处理方案")).toBeVisible();
  expect((await saved(page)).plans.find((plan: { id: string }) => plan.id === "park-plan").environment).toBe("公园");
});

test("renaming an environment preserves history references and still blocks deletion", async ({ page }) => {
  const value = state();
  value.sessions = [{ id: "park-history", source: "custom", environmentId: "公园", startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), planName: "公园训练", completed: true, exercises: [{ ...smith, completedSets: [completed] }] }];
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "设置" }).click();
  await page.getByRole("button", { name: "管理训练环境" }).click();
  await page.locator(".custom-environment-row input").fill("公园新");
  await page.locator(".custom-environment-row input").press("Tab");
  await expect.poll(async () => (await saved(page)).sessions[0].environmentId).toBe("公园新");
  await page.getByRole("button", { name: "删除公园新" }).click();
  await expect(page.getByText("该环境关联训练记录或未完成训练，不能删除")).toBeVisible();
});

test("manual correction changes reps source without changing the workout template", async ({ page }) => {
  const value = state();
  value.activeWorkout = { id: "manual-one", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 1, targetReps: 10, weight: 20, stage: "rest", restRemaining: 90, paused: true, completedSets: { "0": [completed] } };
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: /^下一组/ }).click();
  await page.getByText(/修正上一组次数/).click();
  await page.getByRole("button", { name: "减少上一组次数" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.completedSets["0"][0].recordedReps).toBe(9);
  expect((await saved(page)).activeWorkout.completedSets["0"][0].repsSource).toBe("manual");
  expect((await saved(page)).plans[0].exercises[0].reps).toBe(10);
});

test("save and continue closes the editor and resumes a previously paused rest timer", async ({ page }) => {
  const value = state();
  value.activeWorkout = { id: "resume-rest-edit", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 1, targetReps: 10, weight: 20, stage: "rest", restRemaining: 50, paused: true, completedSets: { "0": [completed] } };
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "调整参数" }).click();
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect(page.getByRole("heading", { name: "调整下一组" })).toHaveCount(0);
  await expect(page.locator(".rest-timer")).toBeVisible();
  await expect.poll(async () => (await saved(page)).activeWorkout.nextSetAdjustment?.targetReps).toBe(11);
  expect((await saved(page)).activeWorkout.targetReps).toBe(10);
  await expect.poll(async () => (await saved(page)).activeWorkout.paused).toBe(false);
  await expect.poll(async () => (await saved(page)).activeWorkout.restRemaining, { timeout: 3_000 }).toBeLessThan(50);
});

test("save and continue resumes active repetition counting", async ({ page }) => {
  const value = state();
  const exercise = { ...smith, reps: 30 };
  value.activeWorkout = { id: "resume-active-edit", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "chest", planName: "胸部基础", exercises: [exercise], exerciseIndex: 0, setNumber: 1, targetReps: 30, weight: 20, stage: "active", restRemaining: 90, paused: false, completedSets: {} };
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "调整参数" }).click();
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect(page.locator(".active-content")).toBeVisible();
  await expect(page.getByRole("heading", { name: "调整下一组" })).toHaveCount(0);
  await expect.poll(async () => (await saved(page)).activeWorkout.nextSetAdjustment?.targetReps).toBe(31);
  expect((await saved(page)).activeWorkout.targetReps).toBe(30);
  await expect.poll(async () => (await saved(page)).activeWorkout.paused).toBe(false);
  const rep = Number(await page.locator(".rep-count strong").textContent());
  await expect.poll(async () => Number(await page.locator(".rep-count strong").textContent()), { timeout: 3_000 }).toBeGreaterThan(rep);

});

test("last set control omits parameter editing", async ({ page }) => {
  const value = state();
  value.activeWorkout = { id: "last-set", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 2, targetReps: 10, weight: 20, stage: "active", restRemaining: 90, paused: true, completedSets: { "0": [completed] } };
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await expect(page.getByRole("button", { name: "调整参数" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "继续训练" })).toBeVisible();
  const sheetHeight = (await page.getByTestId("bottom-sheet").boundingBox())?.height ?? 0;
  const screenHeight = (await page.getByTestId("device-screen").boundingBox())?.height ?? 1;
  expect(sheetHeight / screenHeight).toBeLessThan(0.4);
});

test("deleting a saved plan leaves immutable history and removes cycle membership", async ({ page }) => {
  const value = state();
  value.sessions = [{ id: "history", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), planId: "chest", planName: "历史胸部基础", completed: true, exercises: [{ ...smith, completedSets: [completed] }] }];
  await seed(page, value);
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/?flow=plans");
  await page.getByRole("button", { name: /胸部基础/ }).first().click();
  await page.getByRole("button", { name: "删除方案" }).click();
  await expect.poll(async () => (await saved(page)).plans.length).toBe(0);
  const data = await saved(page);
  expect(data.cycleIdsByEnvironment.健身房).toHaveLength(0);
  expect(data.sessions).toHaveLength(1);
  expect(data.sessions[0].planName).toBe("历史胸部基础");
});

test("recommended workout starts with warmup, then uses an uninterrupted strength countdown", async ({ page }) => {
  const value = state();
  value.currentEnvironment = "家里";
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.locator(".home-recommendation-card").first().getByRole("button", { name: /START/ }).click();
  await expect(page.locator(".active-content")).toBeVisible();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator(".countdown-ring")).toBeVisible();
  await expect(page.getByRole("button", { name: "取消准备" })).toHaveCount(0);
  await expect(page.locator(".training-screen")).toBeVisible({ timeout: 4_000 });
  await expect(page.getByRole("button", { name: "暂停 / 调整" })).toBeVisible();
  const data = await saved(page);
  expect(data.sessions).toHaveLength(0);
  expect(data.cycleIndexByEnvironment.健身房).toBe(0);
});

test("custom temporary workout starts with warmup without saving a plan or advancing NEXT", async ({ page }) => {
  await seed(page, state());
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: /快速开始/ }).click();
  await page.getByRole("button", { name: /Smith 卧推/ }).click();
  await page.getByRole("button", { name: "添加已选动作 · 1" }).click();
  await expect(page.locator(".active-content")).toBeVisible();
  const data = await saved(page);
  expect(data.activeWorkout.source).toBe("custom");
  expect(data.plans).toHaveLength(1);
  expect(data.cycleIndexByEnvironment.健身房).toBe(0);
});

test("3-2-1 countdown lasts real seconds before the next action", async ({ page }) => {
  const value = state();
  value.currentEnvironment = "家里";
  await seed(page, value);
  await page.goto("/?flow=training");
  await page.locator(".home-recommendation-card").first().getByRole("button", { name: /START/ }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  await page.waitForTimeout(1_100);
  await expect(page.locator(".countdown-screen strong")).toHaveText("2");
  await expect(page.locator(".training-screen")).toBeVisible({ timeout: 3_000 });
});

test("paused rest keeps its remaining time after refresh", async ({ page }) => {
  const value = state();
  value.activeWorkout = { id: "paused-rest", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 1, targetReps: 10, weight: 20, stage: "rest", restRemaining: 42, paused: true, completedSets: { "0": [completed] } };
  await seed(page, value);
  await page.goto("/?flow=training");
  await expect(page.locator(".rest-timer")).toContainText("00:42");
  await page.reload();
  await page.waitForTimeout(1_200);
  await expect(page.locator(".rest-timer")).toContainText("00:42");
});

test("dragging cycle handle reorders without changing NEXT", async ({ page }) => {
  const value = state();
  value.plans.push({ id: "back", name: "背部训练", environment: "健身房", exercises: [{ ...smith, id: "row", name: "坐姿划船" }] });
  value.plans.push({ id: "legs", name: "腿部训练", environment: "健身房", exercises: [{ ...smith, id: "body-squat", name: "徒手深蹲" }] });
  value.cycleIdsByEnvironment.健身房.push("back", "legs");
  await seed(page, value);
  await page.goto("/?flow=plans");
  const handle = page.locator(".cycle-drag").first();
  await handle.click();
  await expect(page.getByText("管理训练循环")).toHaveCount(0);
  expect((await saved(page)).cycleIdsByEnvironment.健身房).toEqual(["chest", "back", "legs"]);
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(page.locator(".cycle-row").first()).toHaveClass(/dragging/);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 120, { steps: 8 });
  await expect(page.locator(".cycle-row").last()).toHaveClass(/drop-target/);
  await page.mouse.up();
  await expect.poll(async () => (await saved(page)).cycleIdsByEnvironment.健身房).toEqual(["back", "legs", "chest"]);
  const data = await saved(page);
  expect(data.cycleIdsByEnvironment.健身房[data.cycleIndexByEnvironment.健身房]).toBe("chest");
  await page.getByRole("button", { name: "从循环移出背部训练" }).click();
  await expect.poll(async () => (await saved(page)).cycleIdsByEnvironment.健身房).toEqual(["legs", "chest"]);
});

test("disabled cycle can be reopened without losing its members", async ({ page }) => {
  const value = state();
  value.cycleEnabledByEnvironment.健身房 = false;
  await seed(page, value);
  await page.goto("/?flow=plans");
  await expect(page.getByRole("button", { name: /训练循环已关闭/ })).toHaveCount(0);
  await page.getByRole("button", { name: /重新开启胸部基础的训练循环/ }).click();
  await expect.poll(async () => (await saved(page)).cycleEnabledByEnvironment.健身房).toBe(true);
  expect((await saved(page)).cycleIdsByEnvironment.健身房).toEqual(["chest"]);
});

test("cancelled exercise selection resets on reopen", async ({ page }) => {
  await seed(page, state());
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: /快速开始/ }).click();
  await page.getByRole("button", { name: /Smith 卧推/ }).click();
  await expect(page.getByRole("button", { name: "添加已选动作 · 1" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /快速开始/ }).click();
  await expect(page.getByRole("button", { name: "添加已选动作 · 0" })).toBeDisabled();
});

test("settings and calendar respond from every root page", async ({ page }) => {
  await seed(page, state());
  for (const flow of ["training", "plans", "records"]) {
    await page.goto(`/?flow=${flow}`);
    await page.getByRole("button", { name: "设置" }).click();
    await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();
    await page.getByRole("button", { name: "完成" }).click();
  }
  await page.getByRole("button", { name: "打开日历" }).click();
  await expect(page.getByRole("heading", { name: "选择历史日期" })).toBeVisible();
  await page.locator(".calendar-picker").dispatchEvent("pointerdown", { clientX: 100, clientY: 200, pointerId: 1 });
  await page.locator(".calendar-picker").dispatchEvent("pointerup", { clientX: 300, clientY: 200, pointerId: 1 });
  const previousMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15);
  await page.locator(".calendar-days").getByRole("button", { name: new RegExp(`15日`) }).click();
  await expect(page.locator(".recent-heading")).toContainText(`${previousMonth.getMonth() + 1} 月 15 日`);
});

test("one training button opens a resumable control sheet", async ({ page }) => {
  const value = state();
  value.activeWorkout = { id: "controls", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 1, targetReps: 10, weight: 20, stage: "active", restRemaining: 90, paused: false, completedSets: {} };
  await seed(page, value);
  await page.goto("/?flow=training");
  await expect(page.locator(".training-more")).toHaveCount(0);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await expect(page.locator(".pause-button")).toHaveText("继续训练");
  await expect(page.getByRole("button", { name: "继续训练" })).toBeVisible();
  const inset = await page.evaluate(() => { const sheet = document.querySelector(".bottom-sheet")!.getBoundingClientRect(); const action = document.querySelector(".training-control-actions .danger-button")!.getBoundingClientRect(); return [action.left - sheet.left, sheet.right - action.right]; });
  expect(inset[0]).toBeGreaterThanOrEqual(18);
  expect(inset[1]).toBeGreaterThanOrEqual(18);
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.getByRole("button", { name: "暂停 / 调整" })).toBeVisible();
});

test("history swipes exactly one week or month and rings use recorded sessions only", async ({ page }) => {
  const value = state();
  const recorded = new Date();
  recorded.setDate(recorded.getDate() - 7);
  value.sessions = [{ id: "week-record", source: "custom", environmentId: "健身房", startedAt: new Date(recorded.getTime() - 12 * 60_000).toISOString(), endedAt: recorded.toISOString(), planName: "历史训练", status: "completed", completed: true, exercises: [{ ...smith, completedSets: [completed] }] }];
  await seed(page, value);
  await page.goto("/?flow=records");
  const swipe = async (selector: string, from: number, to: number) => {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    const y = box!.y + Math.min(38, box!.height / 2);
    const startX = box!.x + box!.width * (from < to ? 0.25 : 0.75);
    const endX = box!.x + box!.width * (from < to ? 0.75 : 0.25);
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps: 6 });
    await page.mouse.up();
  };
  await expect(page.locator(".week-summary")).toHaveCount(0);
  await swipe(".week-grid", 100, 300);
  await expect(page.locator(".session-card")).toContainText("历史训练");
  await swipe(".week-grid", 100, 300);
  await expect(page.locator(".session-card")).toHaveCount(0);
  await swipe(".week-grid", 300, 100);
  await expect(page.locator(".session-card")).toContainText("历史训练");
  await swipe(".week-grid", 300, 100);
  await expect(page.locator(".session-card")).toHaveCount(0);
  await swipe(".week-grid", 300, 100);
  await expect(page.locator(".session-card")).toHaveCount(0);
  await page.getByRole("button", { name: "打开日历" }).click();
  await expect(page.getByRole("button", { name: "上个月" })).toHaveCount(0);
  await page.waitForTimeout(450);
  const currentMonth = await page.locator(".calendar-month").innerText();
  await swipe(".calendar-picker", 100, 300);
  await expect(page.locator(".calendar-month")).not.toHaveText(currentMonth);
  await swipe(".calendar-picker", 300, 100);
  await expect(page.locator(".calendar-month")).toHaveText(currentMonth);
  if (recorded.getMonth() !== new Date().getMonth() || recorded.getFullYear() !== new Date().getFullYear()) await swipe(".calendar-picker", 100, 300);
  const day = page.locator(".calendar-days").getByRole("button", { name: new RegExp(`${recorded.getDate()}日，有训练记录`) });
  await expect(day).toHaveClass(/trained/);
  await day.click();
  await expect(page.locator(".session-card")).toContainText("历史训练");
});
