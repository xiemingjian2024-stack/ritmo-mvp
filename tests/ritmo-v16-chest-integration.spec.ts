import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mediaForExercise } from "../src/exerciseMedia";
import { PHASE_CATALOG_VERSION, phaseById, phaseExerciseCatalog, phaseItemAvailable, phaseItemsFor } from "../src/phaseExerciseCatalog";

const warmupId = "ritmo:warmup:standing-chest-open-close";
const stretchId = "ritmo:stretch:standing-chest-stretch";
const warmupAsset = "/media/personal-v16/standing-chest-open-close.mp4";
const stretchAsset = "/media/personal-v16/standing-chest-stretch.webp";
const screenshots = "reports/ritmo-v16-chest-integration/screenshots";

function fixture(environment: "健身房" | "家里") {
  const pushup = { id: "pushup", name: "俯卧撑", muscle: "胸", equipment: "徒手", sets: 1, reps: 1, weight: 0 };
  const plan = { id: `chest-${environment}`, name: `胸部完整流程-${environment}`, environment, exercises: [pushup] };
  const next = { ...plan, id: `next-${environment}`, name: `下一个方案-${environment}` };
  return {
    dataVersion: 2, currentEnvironment: environment, environments: ["健身房", "家里"], plans: [plan, next],
    cycleIdsByEnvironment: { 健身房: environment === "健身房" ? [plan.id, next.id] : [], 家里: environment === "家里" ? [plan.id, next.id] : [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: environment === "健身房", 家里: environment === "家里" },
    sessions: [], phaseRecords: [], activeWorkout: null,
  };
}

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
}

async function load(page: Page, environment: "健身房" | "家里") {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/?flow=training");
  await page.evaluate((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), fixture(environment));
  await page.reload();
}

async function capture(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.screenshot({ path: join(screenshots, name) });
}

test("chest selection is distinct, available in both environments, and retains old IDs", () => {
  expect(PHASE_CATALOG_VERSION).toBe(5);
  expect(phaseExerciseCatalog).toHaveLength(29);
  expect(new Set(phaseExerciseCatalog.map((item) => item.id)).size).toBe(29);
  expect(phaseItemsFor("胸", "warmup").map((item) => item.id)).toEqual([warmupId]);
  expect(phaseItemsFor("胸", "cooldown").map((item) => item.id)).toEqual([stretchId]);
  expect(phaseById.get(warmupId)).toMatchObject({ target: 12, measurementType: "reps", equipment: "bodyweight", segments: ["whole"], dataVersion: 3, reviewStatus: "pending_professional_review" });
  expect(phaseById.get(stretchId)).toMatchObject({ target: 30, measurementType: "duration", equipment: "bodyweight", segments: ["whole"], dataVersion: 3, reviewStatus: "pending_professional_review" });
  for (const environment of ["健身房", "家里"]) {
    expect(phaseItemAvailable(phaseById.get(warmupId)!, environment)).toBe(true);
    expect(phaseItemAvailable(phaseById.get(stretchId)!, environment)).toBe(true);
  }
  expect(phaseById.has("ritmo:warmup:low-high-chest-squeeze")).toBe(true);
  expect(phaseById.has("ritmo:stretch:doorway-single-arm-chest")).toBe(true);
  expect(mediaForExercise("ritmo:warmup:low-high-chest-squeeze").placeholder).toBe(true);
  expect(mediaForExercise("ritmo:stretch:doorway-single-arm-chest").placeholder).toBe(true);
  for (const [id, asset, original] of [
    [warmupId, warmupAsset, "reports/ritmo-v16-chest-candidates/warmup/sequence.mp4"],
    [stretchId, stretchAsset, "reports/ritmo-v16-chest-candidates/stretch/standing-chest-stretch-720.webp"],
  ]) {
    const media = mediaForExercise(id);
    expect(media.mediaId).toBe(id);
    expect(media.personalStatus).toBe("personal_test_ready");
    expect(media.professionalApproval).toBe("not_verified");
    expect(media.animation ?? media.staticImage).toBe(asset);
    const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(hash(`public${asset}`)).toBe(hash(original));
  }
  expect(phaseItemsFor("肩", "warmup").map((item) => item.id)).toEqual(["ritmo:warmup:light-lateral-raise", "ritmo:warmup:lean-lateral-raise"]);
  expect(phaseItemsFor("手臂", "cooldown").map((item) => item.id)).toEqual(["ritmo:stretch:overhead-triceps"]);
  expect(phaseItemsFor("核心", "cooldown").map((item) => item.id)).toEqual(["ritmo:stretch:prone-abdominal-extension"]);
});

for (const environment of ["健身房", "家里"] as const) {
  test(`${environment} chest: warmup → strength → stretch → summary/history`, async ({ page }) => {
    test.setTimeout(110_000);
    mkdirSync(screenshots, { recursive: true });
    await load(page, environment);
    await page.getByRole("button", { name: /START/ }).first().click();
    await expect(page.locator(".countdown-screen strong")).toHaveText("3");
    const warmup = page.locator(`.exercise-media[data-media-exercise="${warmupId}"]`);
    await expect(warmup).toBeVisible({ timeout: 8_000 });
    const video = warmup.locator("video");
    await expect(video).toHaveAttribute("src", warmupAsset);
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveJSProperty("muted", true);
    await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.readyState)).toBeGreaterThan(1);
    await expect(page.locator(".target-summary")).toContainText("12 次");
    expect(await warmup.evaluate((node) => (node as HTMLElement).offsetWidth)).toBe(357);
    const state = await saved(page);
    expect(state.activeWorkout.warmupIds).toEqual([warmupId]);
    expect(state.activeWorkout.cooldownIds).toEqual([stretchId]);
    await capture(page, `${environment}-warmup-active.png`);
    await page.getByRole("button", { name: "暂停 / 调整" }).click();
    await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.paused)).toBe(true);
    const remaining = (await saved(page)).activeWorkout.phaseRemaining;
    await page.reload();
    await expect(warmup).toBeVisible();
    await page.waitForTimeout(400);
    expect((await saved(page)).activeWorkout.phaseRemaining).toBe(remaining);
    await page.getByRole("button", { name: "继续训练" }).click();
    await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.paused)).toBe(false);
    await expect.poll(async () => (await saved(page)).phaseRecords?.[0]?.items?.some((item: { itemId: string; status: string; actual: number }) => item.itemId === warmupId && item.status === "completed" && item.actual === 12), { timeout: 15_000 }).toBe(true);
    await expect(page.locator('.transition-art[data-media-exercise="pushup"]')).toBeVisible();
    await page.getByRole("button", { name: "START" }).click();
    await expect(page.locator(".countdown-screen strong")).toHaveText("3");
    await expect.poll(async () => (await saved(page)).sessions?.length, { timeout: 8_000 }).toBe(1);
    const strength = await saved(page);
    expect(strength.sessions[0].status).toBe("completed");
    expect(strength.sessions[0].exercises).toHaveLength(1);
    expect(strength.cycleIndexByEnvironment[environment]).toBe(1);
    const nextStretch = page.locator(`.transition-art[data-media-exercise="${stretchId}"]`);
    await expect(nextStretch.locator("img")).toHaveAttribute("src", stretchAsset);
    await capture(page, `${environment}-stretch-next.png`);
    await page.reload();
    expect((await saved(page)).sessions).toHaveLength(1);
    await expect(nextStretch.locator("img")).toHaveAttribute("src", stretchAsset);
    await page.getByRole("button", { name: "START" }).click();
    await expect(page.locator(".countdown-screen strong")).toHaveText("3");
    const stretch = page.locator(`.exercise-media[data-media-exercise="${stretchId}"]`);
    await expect(stretch).toBeVisible({ timeout: 8_000 });
    await expect(stretch.locator("img")).toHaveJSProperty("naturalWidth", 720);
    expect(await stretch.evaluate((node) => (node as HTMLElement).offsetWidth)).toBe(357);
    await expect(page.locator(".target-summary")).toContainText("30 秒");
    await capture(page, `${environment}-stretch-active.png`);
    await page.getByRole("button", { name: "暂停 / 调整" }).click();
    const hold = (await saved(page)).activeWorkout.phaseRemaining;
    await page.waitForTimeout(600);
    expect((await saved(page)).activeWorkout.phaseRemaining).toBe(hold);
    await page.getByRole("button", { name: "继续" }).click();
    await expect.poll(async () => (await saved(page)).phaseRecords?.[0]?.items?.some((item: { itemId: string; status: string; actual: number }) => item.itemId === stretchId && item.status === "completed" && item.actual === 30), { timeout: 36_000 }).toBe(true);
    await expect(page.locator(".records-screen")).toBeVisible();
    await capture(page, `${environment}-summary.png`);
    const finished = await saved(page);
    expect(finished.sessions).toHaveLength(1);
    expect(finished.cycleIndexByEnvironment[environment]).toBe(1);
    expect(finished.phaseRecords[0].items.map((item: { itemId: string }) => item.itemId)).toEqual([warmupId, stretchId]);
    await page.getByRole("button", { name: "训练", exact: true }).click();
    await page.goto("/?flow=records");
    await expect(page.getByText(`胸部完整流程-${environment}`).first()).toBeVisible();
    await capture(page, `${environment}-history.png`);
  });
}

test("chest warmup and stretch failure use placeholders without borrowing old media", async ({ page }) => {
  await load(page, "家里");
  await page.route(`**${warmupAsset}`, (route) => route.abort());
  await page.getByRole("button", { name: /START/ }).first().click();
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible({ timeout: 8_000 });
  expect((await saved(page)).sessions).toHaveLength(0);
  await page.unrouteAll();
  await page.route(`**${stretchAsset}`, (route) => route.abort());
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect.poll(async () => (await saved(page)).sessions?.length, { timeout: 8_000 }).toBe(1);
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible();
});

test("chest phase skips leave a completed strength Session and NEXT intact", async ({ page }) => {
  await load(page, "家里");
  await page.getByRole("button", { name: /START/ }).first().click();
  await expect(page.locator(`.exercise-media[data-media-exercise="${warmupId}"]`)).toBeVisible();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect.poll(async () => (await saved(page)).sessions?.length, { timeout: 8_000 }).toBe(1);
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator(`.exercise-media[data-media-exercise="${stretchId}"]`)).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过当前动作" }).click();
  await expect(page.locator(".records-screen")).toBeVisible();
  const state = await saved(page);
  expect(state.sessions).toHaveLength(1);
  expect(state.sessions[0].status).toBe("completed");
  expect(state.cycleIndexByEnvironment["家里"]).toBe(1);
  expect(state.phaseRecords[0].items.map((item: { itemId: string; status: string }) => [item.itemId, item.status])).toEqual([[warmupId, "skipped"], [stretchId, "skipped"]]);
});

test("partial chest strength still does not advance NEXT after cooldown exit", async ({ page }) => {
  test.setTimeout(45_000);
  const data = fixture("健身房");
  data.plans[0].exercises.push({ id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 1, reps: 100, weight: 20 });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/?flow=training");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), data);
  await page.reload();
  await page.getByRole("button", { name: /START/ }).first().click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator('.transition-art[data-media-exercise="smith"]')).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator('.exercise-media[data-media-exercise="smith"]')).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "结束训练" }).click();
  await page.getByRole("button", { name: /提前结束/ }).click();
  await expect(page.locator(`.transition-art[data-media-exercise="${stretchId}"]`)).toBeVisible();
  let state = await saved(page);
  expect(state.sessions).toHaveLength(1);
  expect(state.sessions[0].status).toBe("partial");
  expect(state.cycleIndexByEnvironment["健身房"]).toBe(0);
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.locator(`.exercise-media[data-media-exercise="${stretchId}"]`)).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个拉伸阶段" }).click();
  await page.getByRole("button", { name: "确认结束拉伸并查看记录" }).click();
  state = await saved(page);
  expect(state.sessions).toHaveLength(1);
  expect(state.sessions[0].status).toBe("partial");
  expect(state.cycleIndexByEnvironment["健身房"]).toBe(0);
});
