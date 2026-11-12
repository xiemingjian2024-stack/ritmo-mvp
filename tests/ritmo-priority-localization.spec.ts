import { expect, test } from "@playwright/test";
import { exerciseCatalog, getExerciseSpec, MUSCLE_REGIONS } from "../src/exerciseCatalog";
import { mediaForExercise } from "../src/exerciseMedia";
import { personalSequenceMedia } from "../src/personalSequenceMedia";
import { extendedById, extendedSearch, extendedTab, isExtendedHomeEligible, unmappedSourceMuscles } from "../src/extendedExerciseCatalog";
import { priorityById, priorityExercises } from "../src/priorityExerciseCatalog";

const fiveParts = ["胸", "背", "肩", "手臂", "腿"] as const;
const homeCoreIds = new Set(["pushup", "raise", "curl", "plank", "crunch", "pike-pushup", "superman", "body-squat", "glute-bridge"]);

test("51 first-batch IDs are unique, localized and keep Core and upstream records intact", () => {
  expect(priorityExercises).toHaveLength(51);
  expect(new Set(priorityExercises.map((entry) => entry.id)).size).toBe(51);
  expect(exerciseCatalog).toHaveLength(20);
  expect(priorityExercises.filter((entry) => !entry.id.startsWith("hasan:"))).toHaveLength(20);
  expect(priorityExercises.filter((entry) => entry.id.startsWith("hasan:"))).toHaveLength(31);
  for (const entry of priorityExercises) {
    expect(entry.nameZh.trim()).not.toBe("");
    expect(entry.aliasesZh.length).toBeGreaterThan(0);
    expect(entry.variantZh.trim()).not.toBe("");
    expect(entry.demoAngle.trim()).not.toBe("");
    expect(entry.professionalStatus).toBe("pending_professional_review");
    expect(entry.selfProductionFallback).toBe(true);
    const spec = getExerciseSpec(entry.id)!;
    expect(spec.id).toBe(entry.id);
    if (entry.id.startsWith("hasan:")) {
      expect(extendedById.get(entry.id)?.name).toBe(spec.standardName);
      expect(spec.name).toBe(entry.nameZh);
      expect(extendedById.get(entry.id)?.reviewStatus).toBe("unreviewed");
    }
  }
});

test("five-part gym and home candidate matrix clears four without counting non-beginner variants", () => {
  for (const part of fiveParts) {
    const candidates = priorityExercises.filter((entry) => getExerciseSpec(entry.id)?.muscle === part && entry.beginnerStatus !== "not_for_beginners");
    const gym = candidates.length;
    const home = candidates.filter((entry) => entry.id.startsWith("hasan:") ? isExtendedHomeEligible(extendedById.get(entry.id)!) : homeCoreIds.has(entry.id)).length;
    expect(gym, `${part} gym`).toBeGreaterThanOrEqual(4);
    expect(home, `${part} home`).toBeGreaterThanOrEqual(4);
    for (const entry of candidates.filter((item) => item.id.startsWith("hasan:") && isExtendedHomeEligible(extendedById.get(item.id)!))) {
      expect(["body weight", "dumbbell"]).toContain(extendedById.get(entry.id)!.equipment);
    }
  }
});

test("Chinese, alias and English searches find the same stable external ID", () => {
  const searches = ["靠墙俯卧撑", "墙壁俯卧撑", "push-up (wall)"];
  for (const term of searches) expect(extendedSearch(term, "胸", "家里", true).map((entry) => entry.id)).toContain("hasan:0659");
  expect(extendedSearch("", "胸", "家里", true)[0].id).toBe("hasan:0659");
  expect(extendedSearch("", "胸", "家里", true).some((entry) => entry.id === "hasan:0258")).toBe(false);
  expect(extendedSearch("交替转体俯卧撑", "胸", "家里", true).some((entry) => entry.id === "hasan:0258")).toBe(true);
  expect(extendedSearch("杠铃平板卧推", "胸", "家里", true).some((entry) => entry.id === "hasan:0025")).toBe(false);
  expect(extendedSearch("杠铃平板卧推", "胸", "健身房", true).some((entry) => entry.id === "hasan:0025")).toBe(true);
});

test("candidate primary regions are explicit and unresolved generic secondary labels are reported", () => {
  const regionIds = new Set(Object.keys(MUSCLE_REGIONS));
  for (const entry of priorityExercises.filter((item) => item.id.startsWith("hasan:"))) {
    const source = extendedById.get(entry.id)!;
    expect(extendedTab(source)).toBe(getExerciseSpec(entry.id)!.muscle);
    expect(getExerciseSpec(entry.id)!.primaryMuscleIds.length, entry.id).toBeGreaterThan(0);
    for (const id of [...getExerciseSpec(entry.id)!.primaryMuscleIds, ...getExerciseSpec(entry.id)!.secondaryMuscleIds]) expect(regionIds.has(id)).toBe(true);
  }
  expect(getExerciseSpec("hasan:0380")?.primaryMuscleIds).toEqual(["SHOULDERS_REAR"]);
  expect(getExerciseSpec("hasan:0310")?.primaryMuscleIds).toEqual(["SHOULDERS_FRONT"]);
  expect(getExerciseSpec("hasan:0584")?.primaryMuscleIds).toEqual(["SHOULDERS_SIDE"]);
  expect(unmappedSourceMuscles(extendedById.get("hasan:0025")!)).toContain("shoulders");
});

test("Gym visual references stay unlicensed; only self-produced candidates replace placeholders", () => {
  const personalReady = new Set(personalSequenceMedia.items.filter((item) => item.status === "personal_test_ready").map((item) => item.id));
  for (const entry of priorityExercises.filter((item) => item.id.startsWith("hasan:"))) {
    const source = extendedById.get(entry.id)!;
    expect(source.media.sourceRef).toMatch(/^gymvisual:/);
    expect(source.media.authorization).toBe("not_licensed");
    expect(source.media.localAsset).toBeNull();
    expect(entry.animationCandidate).toBe("gymvisual_source_reference");
    expect(entry.animationAuthorization).toBe("not_licensed");
    if (personalReady.has(entry.id)) expect(mediaForExercise(entry.id).localUse).toBe("self_produced_personal_test");
    else {
      expect(mediaForExercise(entry.id).placeholder).toBe(true);
      expect(mediaForExercise(entry.id).animation).toBeUndefined();
    }
  }
  expect(priorityById.get("smith")?.nameZh).toBe("史密斯机平板卧推");
});

test("real picker searches localized Core and Extended names without changing stored IDs", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ritmo-demo-v3", JSON.stringify({
    currentEnvironment: "家里", environments: ["健身房", "家里"], plans: [], sessions: [], activeWorkout: null,
    cycleIdsByEnvironment: { 健身房: [], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: false, 家里: false },
  })));
  await page.goto("/?flow=plans");
  await page.locator(".scheme-heading button").click();
  await page.getByRole("button", { name: "创建自定义方案" }).click();
  await page.getByRole("button", { name: /添加动作/ }).click();
  await page.getByRole("button", { name: "搜索动作" }).click();
  const search = page.getByPlaceholder("搜索中文、英文或别名");
  for (const term of ["靠墙俯卧撑", "墙壁俯卧撑", "push-up (wall)"]) {
    await search.fill(term);
    await expect(page.locator(".library-list button").filter({ hasText: "靠墙俯卧撑" })).toHaveCount(1);
  }
  await expect(page.locator(".library-list button").filter({ hasText: "靠墙俯卧撑" })).not.toContainText("push-up (wall)");
  await page.locator(".library-list button").filter({ hasText: "靠墙俯卧撑" }).click();
  await search.fill("标准推地");
  await expect(page.locator(".library-list button").filter({ hasText: "俯卧撑" })).toHaveCount(1);
  await search.fill("standard push-up");
  await expect(page.locator(".library-list button").filter({ hasText: "俯卧撑" })).toHaveCount(1);
  await page.getByRole("button", { name: "添加已选动作 · 1" }).click();
  await page.getByRole("button", { name: "保存方案" }).click();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(state.plans[0].exercises[0]).toMatchObject({ id: "hasan:0659", name: "靠墙俯卧撑", standardName: "push-up (wall)" });
});

test("new Chinese overlay does not rename existing plan or historical Session snapshots", async ({ page }) => {
  const oldExercise = { id: "hasan:0025", name: "barbell bench press", muscle: "胸", equipment: "barbell", sets: 1, reps: 8, weight: 25 };
  const state = {
    currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [{ id: "old-plan", name: "旧方案", environment: "健身房", exercises: [oldExercise] }],
    sessions: [{ id: "old-session", source: "cycle", environmentId: "健身房", planId: "old-plan", planName: "旧方案", startedAt: "2026-10-19T09:00:00.000Z", endedAt: "2026-10-19T09:10:00.000Z", status: "completed", completed: true, exercises: [{ ...oldExercise, completedSets: [{ setNumber: 1, targetReps: 8, recordedReps: 8, actualReps: 8, repsSource: "default", weight: 25, completed: true }] }] }],
    cycleIdsByEnvironment: { 健身房: ["old-plan"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false }, activeWorkout: null,
  };
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), state);
  await page.goto("/?flow=plans");
  const loaded = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(loaded.plans[0].exercises[0]).toMatchObject({ id: "hasan:0025", name: "barbell bench press" });
  expect(loaded.sessions[0].exercises[0]).toMatchObject({ id: "hasan:0025", name: "barbell bench press" });
  expect(getExerciseSpec("hasan:0025")?.name).toBe("杠铃平板卧推");
});
