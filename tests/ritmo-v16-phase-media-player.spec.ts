import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { personalSequenceMedia } from "../src/personalSequenceMedia";
import { mediaForExercise } from "../src/exerciseMedia";

test("the 20 existing strength MP4 mappings remain unchanged", () => {
  const ready = personalSequenceMedia.items.filter((item) => item.status === "personal_test_ready" && "asset" in item);
  expect(ready).toHaveLength(20);
  for (const item of ready) {
    const media = mediaForExercise(item.id);
    expect(media.animation).toBe(item.asset);
    expect(media.animationFormat).toBe("mp4");
    expect(readFileSync(`public${item.asset}`).length).toBeGreaterThan(0);
  }
  expect(mediaForExercise("ritmo:stretch:cross-body-rear-delt").segments?.left?.staticImage).toBe("/media/personal-v16/cross-body-rear-delt-left.png");
  expect(mediaForExercise("ritmo:stretch:doorway-single-arm-chest").staticImage).toBeUndefined();
});

test("isolated static media follows left/right, pause, refresh and error fallback", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/tests/phase-media-fixture.html");
  const box = page.locator('.exercise-media[data-media-exercise="ritmo:stretch:cross-body-rear-delt"]');
  const picture = box.locator("img");
  await expect(picture).toHaveAttribute("src", /cross-body-rear-delt\/left\.png$/);
  await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1254);
  expect(await box.evaluate((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }))).toEqual({ width: 357, height: 357 });
  expect(await picture.evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");
  await page.screenshot({ path: testInfo.outputPath("static-left-393x852.png") });
  await page.getByRole("button", { name: "自动换侧 · 5 秒" }).click();
  await expect(box).toHaveAttribute("data-media-segment", "right");
  await expect(picture).toHaveAttribute("src", /cross-body-rear-delt\/right\.png$/);
  await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1254);
  await page.screenshot({ path: testInfo.outputPath("static-right-switch-393x852.png") });
  for (const [width, height] of [[375, 812], [430, 932]] as const) {
    await page.setViewportSize({ width, height });
    await expect(picture).toBeVisible();
    expect(await box.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(width);
    expect(await box.evaluate((element) => element.getBoundingClientRect().height)).toBe(357);
    await page.screenshot({ path: testInfo.outputPath(`static-right-${width}x${height}.png`) });
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await page.getByRole("button", { name: "仅左侧素材" }).click();
  await expect(box).toContainText("正确素材准备中");
  await expect(box.locator("img")).toHaveCount(0);
  await page.getByRole("button", { name: "仅左侧素材" }).click();
  await expect(picture).toHaveAttribute("src", /right\.png$/);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  const frozen = await page.locator(".rep-count").textContent();
  await page.waitForTimeout(1100);
  await expect(page.locator(".rep-count")).toHaveText(frozen ?? "");
  await expect(picture).toHaveAttribute("src", /right\.png$/);
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect.poll(async () => page.locator(".rep-count").textContent()).not.toBe(frozen);
  await page.getByRole("button", { name: "切换缺失媒体" }).click();
  await expect(box).toContainText("演示加载失败，请检查本地素材");
  await page.reload();
  await expect(box).toHaveAttribute("data-media-segment", "left");
  await expect(box.locator("img")).toHaveAttribute("src", /left\.png$/);
});

test("static WebP is displayed by the same image branch", async ({ page }) => {
  // A one-pixel protocol fixture checks format support without introducing an
  // exercise image or adding media to the application library.
  const tinyWebp = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");
  await page.route("**/tests/one-pixel.webp", (route) => route.fulfill({ contentType: "image/webp", body: tinyWebp }));
  await page.goto("/tests/phase-media-fixture.html");
  await page.getByRole("button", { name: "PNG / WebP" }).click();
  await expect(page.locator(".exercise-media img")).toHaveAttribute("src", "/tests/one-pixel.webp");
  await expect.poll(() => page.locator(".exercise-media img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);
});

test("the existing phase state switches segment after one side and keeps it after refresh", async ({ page }, testInfo) => {
  const smith = { id: "smith", name: "史密斯卧推", muscle: "胸", equipment: "Smith 架", sets: 1, reps: 10, weight: 20 };
  const plan = { id: "phase-media-flow", name: "媒体换侧验证", environment: "健身房", exercises: [smith] };
  const activeWorkout = { id: "phase-media-run", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: plan.id, planName: plan.name, exercises: [smith], exerciseIndex: 0, setNumber: 1, rep: 1, targetReps: 10, weight: 20, stage: "active", phase: "cooldown", primaryGroup: "肩", warmupIds: [], cooldownIds: ["ritmo:stretch:cross-body-rear-delt"], phaseItemIndex: 0, phaseSegmentIndex: 0, phaseRemaining: 1, phaseDeadlineAt: Date.now() + 1000, phaseAccumulated: 0, phaseHadEarly: false, restRemaining: 90, paused: false, completedSets: {} };
  const data = { dataVersion: 2, currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [plan], cycleIdsByEnvironment: { 健身房: [plan.id], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [], phaseRecords: [], activeWorkout };
  await page.goto("/?flow=training");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), data);
  await page.reload();
  const box = page.locator('.exercise-media[data-media-exercise="ritmo:stretch:cross-body-rear-delt"]');
  await expect(box).toHaveAttribute("data-media-segment", "left");
  await expect(box.locator("img")).toHaveAttribute("src", "/media/personal-v16/cross-body-rear-delt-left.png");
  // Restored workouts intentionally resume paused; resume explicitly before the timer advances.
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.getByText("准备换侧 · 5 秒")).toBeVisible({ timeout: 4000 });
  await expect(box).toHaveAttribute("data-media-segment", "right");
  await page.screenshot({ path: testInfo.outputPath("actual-phase-switch-placeholder.png") });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}").activeWorkout.phaseRemaining);
  await page.reload();
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}").activeWorkout.phaseRemaining)).toBe(before);
  await expect(box).toHaveAttribute("data-media-segment", "right");
});
