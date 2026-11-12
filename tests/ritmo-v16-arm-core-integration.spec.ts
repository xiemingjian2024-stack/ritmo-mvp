import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mediaForExercise } from "../src/exerciseMedia";
import { PHASE_CATALOG_VERSION, phaseById, phaseExerciseCatalog, phaseItemAvailable, phaseItemsFor } from "../src/phaseExerciseCatalog";

const armId = "ritmo:stretch:overhead-triceps";
const coreId = "ritmo:stretch:prone-abdominal-extension";
const oldCoreId = "ritmo:stretch:prone-press-up-rotation";
const shots = "reports/ritmo-v16-arm-core-integration/screenshots";

const files = [
  ["reports/ritmo-v16-phase-media-batch1/overhead-triceps/left.png", "public/media/personal-v16/overhead-triceps-left.png"],
  ["reports/ritmo-v16-phase-media-batch1/overhead-triceps/right.png", "public/media/personal-v16/overhead-triceps-right.png"],
  ["reports/ritmo-v16-phase-media-batch1/abdomen-rotation/center.png", "public/media/personal-v16/prone-abdominal-extension.png"],
] as const;

function fixture(group: "手臂" | "核心", environment: "健身房" | "家里") {
  const exercise = { id: `qa-${group}`, name: `${group}流程测试动作`, muscle: group, equipment: "徒手", sets: 1, reps: 1, weight: 0 };
  const plan = { id: `qa-${group}-${environment}`, name: `${group}完整流程`, environment, exercises: [exercise] };
  const nextPlan = { ...plan, id: `${plan.id}-next`, name: `${group}下一循环方案` };
  return {
    dataVersion: 2, currentEnvironment: environment, environments: ["健身房", "家里"], plans: [plan, nextPlan],
    cycleIdsByEnvironment: { 健身房: environment === "健身房" ? [plan.id, nextPlan.id] : [], 家里: environment === "家里" ? [plan.id, nextPlan.id] : [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: environment === "健身房", 家里: environment === "家里" },
    sessions: [], phaseRecords: [], activeWorkout: null,
  };
}

async function saved(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}")); }

async function shortenCurrentHold(page: Page) {
  const value = await saved(page);
  value.activeWorkout = { ...value.activeWorkout, phaseRemaining: 1, phaseDeadlineAt: null, paused: true };
  await page.evaluate((next) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(next)), value);
  await page.reload();
  await page.getByRole("button", { name: "继续训练" }).click();
}

test("stable IDs, original composite history, exact media bytes and both environments", () => {
  expect(PHASE_CATALOG_VERSION).toBe(5);
  expect(phaseExerciseCatalog).toHaveLength(29);
  expect(new Set(phaseExerciseCatalog.map((item) => item.id)).size).toBe(29);
  expect(phaseById.get(oldCoreId)?.segments).toEqual(["center", "left", "right"]);
  expect(mediaForExercise(oldCoreId).placeholder).toBe(true);
  expect(phaseById.get(coreId)).toMatchObject({ name: "俯卧腹部伸展", target: 20, segments: ["whole"], measurementType: "duration", dataVersion: 2, reviewStatus: "pending_professional_review" });
  expect(phaseById.get(armId)).toMatchObject({ target: 30, segments: ["left", "right"], measurementType: "duration" });
  for (const group of ["手臂", "核心"] as const) {
    for (const environment of ["健身房", "家里"]) {
      const items = [...phaseItemsFor(group, "warmup"), ...phaseItemsFor(group, "cooldown")];
      expect(items.length).toBeGreaterThan(1);
      expect(items.every((item) => phaseItemAvailable(item, environment))).toBe(true);
      expect(items.every((item) => mediaForExercise(item.id).personalStatus === "personal_test_ready")).toBe(true);
    }
  }
  expect(phaseItemsFor("手臂", "cooldown").map((item) => item.id)).toEqual([armId]);
  expect(phaseItemsFor("核心", "cooldown").map((item) => item.id)).toEqual([coreId]);
  for (const [source, deployed] of files) {
    const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(hash(deployed)).toBe(hash(source));
  }
  expect(mediaForExercise(armId).segments?.left?.staticImage).toBe("/media/personal-v16/overhead-triceps-left.png");
  expect(mediaForExercise(armId).segments?.right?.staticImage).toBe("/media/personal-v16/overhead-triceps-right.png");
  expect(mediaForExercise(coreId).staticImage).toBe("/media/personal-v16/prone-abdominal-extension.png");
});

for (const group of ["手臂", "核心"] as const) {
  for (const environment of ["健身房", "家里"] as const) {
    test(`${group} ${environment}: warmup → strength Session/NEXT → correct cooldown and summary`, async ({ page }) => {
      test.setTimeout(75_000);
      await page.setViewportSize({ width: 393, height: 852 });
      await page.goto("/?flow=training");
      await page.evaluate((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), fixture(group, environment));
      await page.reload();
      await page.getByRole("button", { name: /START/ }).first().click();
      await expect.poll(async () => (await saved(page)).activeWorkout?.primaryGroup).toBe(group);
      expect((await saved(page)).activeWorkout.warmupIds).toEqual(phaseItemsFor(group, "warmup").map((item) => item.id));
      expect((await saved(page)).activeWorkout.cooldownIds).toEqual(phaseItemsFor(group, "cooldown").map((item) => item.id));
      const firstWarmup = phaseItemsFor(group, "warmup")[0];
      await expect(page.locator(`.exercise-media[data-media-exercise="${firstWarmup.id}"]`)).toBeVisible({ timeout: 8_000 });
      mkdirSync(shots, { recursive: true });
      if (environment === "健身房") await page.screenshot({ path: join(shots, `${group}-warmup-393.png`) });
      await page.getByRole("button", { name: "暂停 / 调整" }).click();
      await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
      await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
      await expect.poll(async () => (await saved(page)).sessions?.length, { timeout: 12_000 }).toBe(1);
      const afterStrength = await saved(page);
      expect(afterStrength.sessions[0].status).toBe("completed");
      expect(afterStrength.sessions[0].exercises).toHaveLength(1);
      expect(afterStrength.cycleIndexByEnvironment[environment]).toBe(1);
      const id = group === "手臂" ? armId : coreId;
      await expect(page.locator(`.transition-art[data-media-exercise="${id}"] img`)).toHaveAttribute("src", group === "手臂" ? "/media/personal-v16/overhead-triceps-left.png" : "/media/personal-v16/prone-abdominal-extension.png");
      if (environment === "健身房") await page.screenshot({ path: join(shots, `${group}-next-393.png`) });
      await page.getByRole("button", { name: "START" }).click();
      const active = page.locator(`.exercise-media[data-media-exercise="${id}"]`);
      await expect(active).toBeVisible({ timeout: 8_000 });
      await expect(active.locator("img")).toHaveJSProperty("naturalWidth", 1254);
      expect(await active.evaluate((element) => (element as HTMLElement).offsetWidth)).toBe(357);
      if (environment === "健身房") await page.screenshot({ path: join(shots, `${group}-active-393.png`) });
      await shortenCurrentHold(page);
      if (group === "手臂") {
        await expect(page.getByText("准备换侧 · 5 秒")).toBeVisible({ timeout: 4_000 });
        await expect(active).toHaveAttribute("data-media-segment", "right");
        await expect(active.locator("img")).toHaveAttribute("src", "/media/personal-v16/overhead-triceps-right.png");
        await page.getByRole("button", { name: "暂停 / 调整" }).click();
        const frozen = (await saved(page)).activeWorkout.phaseRemaining;
        await page.reload();
        expect((await saved(page)).activeWorkout.phaseSegmentIndex).toBe(1);
        await page.waitForTimeout(400);
        expect((await saved(page)).activeWorkout.phaseRemaining).toBe(frozen);
        if (environment === "健身房") await page.screenshot({ path: join(shots, "手臂-right-switch-393.png") });
        await page.getByRole("button", { name: "继续训练" }).click();
        await expect(active).toHaveAttribute("data-media-segment", "right");
        await expect(page.getByText("准备换侧 · 5 秒")).toBeHidden({ timeout: 8_000 });
        await shortenCurrentHold(page);
      }
      await expect.poll(async () => (await saved(page)).phaseRecords?.[0]?.items?.some((item: { itemId: string; status: string }) => item.itemId === id && item.status === "completed"), { timeout: 5_000 }).toBe(true);
      await expect(page.locator(".records-screen")).toBeVisible();
      const final = await saved(page);
      expect(final.sessions).toHaveLength(1);
      expect(final.sessions[0].status).toBe("completed");
      expect(final.cycleIndexByEnvironment[environment]).toBe(1);
      expect(final.phaseRecords[0].items.find((item: { itemId: string }) => item.itemId === id).actual).toBe(group === "手臂" ? 60 : 20);
      if (environment === "健身房") await page.screenshot({ path: join(shots, `${group}-summary-393.png`) });
      await page.getByRole("button", { name: "训练", exact: true }).click();
      await page.goto("/?flow=records");
      await expect(page.getByText(`${group}完整流程`).first()).toBeVisible();
      if (environment === "健身房") await page.screenshot({ path: join(shots, `${group}-history-393.png`) });
    });
  }
}

test("new media fail closed and original rotation cannot borrow center pose", async ({ page }) => {
  await page.goto("/?flow=training");
  await page.evaluate((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), fixture("核心", "家里"));
  await page.reload();
  expect(mediaForExercise(oldCoreId).placeholder).toBe(true);
  await page.route("**/media/personal-v16/prone-abdominal-extension.png", (route) => route.abort());
  const state = await saved(page);
  const now = new Date().toISOString();
  state.activeWorkout = { id: "failed-media", source: "cycle", environmentId: "家里", startedAt: now, planId: state.plans[0].id, planName: state.plans[0].name, exercises: state.plans[0].exercises, exerciseIndex: 0, setNumber: 1, rep: 1, targetReps: 1, weight: 0, stage: "active", phase: "cooldown", primaryGroup: "核心", warmupIds: [], cooldownIds: [coreId], phaseItemIndex: 0, phaseSegmentIndex: 0, phaseRemaining: 20, phaseDeadlineAt: null, phaseAccumulated: 0, phaseHadEarly: false, restRemaining: 90, paused: true, completedSets: {} };
  await page.evaluate((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), state);
  await page.reload();
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible();
});

for (const [group, environment, action] of [["手臂", "家里", "item"], ["核心", "健身房", "stage"]] as const) {
  test(`${group} cooldown ${action === "item" ? "single-action skip" : "whole-stage skip"} preserves completed strength`, async ({ page }) => {
    test.setTimeout(35_000);
    await page.goto("/?flow=training");
    await page.evaluate((data) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(data)), fixture(group, environment));
    await page.reload();
    await page.getByRole("button", { name: /START/ }).first().click();
    await page.getByRole("button", { name: "暂停 / 调整" }).click();
    await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
    await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
    await expect.poll(async () => (await saved(page)).sessions?.length, { timeout: 12_000 }).toBe(1);
    await page.getByRole("button", { name: "START" }).click();
    await expect.poll(async () => (await saved(page)).activeWorkout?.phase).toBe("cooldown");
    await page.getByRole("button", { name: "暂停 / 调整" }).click();
    if (action === "item") {
      await page.getByRole("button", { name: "跳过当前动作" }).click();
      await expect(page.locator(".records-screen")).toBeVisible();
    } else {
      await page.getByRole("button", { name: "跳过整个拉伸阶段" }).click();
      await page.getByRole("button", { name: "确认结束拉伸并查看记录" }).click();
    }
    await expect(page.locator(".records-screen")).toBeVisible();
    const state = await saved(page);
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].status).toBe("completed");
    expect(state.cycleIndexByEnvironment[environment]).toBe(1);
    const id = group === "手臂" ? armId : coreId;
    expect(state.phaseRecords[0].items.find((item: { itemId: string }) => item.itemId === id)?.status).toBe("skipped");
  });
}
