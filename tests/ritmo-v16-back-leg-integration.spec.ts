import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { mediaForExercise } from "../src/exerciseMedia";
import { phaseById, phaseExerciseCatalog, phaseItemAvailable, phaseItemsFor, resolvePrimaryGroup } from "../src/phaseExerciseCatalog";

const shotDir = "reports/ritmo-v16-knee-hug-substitution/revision-2026-10-24/screenshots";
const cases = [
  { group: "背", environment: "健身房", exercise: { id: "pulldown", name: "高位下拉", equipment: "器械", weight: 20 }, warmup: "ritmo:warmup:cat-cow", cooldown: ["ritmo:stretch:child-pose"] },
  { group: "背", environment: "家里", exercise: { id: "one-arm-row", name: "单臂哑铃划船", equipment: "哑铃", weight: 10 }, warmup: "ritmo:warmup:cat-cow", cooldown: ["ritmo:stretch:child-pose"] },
  { group: "腿", environment: "健身房", exercise: { id: "leg-press", name: "腿举", equipment: "器械", weight: 20 }, warmup: "ritmo:warmup:bodyweight-squat", cooldown: ["ritmo:stretch:standing-quad", "ritmo:stretch:double-knee-hug"] },
  { group: "腿", environment: "家里", exercise: { id: "body-squat", name: "徒手深蹲", equipment: "徒手", weight: 0 }, warmup: "ritmo:warmup:bodyweight-squat", cooldown: ["ritmo:stretch:standing-quad", "ritmo:stretch:double-knee-hug"] },
] as const;

function fixture(entry: typeof cases[number]) {
  const action = { ...entry.exercise, muscle: entry.group, sets: 1, reps: 1 };
  const plan = { id: `final-${entry.group}-${entry.environment}`, name: `${entry.group}收官-${entry.environment}`, environment: entry.environment, exercises: [action] };
  const next = { ...plan, id: `next-${entry.group}-${entry.environment}`, name: `下一方案-${entry.environment}` };
  return {
    dataVersion: 2, currentEnvironment: entry.environment, environments: ["健身房", "家里"], plans: [plan, next],
    cycleIdsByEnvironment: { 健身房: entry.environment === "健身房" ? [plan.id, next.id] : [], 家里: entry.environment === "家里" ? [plan.id, next.id] : [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: entry.environment === "健身房", 家里: entry.environment === "家里" },
    sessions: [], phaseRecords: [], activeWorkout: null,
  };
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
async function load(page: Page, entry: typeof cases[number]) {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/?flow=training");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), fixture(entry));
  await page.reload();
}
async function capture(page: Page, file: string) {
  mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: `${shotDir}/${file}` });
}
async function expectMedia(page: Page, id: string, asset: string, className = ".exercise-media") {
  const box = page.locator(`${className}[data-media-exercise="${id}"]`);
  await expect(box).toBeVisible({ timeout: 8_000 });
  const node = box.locator(asset.endsWith(".mp4") ? "video" : "img");
  await expect(node).toHaveAttribute("src", asset);
  if (asset.endsWith(".mp4")) {
    await expect(node).toHaveJSProperty("muted", true);
    await expect(node).toHaveAttribute("loop", "");
    await expect.poll(() => node.evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThan(1);
  } else await expect.poll(() => node.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  return box;
}

test("back and leg recommendations have exact media, stable IDs and both-environment equipment", () => {
  expect(new Set(phaseExerciseCatalog.map((item) => item.id)).size).toBe(29);
  expect(phaseItemsFor("背", "warmup").map((item) => item.id)).toEqual(["ritmo:warmup:cat-cow"]);
  expect(phaseItemsFor("背", "cooldown").map((item) => item.id)).toEqual(["ritmo:stretch:child-pose"]);
  expect(phaseItemsFor("腿", "warmup").map((item) => item.id)).toEqual(["ritmo:warmup:bodyweight-squat"]);
  expect(phaseItemsFor("腿", "cooldown").map((item) => item.id)).toEqual(["ritmo:stretch:standing-quad", "ritmo:stretch:double-knee-hug"]);
  for (const entry of cases) {
    expect(resolvePrimaryGroup([{ muscle: entry.group }])).toBe(entry.group);
    for (const id of [entry.warmup, ...entry.cooldown]) {
      expect(phaseItemAvailable(phaseById.get(id)!, entry.environment)).toBe(true);
      const media = mediaForExercise(id);
      expect(media.mediaId).toBe(id);
      expect(media.placeholder).toBe(false);
      expect(media.professionalApproval).toBe("not_verified");
      expect(media.sourceVersion).toContain("designer visual accepted");
    }
  }
  expect(mediaForExercise("ritmo:warmup:bent-scapular-activation").placeholder).toBe(true);
  expect(mediaForExercise("ritmo:warmup:elbows-tucked-external-rotation").placeholder).toBe(true);
  expect(mediaForExercise("ritmo:stretch:standing-figure-four").placeholder).toBe(true);
  for (const asset of ["cat-cow.mp4", "bodyweight-squat-v16.mp4", "child-pose-v2.webp", "double-knee-hug-v2.webp", "standing-quad-left.webp", "standing-quad-right.webp"]) {
    expect(existsSync(`public/media/personal-v16/${asset}`)).toBe(true);
  }
});

for (const entry of cases) test(`${entry.group} ${entry.environment}: full warmup → strength → stretch → history`, async ({ page }) => {
  test.setTimeout(230_000);
  await load(page, entry);
  await page.getByRole("button", { name: /START/ }).first().click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  const warmupAsset = entry.group === "背" ? "/media/personal-v16/cat-cow.mp4" : "/media/personal-v16/bodyweight-squat-v16.mp4";
  const warmup = await expectMedia(page, entry.warmup, warmupAsset);
  expect(await warmup.evaluate((node) => (node as HTMLElement).offsetWidth)).toBe(357);
  await capture(page, `${entry.group}-${entry.environment}-warmup.png`);
  const snapshot = await saved(page);
  expect(snapshot.activeWorkout.warmupIds).toEqual([entry.warmup]);
  expect(snapshot.activeWorkout.cooldownIds).toEqual(entry.cooldown);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  const remaining = (await saved(page)).activeWorkout.phaseRemaining;
  await expect.poll(() => warmup.locator("video").evaluate((node: HTMLVideoElement) => node.paused)).toBe(true);
  await page.reload();
  await page.waitForTimeout(350);
  expect((await saved(page)).activeWorkout.phaseRemaining).toBe(remaining);
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect.poll(() => warmup.locator("video").evaluate((node: HTMLVideoElement) => node.paused)).toBe(false);
  await expect.poll(async () => (await saved(page)).phaseRecords?.[0]?.items?.some((item: { itemId: string; status: string }) => item.itemId === entry.warmup && item.status === "completed"), { timeout: 70_000 }).toBe(true);
  await expect(page.locator(`.transition-art[data-media-exercise="${entry.exercise.id}"]`)).toBeVisible();
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  await expect.poll(async () => (await saved(page)).sessions?.length, { timeout: 9_000 }).toBe(1);
  expect((await saved(page)).sessions[0].status).toBe("completed");
  expect((await saved(page)).cycleIndexByEnvironment[entry.environment]).toBe(1);
  for (const [index, id] of entry.cooldown.entries()) {
    const firstAsset = id === "ritmo:stretch:standing-quad" ? "/media/personal-v16/standing-quad-left.webp" : id === "ritmo:stretch:double-knee-hug" ? "/media/personal-v16/double-knee-hug-v2.webp" : "/media/personal-v16/child-pose-v2.webp";
    await expectMedia(page, id, firstAsset, ".transition-art");
    await capture(page, `${entry.group}-${entry.environment}-stretch-${index + 1}-next.png`);
    await page.getByRole("button", { name: "START" }).click();
    await expect(page.locator(".countdown-screen strong")).toHaveText("3");
    const active = await expectMedia(page, id, firstAsset);
    expect(await active.evaluate((node) => (node as HTMLElement).offsetWidth)).toBe(357);
    await capture(page, `${entry.group}-${entry.environment}-stretch-${index + 1}.png`);
    if (id === "ritmo:stretch:standing-quad") {
      await expect.poll(async () => (await saved(page)).activeWorkout.stage, { timeout: 40_000 }).toBe("phase-switch");
      await expect(page.locator(".target-summary")).toContainText("准备换侧");
      await page.getByRole("button", { name: "暂停 / 调整" }).click();
      const switchRemaining = (await saved(page)).activeWorkout.phaseRemaining;
      await page.waitForTimeout(350);
      expect((await saved(page)).activeWorkout.phaseRemaining).toBe(switchRemaining);
      await page.getByRole("button", { name: "继续训练" }).click();
      await expectMedia(page, id, "/media/personal-v16/standing-quad-right.webp");
      await capture(page, `${entry.group}-${entry.environment}-stretch-right.png`);
    }
    await expect.poll(async () => (await saved(page)).phaseRecords?.[0]?.items?.some((item: { itemId: string; status: string }) => item.itemId === id && item.status === "completed"), { timeout: 80_000 }).toBe(true);
  }
  await expect(page.locator(".records-screen")).toBeVisible();
  await capture(page, `${entry.group}-${entry.environment}-summary.png`);
  const complete = await saved(page);
  expect(complete.sessions).toHaveLength(1);
  expect(complete.cycleIndexByEnvironment[entry.environment]).toBe(1);
  expect(complete.phaseRecords[0].items.map((item: { itemId: string }) => item.itemId)).toEqual([entry.warmup, ...entry.cooldown]);
  await page.getByRole("button", { name: "训练", exact: true }).click();
  await page.goto("/?flow=records");
  await expect(page.getByText(`${entry.group}收官-${entry.environment}`).first()).toBeVisible();
  await capture(page, `${entry.group}-${entry.environment}-history.png`);
});

test("new back and leg assets fail to the standard placeholder without wrong-exercise substitution", async ({ page }) => {
  await load(page, cases[0]);
  await page.route("**/media/personal-v16/cat-cow.mp4", (route) => route.abort());
  await page.getByRole("button", { name: /START/ }).first().click();
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible({ timeout: 8_000 });
  await page.unrouteAll();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect.poll(async () => (await saved(page)).sessions?.length, { timeout: 8_000 }).toBe(1);
  await page.route("**/media/personal-v16/child-pose-v2.webp", (route) => route.abort());
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible({ timeout: 8_000 });
});

test("new stage media keeps a square crop at the three phone viewports", async ({ page }) => {
  test.setTimeout(55_000);
  for (const entry of [cases[0], cases[2]]) {
    await load(page, entry);
    await page.getByRole("button", { name: /START/ }).first().click();
    const box = page.locator(`.exercise-media[data-media-exercise="${entry.warmup}"]`);
    await expect(box).toBeVisible({ timeout: 8_000 });
    for (const [width, height] of [[375, 812], [393, 852], [430, 932]]) {
      await page.setViewportSize({ width, height });
      const bounds = await box.boundingBox();
      expect(bounds).not.toBeNull();
      expect(Math.abs(bounds!.width - bounds!.height)).toBeLessThan(1);
      expect(bounds!.width).toBeLessThanOrEqual(357);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await capture(page, `${entry.group}-${width}x${height}-warmup.png`);
    }
  }
});
