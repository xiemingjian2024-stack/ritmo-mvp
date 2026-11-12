import { expect, test, type Page } from "@playwright/test";
import { getExerciseSpec } from "../src/exerciseCatalog";
import { extendedById, isExtendedHomeEligible } from "../src/extendedExerciseCatalog";
import { mediaForExercise } from "../src/exerciseMedia";

// Ten source-description-checked variants across five body parts, body weight,
// dumbbells, cable, barbell and fixed machines. None is treated as professionally reviewed.
const samples = [
  { id: "hasan:0025", tab: "胸", environment: "健身房" },
  { id: "hasan:0258", tab: "胸", environment: "家里" },
  { id: "hasan:0861", tab: "背", environment: "健身房" },
  { id: "hasan:0293", tab: "背", environment: "家里" },
  { id: "hasan:0392", tab: "肩", environment: "健身房" },
  { id: "hasan:0380", tab: "肩", environment: "家里" },
  { id: "hasan:0241", tab: "手臂", environment: "健身房" },
  { id: "hasan:0294", tab: "手臂", environment: "家里" },
  { id: "hasan:0585", tab: "腿", environment: "健身房" },
  { id: "hasan:1757", tab: "腿", environment: "家里" },
] as const;

function emptyState() {
  return {
    currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [],
    cycleIdsByEnvironment: { 健身房: [], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: false, 家里: false }, sessions: [], activeWorkout: null,
  };
}

async function seed(page: Page, state: object) {
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), state);
}

test("home picker shows body weight and dumbbells but excludes hidden benches and bars", async ({ page }) => {
  await seed(page, { ...emptyState(), currentEnvironment: "家里" });
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: /自定义训练/ }).click();
  await page.getByRole("button", { name: "搜索动作" }).click();
  const search = page.getByPlaceholder("搜索中文、英文或别名");
  await search.fill("dumbbell decline fly");
  await expect(page.locator(".library-list")).toContainText("当前筛选下暂无动作");
  await page.getByRole("button", { name: "仅当前环境可用" }).click();
  await expect(page.locator(".library-list")).toContainText("dumbbell decline fly");
  await page.getByRole("button", { name: "仅当前环境可用" }).click();
  await search.fill("clock push-up");
  await expect(page.locator(".library-list")).toContainText("交替转体俯卧撑");
  await page.locator(".muscle-tabs").getByRole("button", { name: "肩", exact: true }).click();
  await search.fill("dumbbell lateral raise");
  await expect(page.locator(".library-list")).toContainText("dumbbell lateral raise");
});

test("ten Extended variants can be selected into a custom plan and parameters edited", async ({ page }) => {
  test.setTimeout(90_000);
  await seed(page, emptyState());
  await page.goto("/?flow=plans");
  await page.locator(".scheme-heading button").click();
  await page.getByRole("button", { name: "创建自定义方案" }).click();
  await page.getByRole("button", { name: /添加动作/ }).click();
  await page.getByRole("button", { name: "搜索动作" }).click();
  const search = page.getByPlaceholder("搜索中文、英文或别名");
  for (const [index, sample] of samples.entries()) {
    const entry = extendedById.get(sample.id)!;
    if (index > 0 && sample.tab !== samples[index - 1].tab) {
      await page.locator(".muscle-tabs").getByRole("button", { name: sample.tab, exact: true }).click();
    }
    await search.fill(entry.name);
    const displayName = getExerciseSpec(sample.id)!.name;
    const exact = page.locator(".library-list button").filter({ has: page.locator("b").filter({ hasText: new RegExp(`^${displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }) });
    await expect(exact).toHaveCount(1);
    await exact.click();
  }
  await page.getByRole("button", { name: "添加已选动作 · 10" }).click();
  await expect(page.locator(".detail-exercise-row")).toHaveCount(10);
  await expect(page.locator(".detail-exercise-row").first()).toContainText("重量未设置");
  await page.locator(".detail-exercise-row .exercise-main").first().click();
  const editor = page.locator(".bottom-sheet:has(.plan-parameter-editor)");
  await editor.getByRole("button", { name: "增加组数" }).click();
  await editor.getByRole("button", { name: "增加目标次数" }).click();
  await editor.getByRole("button", { name: "增加训练重量" }).click();
  await editor.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("button", { name: "保存方案" }).click();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(data.plans).toHaveLength(1);
  expect(data.plans[0].exercises.map((item: { id: string }) => item.id)).toEqual(samples.map((item) => item.id));
  expect(data.plans[0].exercises[0]).toMatchObject({ sets: 4, reps: 11, weight: 0.5 });
  expect(data.sessions).toHaveLength(0);
});

test("ten Extended actions complete a real cycle with rest, pause, NEXT and history", async ({ page }) => {
  test.setTimeout(120_000);
  const exercises = samples.map(({ id }, index) => ({
    ...getExerciseSpec(id)!, sets: index === 0 ? 2 : 1, reps: 1,
    restSeconds: index === 0 ? 15 : 90, weight: getExerciseSpec(id)!.equipment === "body weight" ? 0 : 5,
  }));
  const state = {
    ...emptyState(),
    plans: [
      { id: "extended-cycle", name: "扩展动作验收", environment: "健身房", exercises },
      { id: "next-cycle", name: "下一方案", environment: "健身房", exercises: [{ ...getExerciseSpec("smith")!, sets: 1, reps: 1 }] },
    ],
    cycleIdsByEnvironment: { 健身房: ["extended-cycle", "next-cycle"], 家里: [] },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false },
  };
  await seed(page, state);
  await page.goto("/?flow=training");
  await expect(page.locator(".training-next-photo-placeholder")).toBeVisible();
  await page.getByRole("button", { name: "START 扩展动作验收" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator(".rest-mode")).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await expect(page.getByRole("button", { name: "继续训练" })).toBeVisible();
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "+15 秒" }).click();
  await page.getByRole("button", { name: "提前开始下一组" }).click();
  await expect(page.locator(".transition-screen")).toBeVisible({ timeout: 8_000 });
  for (let index = 1; index < samples.length; index += 1) {
    await expect(page.locator(".transition-screen h1")).toHaveText(getExerciseSpec(samples[index].id)!.name);
    if (mediaForExercise(samples[index].id).animation) await expect(page.locator('.transition-art video')).toBeVisible();
    else await expect(page.locator(".transition-placeholder")).toBeVisible();
    await page.getByRole("button", { name: "START", exact: true }).click();
    if (index < samples.length - 1) await expect(page.locator(".transition-screen")).toBeVisible({ timeout: 8_000 });
  }
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}").sessions?.length ?? 0), { timeout: 8_000 }).toBe(1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(saved.sessions[0]).toMatchObject({ status: "completed", planId: "extended-cycle", environmentId: "健身房" });
  expect(saved.sessions[0].exercises.map((item: { id: string }) => item.id)).toEqual(samples.map((item) => item.id));
  expect(saved.sessions[0].exercises.map((item: { completedSets: unknown[] }) => item.completedSets.length)).toEqual([2, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  expect(saved.sessions[0].exercises[0].completedSets[0]).toMatchObject({ weight: 5, weightStatus: "specified" });
  expect(saved.sessions[0].exercises[1].completedSets[0]).toMatchObject({ weight: 0, weightStatus: "bodyweight" });
  expect(saved.cycleIndexByEnvironment.健身房).toBe(1);
  await page.getByRole("button", { name: "START" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个拉伸阶段" }).click();
  await page.getByRole("button", { name: "确认结束拉伸并查看记录" }).click();
  await expect(page.locator(".records-screen")).toBeVisible();
  await expect(page.locator(".session-card")).toContainText("扩展动作验收");
  for (const { id } of samples) await expect(page.locator(".session-card")).toContainText(getExerciseSpec(id)!.name);
});

test("curated held side bridge records seconds, not a guessed repetition", async ({ page }) => {
  test.setTimeout(20_000);
  const sideBridge = { ...getExerciseSpec("hasan:0705")!, sets: 1, targetDurationSeconds: 1 };
  expect(isExtendedHomeEligible(extendedById.get("hasan:0705")!)).toBe(true);
  await seed(page, { ...emptyState(), currentEnvironment: "家里", plans: [{ id: "timed", name: "侧桥测试", environment: "家里", exercises: [sideBridge] }], cycleIdsByEnvironment: { 健身房: [], 家里: ["timed"] }, cycleEnabledByEnvironment: { 健身房: false, 家里: true } });
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "START 侧桥测试" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}").sessions?.length ?? 0), { timeout: 8_000 }).toBe(1);
  const set = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}").sessions[0].exercises[0].completedSets[0]);
  expect(set).toMatchObject({ measurementType: "duration", recordedDurationSeconds: 1, recordedReps: 0, weight: 0 });
});

test("unconfigured external machine weight is traceable as missing, never claimed as bodyweight", async ({ page }) => {
  const bench = { ...getExerciseSpec("hasan:0025")!, sets: 1, reps: 1 };
  await seed(page, { ...emptyState(), plans: [{ id: "unconfigured", name: "重量待设置", environment: "健身房", exercises: [bench] }], cycleIdsByEnvironment: { 健身房: ["unconfigured"], 家里: [] }, cycleEnabledByEnvironment: { 健身房: true, 家里: false } });
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "START 重量待设置" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}").sessions?.length ?? 0), { timeout: 8_000 }).toBe(1);
  const set = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}").sessions[0].exercises[0].completedSets[0]);
  expect(set).toMatchObject({ weight: 0, weightStatus: "unspecified" });
  await page.getByRole("button", { name: "START" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个拉伸阶段" }).click();
  await page.getByRole("button", { name: "确认结束拉伸并查看记录" }).click();
  await expect(page.locator(".records-screen")).toBeVisible();
  await expect(page.locator(".session-card")).not.toContainText("kg");
  await expect(page.locator(".session-card")).not.toContainText("徒手");
});
