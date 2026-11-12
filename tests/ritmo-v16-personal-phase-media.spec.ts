import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mediaForExercise } from "../src/exerciseMedia";
import { phaseById, phaseExerciseCatalog, phaseItemAvailable, phaseItemsFor } from "../src/phaseExerciseCatalog";
import { personalPhaseMedia } from "../src/personalPhaseMedia";
import { personalSequenceMedia } from "../src/personalSequenceMedia";

const reviewCsv = "reports/ritmo-v16-arm-core-integration/personal-test-candidates-9.csv";
const shots = "reports/ritmo-v16-personal-phase-media/screenshots";
const strength = { id: "raise", name: "哑铃侧平举", muscle: "肩", equipment: "哑铃", sets: 1, reps: 10, weight: 2 };

function candidateIds() {
  return readFileSync(reviewCsv, "utf-8").replace(/^\uFEFF/, "").trim().split(/\r?\n/).slice(1).map((line) => line.split(",")[0]);
}
function assets(id: string) {
  const media = mediaForExercise(id);
  return media.segments ? Object.values(media.segments).flatMap((part) => [part?.animation ?? part?.staticImage].filter(Boolean) as string[]) : [media.animation ?? media.staticImage].filter(Boolean) as string[];
}
function stageData(id: string, segmentIndex = 0, remaining?: number, stage = "active") {
  const item = phaseById.get(id)!;
  const phaseRemaining = remaining ?? item.target;
  const plan = { id: "phase-media-plan", name: "阶段媒体测试", environment: "健身房", exercises: [strength] };
  const now = new Date().toISOString();
  const activeWorkout = {
    id: "phase-media-session", source: "cycle", environmentId: "健身房", startedAt: now,
    planId: plan.id, planName: plan.name, exercises: [strength], exerciseIndex: 0,
    setNumber: 1, rep: 1, targetReps: 10, weight: 2, stage, phase: item.phase,
    primaryGroup: item.groups[0], warmupIds: item.phase === "warmup" ? [id] : [],
    cooldownIds: item.phase === "cooldown" ? [id] : [], phaseItemIndex: 0,
    phaseSegmentIndex: segmentIndex, phaseRemaining, phaseDeadlineAt: null,
    phaseAccumulated: 0, phaseHadEarly: false, restRemaining: 90,
    paused: true, completedSets: {},
  };
  return {
    dataVersion: 2, currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [plan], cycleIdsByEnvironment: { 健身房: [plan.id], 家里: [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false },
    sessions: [], phaseRecords: [], activeWorkout,
  };
}
async function load(page: Page, id: string, segmentIndex = 0, remaining?: number, stage = "active") {
  await page.goto("/?flow=training");
  await page.evaluate((data) => {
    const payload = JSON.stringify(data);
    localStorage.setItem("ritmo-demo-v3", payload);
    sessionStorage.setItem("ritmo-phase-test-fixture", payload);
  }, stageData(id, segmentIndex, remaining, stage));
  await page.reload();
}

test("audited phase IDs resolve to local media with preserved source provenance", () => {
  const historicalIds = candidateIds();
  expect(historicalIds).toHaveLength(9);
  const ids = [...historicalIds, "ritmo:warmup:standing-chest-open-close", "ritmo:stretch:standing-chest-stretch", "ritmo:warmup:cat-cow", "ritmo:warmup:bodyweight-squat", "ritmo:stretch:child-pose", "ritmo:stretch:standing-quad", "ritmo:stretch:double-knee-hug"];
  expect(new Set(ids).size).toBe(16);
  expect(Object.keys(personalPhaseMedia).sort()).toEqual([...ids].sort());
  for (const id of ids) {
    const item = phaseById.get(id);
    const media = mediaForExercise(id);
    expect(item).toBeTruthy();
    expect(media.personalStatus).toBe("personal_test_ready");
    expect(media.professionalApproval).toBe("not_verified");
    expect(media.reviewOnly).toBe(true);
    expect(media.placeholder).toBe(false);
    expect(assets(id)).toHaveLength(item!.segments.length);
    const originals = media.sourcePath!.split(";");
    for (const [index, asset] of assets(id).entries()) {
      const deployed = readFileSync(`public${asset}`);
      const original = readFileSync(originals[index]);
      if (!asset.endsWith(".webp")) expect(createHash("sha256").update(deployed).digest("hex")).toBe(createHash("sha256").update(original).digest("hex"));
      else expect(deployed.length).toBeGreaterThan(1000);
    }
  }
  for (const item of personalSequenceMedia.items.filter((entry) => entry.status === "personal_test_ready" && "asset" in entry)) {
    expect(mediaForExercise(item.id).animation).toBe(item.asset);
  }
  for (const item of phaseExerciseCatalog.filter((entry) => !ids.includes(entry.id))) {
    expect(assets(item.id), item.id).toHaveLength(0);
  }
});

test("the recommended shoulder sequence has correct media in gym and home", () => {
  for (const environment of ["健身房", "家里"]) {
    for (const phase of ["warmup", "cooldown"] as const) {
      const items = phaseItemsFor("肩", phase);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(phaseItemAvailable(item, environment)).toBe(true);
        expect(mediaForExercise(item.id).personalStatus).toBe("personal_test_ready");
        expect(assets(item.id)).toHaveLength(item.segments.length);
      }
    }
  }
});

test("real warmup video loads, loops, pauses, resumes and survives refresh", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await load(page, "ritmo:warmup:lean-lateral-raise");
  const box = page.locator('.exercise-media[data-media-exercise="ritmo:warmup:lean-lateral-raise"]');
  const video = box.locator("video");
  await expect(video).toHaveAttribute("src", "/media/personal-v16/lean-lateral-raise.mp4");
  await expect(video).toHaveAttribute("loop", "");
  await expect(video).toHaveJSProperty("muted", true);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(1);
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.1);
  await video.evaluate((v: HTMLVideoElement) => { v.currentTime = v.duration - 0.1; });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeLessThan(0.5);
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: join(shots, "warmup-active-393x852.png") });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.getByRole("button", { name: "继续训练" }).first().click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await page.reload();
  await expect(video).toHaveAttribute("src", "/media/personal-v16/lean-lateral-raise.mp4");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(1);
  await page.route("**/media/personal-v16/lean-lateral-raise.mp4", (route) => route.abort());
  await page.reload();
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible();
  await page.unrouteAll();
});

test("real cooldown static sides switch after five seconds without changing Session", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await load(page, "ritmo:stretch:cross-body-rear-delt", 0, 1);
  const box = page.locator('.exercise-media[data-media-exercise="ritmo:stretch:cross-body-rear-delt"]');
  const image = box.locator("img");
  await expect(image).toHaveAttribute("src", "/media/personal-v16/cross-body-rear-delt-left.png");
  await expect.poll(() => image.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1254);
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: join(shots, "stretch-left-393x852.png") });
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.getByText("准备换侧 · 5 秒")).toBeVisible({ timeout: 4000 });
  await expect(box).toHaveAttribute("data-media-segment", "right");
  await expect(image).toHaveAttribute("src", "/media/personal-v16/cross-body-rear-delt-right.png");
  await page.screenshot({ path: join(shots, "stretch-right-switch-393x852.png") });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.reload();
  await expect(box).toHaveAttribute("data-media-segment", "right");
  await expect(image).toHaveAttribute("src", "/media/personal-v16/cross-body-rear-delt-right.png");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(saved.sessions).toHaveLength(0);
  expect(saved.cycleIndexByEnvironment["健身房"]).toBe(0);
});

test("reused plank MP4 loads in a restored timed warmup", async ({ page }) => {
  await load(page, "ritmo:warmup:forearm-plank-activation");
  const box = page.locator('.exercise-media[data-media-exercise="ritmo:warmup:forearm-plank-activation"]');
  await expect(box).toBeVisible();
  const video = box.locator("video");
  await expect(video).toHaveAttribute("src", "/media/personal-v15/plank.mp4");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(1);
});

test("the shared next-action page shows the same audited phase media", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await load(page, "ritmo:warmup:light-alternating-curl", 0, 12, "phase-intro");
  const box = page.locator('.transition-art[data-media-exercise="ritmo:warmup:light-alternating-curl"]');
  const video = box.locator("video");
  await expect(video).toHaveAttribute("src", "/media/personal-v16/light-alternating-curl.mp4");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(1);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.1);
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: join(shots, "warmup-next-action-393x852.png") });
});

test("phase ready media uses the phase ID, not a related strength exercise ID", async ({ page }) => {
  for (const [id, asset] of [
    ["ritmo:warmup:forearm-plank-activation", "/media/personal-v15/plank.mp4"],
    ["ritmo:warmup:bodyweight-squat", "/media/personal-v16/bodyweight-squat-v16.mp4"],
  ] as const) {
    await load(page, id, 0, undefined, "phase-intro");
    const box = page.locator(`.transition-art[data-media-exercise="${id}"]`);
    await expect(box).toBeVisible();
    if (asset) await expect(box.locator("video")).toHaveAttribute("src", asset);
    else {
      await expect(box.locator("video, img")).toHaveCount(0);
      await expect(box).toContainText("正确素材准备中");
    }
  }
});

test("all nine render in the real app at three phone sizes and excluded IDs stay placeholders", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const fixture = sessionStorage.getItem("ritmo-phase-test-fixture");
    if (fixture) localStorage.setItem("ritmo-demo-v3", fixture);
  });
  for (const [width, height] of [[375, 812], [393, 852], [430, 932]] as const) {
    await page.setViewportSize({ width, height });
    for (const id of candidateIds()) {
      await load(page, id);
      const box = page.locator(`.exercise-media[data-media-exercise="${id}"]`);
      const visual = box.locator("video, img");
      await expect(visual).toHaveCount(1);
      await expect.poll(() => visual.evaluate((v: HTMLVideoElement | HTMLImageElement) => v.tagName === "VIDEO" ? v.readyState : v.naturalWidth)).toBeGreaterThan(0);
      expect(await box.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(width);
      // In the installed web app the media slot fills the real phone viewport,
      // keeping the 18px side gutters and a square crop at every width.
      expect(await box.evaluate((element) => (element as HTMLElement).offsetWidth)).toBe(Math.min(width - 36, 357));
      expect(await box.evaluate((element) => (element as HTMLElement).offsetHeight)).toBe(Math.min(width - 36, 357));
    }
  }
  await load(page, "ritmo:warmup:shoulder-circles");
  await expect(page.locator(".exercise-media")).toContainText("正确素材准备中");
});
