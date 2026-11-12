import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { EXERCISE_DATA_VERSION, MUSCLE_REGIONS, MUSCLE_TO_SVG_REGION, exerciseCatalog, getExerciseSpec } from "../src/exerciseCatalog";
import { mediaForExercise } from "../src/exerciseMedia";

test("20 stable IDs have versioned metadata and mapped primary regions", () => {
  expect(exerciseCatalog.map((item) => item.id)).toEqual([
    "smith", "incline", "fly", "pushup", "pulldown", "row", "one-arm-row", "straight-pull",
    "raise", "press", "curl", "triceps", "plank", "crunch", "squat", "leg-press",
    "pike-pushup", "superman", "body-squat", "glute-bridge",
  ]);
  expect(new Set(exerciseCatalog.map((item) => item.id)).size).toBe(20);
  expect(Object.keys(MUSCLE_REGIONS)).toHaveLength(19);
  const svgRegions = new Set(["front", "back"].flatMap((side) => [...readFileSync(`public/assets/muscle/${side}.svg`, "utf8").matchAll(/data-group="([A-Z_]+)"/g)].map((match) => match[1])));
  expect(svgRegions).toEqual(new Set(Object.values(MUSCLE_TO_SVG_REGION)));
  for (const item of exerciseCatalog) {
    expect(item.dataVersion).toBe(EXERCISE_DATA_VERSION);
    expect(item.reviewStatus).toBe("pending_professional_review");
    expect(item.primaryMuscleIds.length).toBeGreaterThan(0);
    for (const muscle of [...item.primaryMuscleIds, ...item.secondaryMuscleIds]) expect(MUSCLE_REGIONS[muscle]).toBeTruthy();
    expect(item.mediaId).toBe(item.id);
  }
  expect(getExerciseSpec("plank")?.measurementType).toBe("duration");
  expect(getExerciseSpec("plank")?.targetDurationSeconds).toBe(30);
  expect(mediaForExercise("incline").animation).toBe("/media/personal-v15/incline.mp4");
  expect(mediaForExercise("incline").staticImage).toBeUndefined();
});

test("non-Smith NEXT does not reuse Smith image", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ritmo-demo-v3", JSON.stringify({
    currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [{ id: "back", name: "背部", environment: "健身房", exercises: [{ id: "row", name: "坐姿划船", muscle: "背", equipment: "划船器", sets: 3, reps: 10, weight: 25 }] }],
    cycleIdsByEnvironment: { 健身房: ["back"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [], activeWorkout: null,
  })));
  await page.goto("/?flow=training");
  await expect(page.locator(".training-next-hero img")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "当前训练暂无匹配动作图片" })).toBeVisible();
});

test("legacy plan and session remain readable without changing the historical set", async ({ page }) => {
  const oldSet = { setNumber: 1, targetReps: 1, actualReps: 1, weight: 0, completed: true };
  await page.addInitScript((set) => localStorage.setItem("ritmo-demo-v3", JSON.stringify({
    currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [{ id: "legacy", name: "旧核心方案", environment: "健身房", exercises: [{ id: "plank", name: "平板支撑", muscle: "核心", equipment: "徒手", sets: 1, reps: 1, weight: 0 }] }],
    cycleIdsByEnvironment: { 健身房: ["legacy"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false },
    sessions: [{ id: "old-session", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), planId: "legacy", planName: "旧核心方案", status: "completed", completed: true, exercises: [{ id: "plank", name: "平板支撑", muscle: "核心", equipment: "徒手", sets: 1, reps: 1, weight: 0, completedSets: [set] }] }], activeWorkout: null,
  })), oldSet);
  await page.goto("/?flow=plans");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(saved.dataVersion).toBe(2); // V1.6 adds phase records without rewriting legacy Session snapshots.
  expect(saved.plans[0].exercises[0].targetDurationSeconds).toBe(30);
  expect(saved.sessions[0].exercises[0].completedSets[0]).toMatchObject(oldSet);
  expect(saved.sessions[0].exercises[0].completedSets[0].measurementType).toBeUndefined();
  await page.goto("/?flow=records");
  await expect(page.getByText("旧记录：时长未知")).toBeVisible();
});

test("timed plank pauses, resumes and saves duration instead of one repetition", async ({ page }) => {
  test.setTimeout(20_000);
  const plank = { id: "plank", name: "平板支撑", muscle: "核心", equipment: "徒手", sets: 1, reps: 1, weight: 0, targetDurationSeconds: 3 };
  await page.addInitScript((exercise) => localStorage.setItem("ritmo-demo-v3", JSON.stringify({
    currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [{ id: "core", name: "核心", environment: "健身房", exercises: [exercise] }],
    cycleIdsByEnvironment: { 健身房: ["core"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [],
    activeWorkout: { id: "timed-test", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "core", planName: "核心", exercises: [exercise], exerciseIndex: 0, setNumber: 1, targetReps: 1, targetDurationSeconds: 3, activeRemainingSeconds: 3, weight: 0, stage: "active", restRemaining: 90, paused: true, completedSets: {} },
  })), plank);
  await page.goto("/?flow=training");
  await expect(page.locator(".target-summary")).toContainText("3 秒");
  await expect(page.locator(".rep-count")).toContainText("00:03");
  await page.waitForTimeout(1200);
  await expect(page.locator(".rep-count")).toContainText("00:03");
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.getByText("训练已完成并保存")).toBeVisible({ timeout: 6_000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  const set = saved.sessions[0].exercises[0].completedSets[0];
  expect(set.measurementType).toBe("duration");
  expect(set.targetDurationSeconds).toBe(3);
  expect(set.recordedDurationSeconds).toBe(3);
  expect(set.recordedReps).toBe(0);
  expect(saved.cycleIndexByEnvironment.健身房).toBe(0);
});

test("saving timed-set parameters returns to the active screen and resumes seconds", async ({ page }) => {
  const plank = { id: "plank", name: "平板支撑", muscle: "核心", equipment: "徒手", sets: 2, reps: 0, weight: 0, targetDurationSeconds: 8 };
  await page.addInitScript((exercise) => localStorage.setItem("ritmo-demo-v3", JSON.stringify({
    currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [{ id: "core", name: "核心", environment: "健身房", exercises: [exercise] }],
    cycleIdsByEnvironment: { 健身房: ["core"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [],
    activeWorkout: { id: "timed-edit", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "core", planName: "核心", exercises: [exercise], exerciseIndex: 0, setNumber: 1, targetReps: 0, targetDurationSeconds: 8, activeRemainingSeconds: 8, weight: 0, stage: "active", restRemaining: 90, paused: true, completedSets: {} },
  })), plank);
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "调整参数" }).click();
  await page.getByRole("button", { name: "增加下一组秒数" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect(page.locator(".active-content")).toBeVisible();
  await expect(page.getByRole("heading", { name: "调整下一组" })).toHaveCount(0);
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"))).activeWorkout.nextSetAdjustment?.targetDurationSeconds).toBe(9);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(state.activeWorkout.targetDurationSeconds).toBe(8);
  expect(state.activeWorkout.paused).toBe(false);
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"))).activeWorkout.activeRemainingSeconds, { timeout: 3_000 }).toBeLessThan(8);
});

test("timed plank remains paused after refresh and keeps zero weight", async ({ page }) => {
  const plank = { id: "plank", name: "平板支撑", muscle: "核心", equipment: "徒手", sets: 2, reps: 1, weight: 0 };
  await page.addInitScript((exercise) => localStorage.setItem("ritmo-demo-v3", JSON.stringify({
    currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [{ id: "core", name: "核心", environment: "健身房", exercises: [exercise] }],
    cycleIdsByEnvironment: { 健身房: ["core"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [],
    activeWorkout: { id: "timed-refresh", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(), planId: "core", planName: "核心", exercises: [exercise], exerciseIndex: 0, setNumber: 1, targetReps: 1, weight: 0, stage: "active", restRemaining: 90, paused: true, completedSets: {} },
  })), plank);
  await page.goto("/?flow=training");
  await expect(page.locator(".rep-count")).toContainText("00:30");
  await page.reload();
  await expect(page.locator(".rep-count")).toContainText("00:30");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(saved.activeWorkout.paused).toBe(true);
  expect(saved.activeWorkout.weight).toBe(0);
  expect(saved.sessions).toHaveLength(0);
});

test("old session heatmap highlights only the exercise's primary region", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ritmo-demo-v3", JSON.stringify({
    currentEnvironment: "健身房", environments: ["健身房", "家里"], plans: [],
    cycleIdsByEnvironment: { 健身房: [], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: false, 家里: false },
    sessions: [{ id: "legacy-chest", source: "custom", environmentId: "健身房", startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), planName: "临时训练", status: "completed", completed: true, exercises: [{ id: "smith", name: "Smith 卧推", muscle: "胸", equipment: "Smith 架", sets: 1, reps: 10, weight: 20, completedSets: [{ setNumber: 1, targetReps: 10, recordedReps: 10, actualReps: 10, repsSource: "default", weight: 20, completed: true }] }] }], activeWorkout: null,
  })));
  await page.goto("/?flow=records");
  const model = page.locator("object[data*='front.svg']");
  await model.waitFor();
  await expect.poll(() => model.evaluate((element: HTMLObjectElement) => {
    const doc = element.contentDocument;
    return [doc?.querySelector<SVGElement>('[data-group="CHEST"]')?.style.fill, doc?.querySelector<SVGElement>('[data-group="TRICEPS"]')?.style.fill];
  })).toEqual(["rgb(255, 101, 87)", "rgb(74, 80, 89)"]);
});
