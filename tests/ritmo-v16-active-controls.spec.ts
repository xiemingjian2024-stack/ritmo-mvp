import { expect, test, type Page } from "@playwright/test";

const smith = { id: "smith", name: "史密斯卧推", muscle: "胸", equipment: "Smith 架", sets: 1, reps: 100, weight: 20 };
const plan = { id: "v16-unified", name: "统一执行页验收", environment: "健身房", exercises: [smith] };
const now = new Date().toISOString();
const screenshotDir = "reports/ritmo-v16-unified-active";
const base = { dataVersion: 2, currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [plan], cycleIdsByEnvironment: { 健身房: [plan.id], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [], phaseRecords: [] };
const active = (phase: "warmup" | "strength" | "cooldown", overrides: Record<string, unknown> = {}) => ({ id: "v16-unified-run", source: "cycle", environmentId: "健身房", startedAt: now, planId: plan.id, planName: plan.name, exercises: [smith], exerciseIndex: 0, setNumber: 1, rep: 1, targetReps: 100, targetDurationSeconds: 0, activeRemainingSeconds: 0, weight: 20, stage: "active", phase, primaryGroup: "胸", warmupIds: ["ritmo:warmup:shoulder-circles", "ritmo:warmup:light-dumbbell-low-fly"], cooldownIds: ["ritmo:stretch:doorway-single-arm-chest"], phaseItemIndex: 0, phaseSegmentIndex: 0, phaseRemaining: 10, phaseDeadlineAt: null, phaseAccumulated: 0, phaseHadEarly: false, restRemaining: 90, paused: true, completedSets: {}, ...overrides });
async function load(page: Page, workout: object, sessions: object[] = []) {
  await page.goto("/?flow=training");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), { ...base, sessions, activeWorkout: workout });
  await page.reload();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}")); }

test("all phases share exact Active Set anatomy and pause sheet at 393×852", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const cases = [
    ["strength", active("strength")],
    ["warmup-reps", active("warmup")],
    ["warmup-timed", active("warmup", { primaryGroup: "核心", warmupIds: ["ritmo:warmup:forearm-plank-activation"], phaseRemaining: 30 })],
    ["cooldown-timed", active("cooldown", { phaseRemaining: 30 })],
  ] as const;
  const layout: string[] = [];
  const activeShots: { label: string; data: string }[] = [];
  const pauseShots: { label: string; data: string }[] = [];
  for (const [label, workout] of cases) {
    await load(page, workout);
    await expect(page.locator(".active-content")).toBeVisible();
    await expect(page.locator(".phase-active-content, .phase-primary-action, .phase-control-actions, .phase-kicker")).toHaveCount(0);
    await expect(page.locator(".active-content .immersive-header, .active-content .training-controls, .active-content .exercise-media, .active-content .rep-panel, .active-content .target-summary, .active-content .motion-cue")).toHaveCount(6);
    layout.push(await page.locator(".active-content").evaluate((node) => Array.from(node.children).map((child) => child.classList[0]).join("|")));
    await page.getByRole("button", { name: "继续训练" }).click();
    await expect(page.getByRole("dialog", { name: "训练控制" })).toBeHidden();
    await page.waitForTimeout(300);
    activeShots.push({ label, data: (await page.screenshot({ path: `${screenshotDir}/${label}-active-393x852.png` })).toString("base64") });
    await page.getByRole("button", { name: "暂停 / 调整" }).click();
    await expect(page.getByRole("heading", { name: "训练控制" })).toBeVisible();
    await expect(page.getByRole("button", { name: "继续训练" })).toBeVisible();
    await page.waitForTimeout(500);
    const pauseData = (await page.screenshot({ path: `${screenshotDir}/${label}-pause-393x852.png` })).toString("base64");
    if (label !== "warmup-timed") pauseShots.push({ label, data: pauseData });
    if (label === "strength") await expect(page.getByRole("button", { name: /跳过整个/ })).toHaveCount(0);
    else {
      await expect(page.getByRole("button", { name: /跳过整个/ })).toBeVisible();
      const sheet = await page.getByRole("dialog", { name: "训练控制" }).boundingBox();
      const lastAction = await page.locator(".training-control-actions>button:last-child").boundingBox();
      expect(sheet && lastAction && lastAction.y + lastAction.height <= sheet.y + sheet.height).toBe(true);
    }
  }
  expect(new Set(layout).size).toBe(1);
  for (const [name, shots] of [["active-comparison", activeShots], ["pause-comparison", pauseShots]] as const) {
    await page.setViewportSize({ width: shots.length * 405 + 30, height: 910 });
    await page.setContent(`<style>body{margin:0;background:#202123;color:white;font:700 16px system-ui}.grid{display:flex;gap:12px;padding:15px}.cell{width:393px}.cell span{display:block;height:28px}.cell img{display:block;width:393px;height:852px}</style><div class="grid">${shots.map((shot) => `<div class="cell"><span>${shot.label}</span><img src="data:image/png;base64,${shot.data}"></div>`).join("")}</div>`);
    await page.screenshot({ path: `${screenshotDir}/${name}.png` });
  }
});

test("whole-phase skip confirms once, current-action skip does not, and cancel stays paused", async ({ page }) => {
  await load(page, active("warmup"));
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await expect(page.getByRole("heading", { name: "结束整个热身阶段？" })).toBeVisible();
  await page.getByRole("button", { name: "返回暂停界面" }).click();
  expect((await saved(page)).activeWorkout.paused).toBe(true);
  await page.getByRole("button", { name: "跳过当前动作" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.stage).toBe("phase-ready");
  await expect(page.getByRole("button", { name: "START" })).toBeVisible();
});

test("three iPhone viewports retain media size and missing-media fallback", async ({ page }) => {
  for (const [width, height] of [[375, 812], [393, 852], [430, 932]]) {
    await page.setViewportSize({ width, height });
    await load(page, active("warmup"));
    await expect(page.locator('[data-media-exercise="ritmo:warmup:shoulder-circles"]')).toContainText("正确素材准备中");
    expect(await page.locator(".exercise-media").evaluate((node) => getComputedStyle(node).height)).toBe("357px");
    await page.screenshot({ path: `${screenshotDir}/warmup-${width}x${height}.png` });
  }
});

test("timed side-switch freezes through refresh and resumes", async ({ page }) => {
  await load(page, active("cooldown", { phaseRemaining: 1 }));
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.getByText("准备换侧 · 5 秒")).toBeVisible({ timeout: 4_000 });
  await page.getByRole("button", { name: /暂停 \/ 调整|继续训练/ }).click();
  const frozen = (await saved(page)).activeWorkout.phaseRemaining;
  await page.reload();
  await page.waitForTimeout(1_100);
  expect((await saved(page)).activeWorkout.phaseRemaining).toBe(frozen);
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.locator(".target-summary")).toContainText("右侧", { timeout: 8_000 });
});
