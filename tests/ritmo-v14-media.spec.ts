import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { priorityExercises } from "../src/priorityExerciseCatalog";
import { priorityMediaIndex } from "../src/priorityMediaIndex";
import { mediaForExercise, personalMediaById } from "../src/exerciseMedia";

const plank = { id: "plank", name: "前臂平板支撑", muscle: "核心", equipment: "徒手", sets: 2, reps: 0, weight: 0, targetDurationSeconds: 30 };
const row = { id: "row", name: "坐姿划船", muscle: "背", equipment: "器械", sets: 2, reps: 10, weight: 20 };
function seed(stage: "active" | "transition", exercise = plank) {
  const exercises = stage === "transition" ? [row, exercise] : [exercise];
  return {
    currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [{ id: "media-plan", name: "媒体测试", environment: "健身房", exercises }],
    cycleIdsByEnvironment: { 健身房: ["media-plan"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [],
    activeWorkout: { id: "media-test", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "media-plan", planName: "媒体测试", exercises,
      exerciseIndex: stage === "transition" ? 0 : 0, setNumber: 1, targetReps: exercise.reps, targetDurationSeconds: exercise.targetDurationSeconds,
      activeRemainingSeconds: exercise.targetDurationSeconds, weight: exercise.weight, stage, restRemaining: 90, paused: stage === "active", completedSets: {} },
  };
}

test("51 stable media references remain intact while only 20 self-produced clips play", () => {
  expect(priorityMediaIndex).toHaveLength(51);
  expect(new Set(priorityMediaIndex.map((item) => item.ritmoId)).size).toBe(51);
  expect(priorityMediaIndex.map((item) => item.ritmoId)).toEqual(priorityExercises.map((item) => item.id));
  expect(priorityMediaIndex.filter((item) => item.useStatus === "licensed_review_only")).toHaveLength(1);
  expect(priorityMediaIndex.find((item) => item.ritmoId === "pulldown")?.matchStatus).toBe("mismatch");
  for (const item of priorityMediaIndex) {
    if (item.useStatus !== "licensed_review_only") expect(item.localAsset).toBeNull();
    const personal = personalMediaById.get(item.ritmoId);
    if (personal?.status === "personal_test_ready") expect(mediaForExercise(item.ritmoId).localUse).toBe("self_produced_personal_test");
    else expect(mediaForExercise(item.ritmoId).animation).toBeUndefined();
  }
  const clip = priorityMediaIndex.find((item) => item.ritmoId === "plank")!;
  expect(clip.localAsset).toBe("/media/exercises/plank__forearm-hold__review-only.mp4");
  expect(existsSync(`public${clip.localAsset}`)).toBe(true);
  expect(readFileSync(`public${clip.localAsset}`).length).toBe(16_409);
});

test("Active Set plays personal review clip, pauses with training, and does not change the timer", async ({ page }, testInfo) => {
  await page.addInitScript((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), seed("active"));
  await page.goto("/?flow=training");
  const video = page.locator('.exercise-media[data-media-exercise="plank"] video');
  await expect(video).toBeVisible();
  await expect(page.getByText("姿势参考 · 待审校")).not.toBeVisible();
  expect(await video.evaluate((element: HTMLVideoElement) => ({ muted: element.muted, loop: element.loop, inline: element.playsInline }))).toEqual({ muted: true, loop: true, inline: true });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
  expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("active-plank.png") });
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
  await page.context().setOffline(true);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
  await expect(page.locator(".rep-count")).toContainText("00:29", { timeout: 3_000 });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
});

test("next-action preview reuses the same clip; missing and failed media use placeholder", async ({ page }, testInfo) => {
  await page.addInitScript((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), seed("transition"));
  await page.goto("/?flow=training");
  const video = page.locator('.transition-art[data-media-exercise="plank"] video');
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath("next-action-plank.png") });
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator('.exercise-media[data-media-exercise="plank"] video')).toBeVisible({ timeout: 6_000 });

  await page.route("**/media/personal-v15/plank.mp4", (route) => route.abort());
  await page.reload();
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible();
  await page.unrouteAll();
  await page.addInitScript((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), seed("active", row));
  await page.reload();
  await expect(page.locator('.exercise-media[data-media-exercise="row"] video')).toHaveCount(0);
  await expect(page.getByText("正确素材准备中")).toBeVisible();
});

test("bundled media loads at three browser widths without third-party requests", async ({ page }) => {
  await page.addInitScript((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), seed("active"));
  const remote: string[] = [];
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1:4174/")) remote.push(request.url()); });
  for (const width of [375, 393, 430]) {
    await page.setViewportSize({ width, height: 932 });
    await page.goto("/?flow=training");
    const video = page.locator('.exercise-media[data-media-exercise="plank"] video');
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
  }
  expect(remote).toEqual([]);
});
