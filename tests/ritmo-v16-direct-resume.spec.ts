import { expect, test, type Page } from "@playwright/test";

const smith = { id: "smith", name: "史密斯卧推", muscle: "胸", equipment: "Smith 架", sets: 2, reps: 10, weight: 20 };
const plank = { id: "plank", name: "平板支撑", muscle: "核心", equipment: "徒手", sets: 2, reps: 0, targetDurationSeconds: 12, weight: 0 };
const now = new Date().toISOString();
const plan = { id: "direct-resume", name: "右上角恢复测试", environment: "健身房", exercises: [plank] };

function state(stage: "active" | "rest", phase: "warmup" | "strength" | "cooldown") {
  const exercise = stage === "rest" ? smith : plank;
  return {
    dataVersion: 2, currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [{ ...plan, exercises: [exercise] }],
    cycleIdsByEnvironment: { 健身房: [plan.id], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [],
    activeWorkout: { id: `direct-${phase}-${stage}`, source: "cycle", environmentId: "健身房", startedAt: now, planId: plan.id, planName: plan.name, exercises: [exercise], exerciseIndex: 0, setNumber: 1, rep: 1, targetReps: exercise.reps, targetDurationSeconds: stage === "rest" ? 0 : 12, activeRemainingSeconds: 12, activeDeadlineAt: null, weight: exercise.weight, stage, phase, primaryGroup: "胸", warmupIds: ["ritmo:warmup:forearm-plank-activation"], cooldownIds: ["ritmo:stretch:doorway-single-arm-chest"], phaseItemIndex: 0, phaseSegmentIndex: 0, phaseRemaining: 12, phaseDeadlineAt: null, phaseAccumulated: 0, phaseHadEarly: false, restRemaining: 12, restDeadlineAt: null, paused: true, completedSets: {} },
  };
}
async function load(page: Page, value: object) {
  await page.goto("/?flow=training");
  await page.evaluate((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), value);
  await page.reload();
}
async function remaining(page: Page, stage: "active" | "rest", phase: string) {
  return page.evaluate(({ stage, phase }) => {
    const run = JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}").activeWorkout;
    return stage === "rest" ? run.restRemaining : phase === "strength" ? run.activeRemainingSeconds : run.phaseRemaining;
  }, { stage, phase });
}

for (const [stage, phase] of [["active", "warmup"], ["active", "strength"], ["active", "cooldown"], ["rest", "strength"]] as const) {
  test(`top-right Continue directly resumes ${phase} ${stage} after dismissing controls`, async ({ page }) => {
    test.setTimeout(25_000);
    await page.setViewportSize({ width: 393, height: 852 });
    await load(page, state(stage, phase));
    await expect(page.locator(".pause-button")).toHaveText("继续训练");
    const before = await remaining(page, stage, phase);
    await page.waitForTimeout(700);
    expect(await remaining(page, stage, phase)).toBe(before);

    await page.locator(".pause-button").click();
    await expect(page.locator(".pause-button")).toHaveText("暂停 / 调整");
    await expect(page.locator(".countdown-screen")).toHaveCount(0);
    await expect.poll(() => remaining(page, stage, phase), { timeout: 3_000 }).toBeLessThan(before);

    await page.locator(".pause-button").click();
    await expect(page.getByRole("dialog", { name: "训练控制" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "训练控制" })).toBeHidden();
    await expect(page.locator(".pause-button")).toHaveText("继续训练");
    const frozen = await remaining(page, stage, phase);
    await page.waitForTimeout(700);
    expect(await remaining(page, stage, phase)).toBe(frozen);
    if (stage === "active" && phase === "strength") await page.screenshot({ path: "reports/ritmo-v16-direct-resume/paused-393x852.png" });

    await page.locator(".pause-button").click();
    await expect(page.locator(".pause-button")).toHaveText("暂停 / 调整");
    if (stage === "active" && phase === "strength") await page.screenshot({ path: "reports/ritmo-v16-direct-resume/running-393x852.png" });
    await expect.poll(() => remaining(page, stage, phase), { timeout: 3_000 }).toBeLessThan(frozen);
    await expect(page.locator(".countdown-screen")).toHaveCount(0);
  });
}
