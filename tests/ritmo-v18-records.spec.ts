import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const smith = { id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 1, reps: 1, weight: 20 };
const completed = (setNumber: number, reps: number, weight: number) => ({ setNumber, targetReps: reps, recordedReps: reps, actualReps: reps, repsSource: "default", weight, completed: true });
const base = () => ({ dataVersion: 2, currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [{ id: "chest", name: "胸部基础", environment: "健身房", exercises: [smith] }], cycleIdsByEnvironment: { 健身房: ["chest"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [] as unknown[], phaseRecords: [] as unknown[], activeWorkout: null as unknown });
async function seed(page: Page, value: ReturnType<typeof base>) { await page.goto("/"); await page.evaluate((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), value); }
async function saved(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}")); }

for (const status of ["completed", "partial"] as const) {
  test(`${status} strength opens its exact record after cooldown without a summary page`, async ({ page }) => {
    const value = base();
    const id = `v18-${status}`;
    value.activeWorkout = { id, source: "cycle", environmentId: "健身房", startedAt: new Date(Date.now() - 65_000).toISOString(), planId: "chest", planName: "胸部基础", exercises: [smith], exerciseIndex: 0, setNumber: 1, rep: 1, targetReps: 1, targetDurationSeconds: 0, activeRemainingSeconds: 0, weight: 20, stage: "active", phase: "strength", primaryGroup: "胸", warmupIds: [], cooldownIds: ["ritmo:stretch:standing-chest-stretch"], phaseItemIndex: 0, phaseSegmentIndex: 0, phaseRemaining: 30, phaseDeadlineAt: null, phaseAccumulated: 0, phaseHadEarly: false, restRemaining: 90, paused: status === "partial", completedSets: status === "partial" ? { "0": [completed(1, 8, 20)] } : {} };
    value.phaseRecords = [{ runId: id, primaryGroup: "胸", catalogVersion: 1, items: [{ itemId: "ritmo:warmup:standing-chest-open-close", phase: "warmup", status: "completed", target: 12, actual: 12, measurementType: "reps", completedSegments: ["whole"], recordedAt: new Date().toISOString() }], updatedAt: new Date().toISOString() }];
    await seed(page, value);
    await page.goto("/?flow=training");
    if (status === "partial") {
      await page.getByRole("button", { name: "继续训练" }).click();
      await page.getByRole("button", { name: "暂停 / 调整" }).click();
      await page.getByRole("button", { name: "结束训练" }).click();
      await page.getByRole("button", { name: "提前结束训练" }).click();
    }
    await expect.poll(async () => (await saved(page)).sessions?.length, { timeout: 10_000 }).toBe(1);
    const beforeStretch = await saved(page);
    expect(beforeStretch.sessions[0].finishedAt).toBeUndefined();
    expect(beforeStretch.sessions[0].status).toBe(status);
    expect(beforeStretch.cycleIndexByEnvironment.健身房).toBe(status === "completed" ? 0 : 0);
    await page.getByRole("button", { name: "START" }).click();
    await page.getByRole("button", { name: "暂停 / 调整" }).click();
    await page.getByRole("button", { name: "跳过整个拉伸阶段" }).click();
    await page.getByRole("button", { name: "确认结束拉伸并查看记录" }).click();
    await expect(page.locator(".records-screen")).toBeVisible();
    await expect(page.locator(".heatmap-card")).toBeVisible();
    await expect(page.locator(".session-head[aria-expanded='true']")).toHaveCount(1);
    await expect(page.getByText("训练总结")).toHaveCount(0);
    await expect(page.locator(".record-exercise-card")).toContainText(status === "partial" ? "1 组 · 8 次 · 20 kg" : "1 组 · 1 次 · 20 kg");
    const after = await saved(page);
    expect(after.sessions).toHaveLength(1);
    expect(after.sessions[0].finishedAt).toBeTruthy();
    expect(after.sessions[0].status).toBe(status);
    expect(after.phaseRecords[0].items).toHaveLength(2);
    expect(after.activeWorkout).toBeNull();
    await page.reload();
    await expect(page.locator(".records-screen")).toBeVisible();
    expect((await saved(page)).sessions).toHaveLength(1);
    expect((await saved(page)).cycleIndexByEnvironment.健身房).toBe(0);
  });
}

test("same-day sessions remain separate and only completed sets appear", async ({ page }) => {
  const value = base();
  const start = new Date(Date.now() - 45 * 60_000);
  const firstEnd = new Date(start.getTime() + 20 * 60_000);
  const secondEnd = new Date(start.getTime() + 40 * 60_000);
  value.sessions = [
    { id: "older", source: "custom", environmentId: "健身房", startedAt: start.toISOString(), endedAt: firstEnd.toISOString(), planName: "旧训练", status: "completed", completed: true, exercises: [{ ...smith, completedSets: [completed(1, 10, 20)] }] },
    { id: "newer", source: "cycle", environmentId: "健身房", startedAt: firstEnd.toISOString(), endedAt: secondEnd.toISOString(), planName: "胸部基础", status: "partial", completed: false, exercises: [{ ...smith, completedSets: [completed(1, 10, 20), completed(2, 10, 22.5), completed(3, 8, 22.5)] }, { ...smith, id: "pushup", name: "俯卧撑", completedSets: [] }] },
  ];
  await seed(page, value);
  await page.goto("/?flow=records&session=older");
  await expect(page.locator(".session-card")).toHaveCount(2);
  await expect(page.locator(".session-head[aria-expanded='true']")).toContainText("旧训练");
  await page.locator(".session-head").first().click();
  await expect(page.locator(".record-exercise-card")).toContainText("3 组 · 28 次 · 20–22.5 kg");
  await expect(page.locator(".session-list")).not.toContainText("partial");
  await expect(page.locator(".session-list")).not.toContainText("未完成");
  expect((await saved(page)).sessions).toHaveLength(2);
});

test("duration, unset weight and legacy session use only stored values", async ({ page }) => {
  const value = base();
  const end = new Date();
  const start = new Date(end.getTime() - 12 * 60_000);
  value.sessions = [{ id: "legacy", source: "custom", environmentId: "健身房", startedAt: start.toISOString(), endedAt: end.toISOString(), planName: "旧方案", status: "completed", completed: true, exercises: [{ ...smith, weight: 0, completedSets: [completed(1, 9, 0)] }, { ...smith, id: "plank", name: "平板支撑", equipment: "徒手", completedSets: [{ ...completed(1, 0, 0), measurementType: "duration", recordedDurationSeconds: 30 }, { ...completed(2, 0, 0), measurementType: "duration", recordedDurationSeconds: 60 }] }] }];
  await seed(page, value);
  await page.goto("/?flow=records");
  await expect(page.locator(".session-duration")).toHaveText("12 分钟");
  await expect(page.locator(".record-exercise-card").first()).toContainText("1 组 · 9 次");
  await expect(page.locator(".record-exercise-card").first()).not.toContainText("kg");
  await expect(page.locator(".record-exercise-card").last()).toContainText("2 组 · 90 秒");
  expect((await saved(page)).sessions[0].finishedAt).toBeUndefined();
});

test("record hierarchy fits three iPhone viewports", async ({ page }) => {
  const value = base();
  const end = new Date();
  value.sessions = [{ id: "visual-record", source: "cycle", environmentId: "健身房", startedAt: new Date(end.getTime() - 38 * 60_000).toISOString(), endedAt: new Date(end.getTime() - 5 * 60_000).toISOString(), finishedAt: end.toISOString(), planName: "胸部基础", status: "completed", completed: true, exercises: [{ ...smith, completedSets: [completed(1, 10, 20), completed(2, 10, 20), completed(3, 8, 20)] }, { ...smith, id: "pushup", name: "俯卧撑", equipment: "徒手", completedSets: [completed(1, 12, 0)] }] }];
  await seed(page, value);
  const shots = join("reports", "ritmo-v18-records", "screenshots");
  mkdirSync(shots, { recursive: true });
  for (const [width, height] of [[375, 812], [393, 852], [430, 932]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/?flow=records&session=visual-record");
    await expect(page.locator(".session-head[aria-expanded='true']")).toBeVisible();
    await expect(page.locator(".record-exercise-card")).toHaveCount(2);
    await page.screenshot({ path: join(shots, `records-top-${width}.png`) });
    await page.locator(".records-screen .mobile-scroll").evaluate((node) => node.scrollTo({ top: 650, behavior: "instant" }));
    await page.screenshot({ path: join(shots, `records-cards-${width}.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  }
});
