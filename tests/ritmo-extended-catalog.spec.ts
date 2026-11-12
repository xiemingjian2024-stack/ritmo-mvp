import { expect, test } from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { exerciseCatalog, getExerciseSpec } from "../src/exerciseCatalog";
import { coreCrosswalk, extendedCatalog, extendedSearch, extendedSource, extendedById, isExtendedHomeEligible } from "../src/extendedExerciseCatalog";
import { mediaForExercise } from "../src/exerciseMedia";

test("core IDs and historical-compatible metadata remain stable", () => {
  expect(exerciseCatalog).toHaveLength(20);
  expect(exerciseCatalog.map((item) => item.id)).toEqual([
    "smith", "incline", "fly", "pushup", "pulldown", "row", "one-arm-row", "straight-pull",
    "raise", "press", "curl", "triceps", "plank", "crunch", "squat", "leg-press",
    "pike-pushup", "superman", "body-squat", "glute-bridge",
  ]);
  expect(getExerciseSpec("smith")?.weight).toBe(20);
  expect(getExerciseSpec("plank")?.measurementType).toBe("duration");
  expect(getExerciseSpec("hasan:0748")?.weight).toBe(0);
});

test("external import is namespaced, non-media, tiered and unreviewed", () => {
  expect(extendedCatalog).toHaveLength(1324);
  expect(extendedSource.sourceCommit).toBe("7455efae41b330c265e7cd4b78dfa848e7ce5ebd");
  expect(extendedCatalog.filter((item) => item.tier === "extended")).toHaveLength(1088);
  expect(extendedCatalog.filter((item) => item.tier === "niche")).toHaveLength(236);
  expect(new Set(extendedCatalog.map((item) => item.id)).size).toBe(1324);
  expect(extendedCatalog.every((item) => item.id.startsWith("hasan:") && item.reviewStatus === "unreviewed" && item.media.authorization === "not_licensed" && item.media.localAsset === null)).toBe(true);
  expect(extendedCatalog.some((item) => "gif_url" in item || "image" in item)).toBe(false);
  expect(coreCrosswalk.pulldown.relation).toBe("rejected");
  expect(Object.values(coreCrosswalk).every((item) => item.relation !== "exact")).toBe(true);
});

test("environment filter uses equipment and conservatively excludes added apparatus", () => {
  expect(extendedSearch("dumbbell lateral raise", "肩", "家里", true).some((item) => item.id === "hasan:0334")).toBe(true);
  expect(extendedSearch("smith bench press", "胸", "家里", true)).toHaveLength(0);
  expect(extendedSearch("smith bench press", "胸", "健身房", true).some((item) => item.id === "hasan:0748")).toBe(true);
  expect(extendedSearch("dumbbell", "肩", "家里", true).every((item) => item.homeEligible)).toBe(true);
  expect(extendedSearch("", "胸", "健身房", true).every((item) => item.tier === "extended")).toBe(true);
  for (const id of ["hasan:0251", "hasan:0279", "hasan:0302", "hasan:0317", "hasan:0020"]) {
    expect(isExtendedHomeEligible(extendedById.get(id)!)).toBe(false);
  }
  expect(isExtendedHomeEligible(extendedById.get("hasan:0334")!)).toBe(true);
});

test("explicit side-bridge hold uses seconds and unlicensed extended media stays a placeholder", () => {
  expect(getExerciseSpec("hasan:0705")).toMatchObject({ measurementType: "duration", targetDurationSeconds: 30, reps: 0, weight: 0 });
  for (const id of ["hasan:0705", "hasan:0025"]) {
    expect(mediaForExercise(id).placeholder).toBe(true);
    expect(mediaForExercise(id).staticImage).toBeUndefined();
    expect(mediaForExercise(id).animation).toBeUndefined();
  }
});

test("source equipment/name contradictions retain IDs but use the documented apparatus", () => {
  expect(getExerciseSpec("hasan:3156")).toMatchObject({ id: "hasan:3156", name: "dumbbell standing close-grip one arm row", equipment: "dumbbell", reviewStatus: "pending_professional_review" });
  expect(getExerciseSpec("hasan:3162")?.equipment).toBe("dumbbell");
  expect(getExerciseSpec("hasan:1770")?.equipment).toBe("dumbbell + bench");
  expect(isExtendedHomeEligible(extendedById.get("hasan:1770")!)).toBe(false);
  expect(extendedSearch("dumbbell standing one arm row", "背", "家里", true).some((item) => item.id === "hasan:3162")).toBe(true);
});

test("importer is idempotent and can apply an incremental source update without ID drift", () => {
  const folder = mkdtempSync(join(tmpdir(), "ritmo-dataset-test-"));
  try {
    const input = join(folder, "source.json");
    const output = join(folder, "output.json");
    const commit = "a".repeat(40);
    const row = { id: "0001", name: "test dumbbell raise", body_part: "shoulders", equipment: "dumbbell", target: "delts", secondary_muscles: ["triceps"], instruction_steps: { en: ["Raise both arms."], zh: ["抬起双臂。"] } };
    const run = () => spawnSync(process.execPath, ["scripts/import-exercises-dataset.mjs", input, commit, output], { encoding: "utf8" });
    writeFileSync(input, JSON.stringify([row]));
    expect(run().status).toBe(0);
    const before = readFileSync(output, "utf8");
    expect(run().stdout).toContain("unchanged");
    expect(readFileSync(output, "utf8")).toBe(before);
    writeFileSync(input, JSON.stringify([row, { ...row, id: "0002", name: "test squat", equipment: "body weight", target: "quads" }]));
    expect(run().status).toBe(0);
    const updated = JSON.parse(readFileSync(output, "utf8"));
    expect(updated.records.map((item: { id: string }) => item.id)).toEqual(["hasan:0001", "hasan:0002"]);
    expect(updated.records[0].media.localAsset).toBeNull();
    const validOutput = readFileSync(output, "utf8");
    writeFileSync(input, JSON.stringify([row, row]));
    expect(run().status).not.toBe(0);
    expect(readFileSync(output, "utf8")).toBe(validOutput);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test("picker lists localized candidates without a bulk English catalog toggle", async ({ page }) => {
  await page.goto("/?flow=plans&visualQa=first-batch&qaScreen=add");
  await expect(page.getByRole("button", { name: "浏览扩展动作" })).toHaveCount(0);
  await expect(page.locator(".library-list button").first()).toContainText("Smith 卧推");
  await expect(page.locator(".library-list button").filter({ hasText: "靠墙俯卧撑" })).toBeVisible();
  await expect(page.locator(".library-list button").filter({ hasText: "靠墙俯卧撑" })).not.toContainText("push-up (wall)");
  await page.getByRole("button", { name: "腿", exact: true }).click();
  await expect(page.locator(".library-list button").filter({ hasText: "哑铃杯式深蹲" })).toBeVisible();
  await expect(page.locator(".library-list button").filter({ hasText: "dumbbell plyo squat" })).toHaveCount(0);
  await page.getByRole("button", { name: "搜索动作" }).click();
  await page.getByPlaceholder("搜索中文、英文或别名").fill("dumbbell plyo squat");
  await expect(page.locator(".library-list button").filter({ hasText: "dumbbell plyo squat" })).toBeVisible();
});

test("search selects a namespaced external exercise without changing the existing plan", async ({ page }) => {
  await page.goto("/?flow=plans&visualQa=first-batch&qaScreen=add");
  await page.getByRole("button", { name: "腿" }).click();
  await page.getByRole("button", { name: "搜索动作" }).click();
  await page.getByPlaceholder("搜索中文、英文或别名").fill("dumbbell squat");
  const candidate = page.locator(".library-list button").filter({ hasText: "dumbbell squat" }).first();
  await expect(candidate).toContainText("扩展·待审校");
  await candidate.click();
  await page.getByRole("button", { name: "添加已选动作 · 1" }).click();
  await expect(page.getByText("dumbbell squat").first()).toBeVisible();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect((data.plans ?? []).some((plan: { exercises: { id: string }[] }) => plan.exercises.some((exercise) => exercise.id === "hasan:0413"))).toBe(false);
});

test("historical external exercise snapshot remains readable without live media", async ({ page }) => {
  const snapshot = { id: "hasan:0334", name: "dumbbell lateral raise", muscle: "肩", equipment: "dumbbell", sets: 1, reps: 10, weight: 0 };
  await page.addInitScript((exercise) => localStorage.setItem("ritmo-demo-v3", JSON.stringify({
    currentEnvironment: "家里", environments: ["健身房", "家里"],
    plans: [{ id: "saved-external", name: "我的肩部训练", environment: "家里", exercises: [exercise] }],
    cycleIdsByEnvironment: { 健身房: [], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: false, 家里: false },
    sessions: [{ id: "historic-external", source: "custom", environmentId: "家里", startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), planName: "旧训练", status: "completed", completed: true, exercises: [{ ...exercise, completedSets: [{ setNumber: 1, targetReps: 10, recordedReps: 10, actualReps: 10, repsSource: "manual", weight: 0, completed: true }] }] }],
    activeWorkout: null,
  })), snapshot);
  await page.goto("/?flow=records");
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(data.plans[0].exercises[0]).toMatchObject(snapshot);
  expect(data.sessions[0].exercises[0].completedSets[0]).toMatchObject({ recordedReps: 10, repsSource: "manual", weight: 0 });
  expect(data.sessions[0].exercises[0].name).toBe("dumbbell lateral raise");
});
