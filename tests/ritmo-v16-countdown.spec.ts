import { expect, test, type Page } from "@playwright/test";

const storeKey = "ritmo-demo-v3";
const smith = { id: "smith", name: "史密斯卧推", muscle: "胸", equipment: "Smith 架", sets: 2, reps: 100, weight: 20, restSeconds: 1 };
const row = { id: "row", name: "坐姿划船", muscle: "背", equipment: "坐姿划船机", sets: 1, reps: 100, weight: 20 };
const warmupIds = ["ritmo:warmup:shoulder-circles", "ritmo:warmup:low-high-chest-squeeze"];
const cooldownIds = ["ritmo:stretch:doorway-single-arm-chest"];
const now = new Date().toISOString();
const plan = { id: "countdown-plan", name: "倒计时测试", environment: "健身房", exercises: [smith, row] };

function data(activeWorkout: Record<string, unknown> | null = null) {
  return { dataVersion: 2, currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [plan], cycleIdsByEnvironment: { 健身房: [plan.id], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [], activeWorkout };
}
function active(phase: "warmup" | "strength" | "cooldown", stage: string, overrides: Record<string, unknown> = {}) {
  return { id: "countdown-run", source: "cycle", environmentId: "健身房", startedAt: now, planId: plan.id, planName: plan.name, exercises: plan.exercises, exerciseIndex: phase === "strength" ? 0 : -1, setNumber: 1, rep: 1, targetReps: 100, targetDurationSeconds: 0, activeRemainingSeconds: 0, activeDeadlineAt: null, weight: 20, nextSetAdjustment: null, stage, phase, primaryGroup: "胸", warmupIds, cooldownIds, phaseItemIndex: 0, phaseSegmentIndex: 0, phaseRemaining: 10, phaseDeadlineAt: null, phaseAccumulated: 0, phaseHadEarly: false, restRemaining: 1, restDeadlineAt: null, paused: false, completedSets: {}, ...overrides };
}
async function load(page: Page, value: object) {
  await page.goto("/?flow=training");
  await page.evaluate(([key, state]) => localStorage.setItem(key, JSON.stringify(state)), [storeKey, value] as const);
  await page.reload();
}
async function saved(page: Page) { return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), storeKey); }

test("new warmup, strength and cooldown starts share 3-2-1; refresh during countdown returns to ready", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await load(page, data());
  await page.getByRole("button", { name: /START/ }).first().click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  await expect.poll(async () => (await saved(page)).activeWorkout?.stage).toBe("phase-intro");
  expect((await saved(page)).activeWorkout.phase).toBe("warmup");
  await page.reload();
  await expect(page.getByRole("button", { name: "START" })).toBeVisible();
  expect((await saved(page)).sessions).toHaveLength(0);
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  await expect(page.locator(".countdown-screen strong")).toHaveText("2");
  expect((await saved(page)).activeWorkout.phaseRemaining).toBe(12);
  expect((await saved(page)).activeWorkout.rep).toBe(1);
  expect((await saved(page)).sessions).toHaveLength(0);
  await expect(page.locator(".countdown-screen strong")).toHaveText("1");
  await expect(page.getByRole("heading", { name: "徒手站姿胸前开合" })).toBeVisible();

  await load(page, data(active("warmup", "phase-ready")));
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  await expect(page.getByRole("heading", { name: "轻哑铃站姿低位夹胸" })).toBeVisible();

  await load(page, data(active("warmup", "phase-ready", { phaseItemIndex: 1 })));
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  await expect(page.getByRole("heading", { name: "史密斯卧推" })).toBeVisible();

  await load(page, data(active("strength", "transition", { exerciseIndex: 0 })));
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  await expect(page.getByRole("heading", { name: "坐姿划船" })).toBeVisible();

  await load(page, data(active("cooldown", "phase-intro")));
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  expect((await saved(page)).activeWorkout.stage).toBe("phase-intro");
  await expect(page.getByRole("heading", { name: "门框单臂胸肌拉伸" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("cooldown-active.png") });
});

test("rest, pause/resume and automatic side switch never start 3-2-1", async ({ page }) => {
  test.setTimeout(30_000);
  await load(page, data(active("strength", "rest", { exerciseIndex: 0, restRemaining: 1, restDeadlineAt: Date.now() + 1000 })));
  await expect(page.getByRole("heading", { name: "史密斯卧推" })).toBeVisible();
  await expect(page.getByText("第 2 / 2 组")).toBeVisible({ timeout: 5_000 });
  await expect(page.locator(".countdown-screen")).toHaveCount(0);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "继续" }).click();
  await expect(page.locator(".countdown-screen")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".countdown-screen")).toHaveCount(0);

  await load(page, data(active("cooldown", "phase-switch", { phaseRemaining: 5, phaseSegmentIndex: 1, paused: true })));
  await expect(page.getByText("准备换侧 · 5 秒")).toBeVisible();
  await expect(page.locator(".countdown-screen")).toHaveCount(0);
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.locator(".target-summary")).toContainText("右侧", { timeout: 8_000 });
  await expect(page.locator(".countdown-screen")).toHaveCount(0);
});

for (const [width, height] of [[375, 812], [393, 852], [430, 932]] as const) {
  test(`countdown keeps existing layout at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await load(page, data(active("cooldown", "phase-intro")));
    await page.getByRole("button", { name: "START" }).click();
    await expect(page.locator(".countdown-screen strong")).toHaveText("3");
    const box = await page.locator(".countdown-ring").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `reports/ritmo-v16-countdown/countdown-${width}x${height}.png` });
  });
}
