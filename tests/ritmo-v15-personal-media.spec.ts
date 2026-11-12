import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { personalSequenceMedia as manifest } from "../src/personalSequenceMedia";
import { mediaForExercise } from "../src/exerciseMedia";

const ready = manifest.items.filter((item) => item.status === "personal_test_ready" && "asset" in item);
const excluded = manifest.items.filter((item) => item.status !== "personal_test_ready");
const exercise = (id: string, name = id) => ({ id, name, muscle: "胸", equipment: id === "incline" ? "哑铃" : "徒手", sets: 2, reps: 10, weight: id === "incline" ? 10 : 0, restSeconds: 90 });
function seed(stage: "active" | "transition", current = exercise("pushup", "标准俯卧撑"), next = exercise("incline", "上斜哑铃卧推")) {
  const exercises = stage === "transition" ? [current, next] : [current];
  return {
    currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [{ id: "personal-media-plan", name: "个人媒体验收", environment: "健身房", exercises }],
    cycleIdsByEnvironment: { 健身房: ["personal-media-plan"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [],
    activeWorkout: { id: "personal-media-run", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "personal-media-plan", planName: "个人媒体验收", exercises,
      exerciseIndex: 0, setNumber: 1, targetReps: 10, weight: 0, stage, restRemaining: 90, paused: stage === "active", completedSets: {} },
  };
}

test("20 stable IDs have byte-identical local assets; other 31 never get an animation", () => {
  expect(manifest.items).toHaveLength(51);
  expect(ready).toHaveLength(20);
  expect(excluded).toHaveLength(31);
  expect(new Set(manifest.items.map(item => item.id)).size).toBe(51);
  for (const item of ready) {
    const media = mediaForExercise(item.id);
    expect(media.animation).toBe(item.asset);
    expect(media.personalStatus).toBe("personal_test_ready");
    expect(media.professionalApproval).toBe("not_verified");
    expect(media.reviewOnly).toBe(true);
    const source = readFileSync(item.sourcePath);
    const local = readFileSync(`public${item.asset}`);
    expect(local.length).toBe(item.bytes);
    expect(createHash("sha256").update(source).digest("hex")).toBe(item.sha256);
    expect(createHash("sha256").update(local).digest("hex")).toBe(item.sha256);
  }
  for (const item of excluded) expect(mediaForExercise(item.id).animation).toBeUndefined();
  expect(mediaForExercise("smith").staticImage).toBe("/assets/workout/smith-press.png");
  expect(existsSync("public/media/exercises/plank__forearm-hold__review-only.mp4")).toBe(true);
});

test("all 20 animations load in the actual Active Set at the correct ID", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/?flow=training");
  const loadChecks: { id: string; asset: string; bytes: number; reloadToReadyMs: number; width: number; height: number }[] = [];
  for (const item of ready) {
    await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), seed("active", exercise(item.id)));
    const beganAt = Date.now();
    await page.reload();
    const video = page.locator(`.exercise-media[data-media-exercise="${item.id}"] video`);
    await expect(video, item.id).toBeVisible();
    await expect(video).toHaveAttribute("src", item.asset);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState), { message: item.id }).toBeGreaterThanOrEqual(2);
    loadChecks.push({ id: item.id, asset: item.asset, bytes: item.bytes, reloadToReadyMs: Date.now() - beganAt, width: item.width, height: item.height });
    expect(await video.evaluate((element: HTMLVideoElement) => ({ width: element.videoWidth, height: element.videoHeight, muted: element.muted, loop: element.loop, inline: element.playsInline }))).toEqual({ width: 720, height: 720, muted: true, loop: true, inline: true });
  }
  writeFileSync("reports/ritmo-v15-personal-media/load-check.json", JSON.stringify({ environment: "local Playwright Chromium; reload-to-ready includes page navigation, not just media transfer", items: loadChecks }, null, 2) + "\n");
});

test("retired localMedia switch cannot bypass the 51-action allowlist", async ({ page }) => {
  await page.goto("/?flow=training&localMedia=1");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), seed("active", exercise("hasan:0025", "杠铃平板卧推")));
  await page.reload();
  await expect(page.locator('.exercise-media[data-media-exercise="hasan:0025"] video')).toHaveCount(0);
  await expect(page.getByText("正确素材准备中")).toBeVisible();
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), seed("active", exercise("hasan:0310", "哑铃前平举")));
  await page.reload();
  await expect(page.locator('.exercise-media[data-media-exercise="hasan:0310"] video')).toHaveAttribute("src", "/media/personal-v15/hasan-0310.mp4");
});

test("pause, resume, loop, refresh, next-action switch and failure fallback", async ({ page }) => {
  test.setTimeout(80_000);
  await page.addInitScript((value) => { if (!localStorage.getItem("ritmo-demo-v3")) localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)); }, seed("active"));
  await page.goto("/?flow=training");
  const video = page.locator('.exercise-media[data-media-exercise="pushup"] video');
  await expect(video).toBeVisible();
  const mediaBox = await page.locator('.exercise-media[data-media-exercise="pushup"]').boundingBox();
  const countBox = await page.locator('.rep-count').boundingBox();
  expect(mediaBox?.width).toBe(357);
  expect(mediaBox?.height).toBe(357);
  expect(mediaBox && countBox && mediaBox.y + mediaBox.height <= countBox.y).toBe(true);
  expect(await video.evaluate((element: HTMLVideoElement) => getComputedStyle(element).objectFit)).toBe("contain");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.locator('[data-testid="phone-frame"]').screenshot({ path: "reports/ritmo-v15-personal-media/active-set.png" });
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.1);
  await video.evaluate((element: HTMLVideoElement) => { element.currentTime = element.duration - 0.1; });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(0.5);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  const frozen = await page.locator(".rep-count strong").textContent();
  await page.waitForTimeout(1_100);
  await expect(page.locator(".rep-count strong")).toHaveText(frozen || "");
  await page.reload();
  await expect(page.locator('.exercise-media[data-media-exercise="pushup"] video')).toBeVisible();
  await expect.poll(() => page.locator('.exercise-media[data-media-exercise="pushup"] video').evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);

  await page.route("**/media/personal-v15/pushup.mp4", route => route.abort());
  await page.reload();
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible();
  await page.unrouteAll();

  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), seed("transition"));
  await page.reload();
  const preview = page.locator('.transition-art[data-media-exercise="incline"] video');
  await expect(preview).toHaveAttribute("src", "/media/personal-v15/incline.mp4");
  await expect.poll(() => preview.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
  await page.locator('[data-testid="phone-frame"]').screenshot({ path: "reports/ritmo-v15-personal-media/next-action.png" });
  await page.getByRole("button", { name: "START", exact: true }).click();
  const nextActive = page.locator('.exercise-media[data-media-exercise="incline"] video');
  await expect(nextActive).toBeVisible({ timeout: 7_000 });
  await expect(nextActive).toHaveAttribute("src", "/media/personal-v15/incline.mp4");
});
