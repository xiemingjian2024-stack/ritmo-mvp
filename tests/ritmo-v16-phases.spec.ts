import { expect, test, type Page } from "@playwright/test";
import { phaseExerciseCatalog, phaseItemAvailable, phaseItemsFor, resolvePrimaryGroup, type PhaseGroup } from "../src/phaseExerciseCatalog";

const smith = { id: "smith", name: "史密斯卧推", muscle: "胸", equipment: "Smith 架", sets: 1, reps: 1, weight: 20 };
const row = { id: "row", name: "坐姿划船", muscle: "背", equipment: "坐姿划船机", sets: 1, reps: 1, weight: 20 };
function fixture(exercises = [smith], source: "cycle" | "custom" = "cycle") {
  return {
    dataVersion: 1, currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [{ id: "v16-chest", name: "V1.6 胸部测试", environment: "健身房", exercises }, { id: "v16-back", name: "V1.6 背部测试", environment: "健身房", exercises: [row] }],
    cycleIdsByEnvironment: { 健身房: ["v16-chest", "v16-back"], 家里: [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 }, cycleEnabledByEnvironment: { 健身房: source === "cycle", 家里: false },
    sessions: [], activeWorkout: null,
  };
}
async function load(page: Page, data: object) {
  await page.goto("/?flow=training");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), data);
  await page.reload();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}")); }

test("six groups, stable mixed-plan tie, environment requirements and dose provenance", () => {
  const groups = ["胸", "背", "肩", "手臂", "腿", "核心"] as const;
  for (const muscle of groups) {
    expect(resolvePrimaryGroup([{ muscle }])).toBe(muscle);
    expect(phaseItemsFor(muscle, "warmup").length).toBeGreaterThan(0);
    expect(phaseItemsFor(muscle, "cooldown").length).toBeGreaterThan(0);
  }
  expect(resolvePrimaryGroup([{ muscle: "胸" }, { muscle: "背" }])).toBe("胸");
  expect(resolvePrimaryGroup([{ muscle: "背" }, { muscle: "胸" }])).toBe("胸");
  expect(resolvePrimaryGroup([{ muscle: "胸", reps: 10 }, { muscle: "背", reps: 8 }] as never)).toBe("胸");
  expect(resolvePrimaryGroup([{ muscle: "无法判断" }])).toBeNull();
  expect(phaseExerciseCatalog).toHaveLength(29);
  expect(new Set(phaseExerciseCatalog.map((item) => item.id)).size).toBe(29);
  expect(phaseExerciseCatalog.every((item) => item.sourceDose && item.defaultDose && item.reviewStatus === "pending_professional_review")).toBe(true);
  const chestStretch = phaseExerciseCatalog.find((item) => item.id === "ritmo:stretch:doorway-single-arm-chest")!;
  expect(phaseItemAvailable(chestStretch, "家里")).toBe(false);
  expect(phaseItemAvailable(chestStretch, "健身房")).toBe(true);
});

test("shoulder and arm recommendations omit known-unfit media without deleting catalog items", () => {
  expect(phaseItemsFor("肩", "warmup").map((item) => item.id)).toEqual([
    "ritmo:warmup:light-lateral-raise", "ritmo:warmup:lean-lateral-raise",
  ]);
  expect(phaseItemsFor("肩", "cooldown").map((item) => item.id)).toEqual([
    "ritmo:stretch:cross-body-rear-delt",
  ]);
  expect(phaseItemsFor("手臂", "warmup").map((item) => item.id)).toEqual([
    "ritmo:warmup:light-alternating-curl", "ritmo:warmup:light-two-hand-overhead-extension",
  ]);
  expect(phaseItemsFor("手臂", "cooldown").map((item) => item.id)).toEqual(["ritmo:stretch:overhead-triceps"]);
  expect(phaseItemsFor("核心", "cooldown").map((item) => item.id)).toEqual(["ritmo:stretch:prone-abdominal-extension"]);
  expect(phaseExerciseCatalog).toHaveLength(29);
  expect(phaseExerciseCatalog.some((item) => item.id === "ritmo:warmup:bent-rear-raise")).toBe(true);
});

test("all six plan groups start with exactly one matching warmup group", async ({ page }) => {
  for (const muscle of ["胸", "背", "肩", "手臂", "腿", "核心"]) {
    const exercise = { id: `v16-${muscle}`, name: `${muscle}测试动作`, muscle, equipment: "徒手", sets: 1, reps: 2, weight: 0 };
    await load(page, fixture([exercise]));
    await page.getByRole("button", { name: /START/ }).first().click();
    await expect.poll(async () => (await saved(page)).activeWorkout?.phase).toBe("warmup");
    const state = await saved(page);
    expect(state.activeWorkout.primaryGroup).toBe(muscle);
    expect(state.activeWorkout.warmupIds).toEqual(phaseItemsFor(muscle as PhaseGroup, "warmup").map((item) => item.id));
    expect(state.activeWorkout.phase).toBe("warmup");
  }
});

test("home plans keep the same six-group matching while respecting known equipment", async ({ page }) => {
  for (const muscle of ["胸", "背", "肩", "手臂", "腿", "核心"] as PhaseGroup[]) {
    const exercise = { id: `home-${muscle}`, name: `${muscle}居家测试`, muscle, equipment: "徒手", sets: 1, reps: 2, weight: 0 };
    const data = fixture([exercise]);
    data.currentEnvironment = "家里";
    data.plans = [{ ...data.plans[0], environment: "家里" }];
    data.cycleIdsByEnvironment = { 健身房: [], 家里: [data.plans[0].id] };
    data.cycleEnabledByEnvironment = { 健身房: false, 家里: true };
    await load(page, data);
    await page.getByRole("button", { name: /START/ }).first().click();
    await expect.poll(async () => (await saved(page)).activeWorkout?.phase).toBe("warmup");
    const run = (await saved(page)).activeWorkout;
    expect(run.primaryGroup).toBe(muscle);
    expect(run.warmupIds).toEqual(phaseItemsFor(muscle, "warmup").map((item) => item.id));
    expect(run.cooldownIds).toEqual(phaseItemsFor(muscle, "cooldown").map((item) => item.id));
    for (const item of [...phaseItemsFor(muscle, "warmup"), ...phaseItemsFor(muscle, "cooldown")]) {
      expect(phaseItemAvailable(item, "家里")).toBe(item.equipment !== "fixed-support");
    }
  }
});

test("no-NEXT recommendation also starts directly with warmup", async ({ page }) => {
  await load(page, fixture([smith], "custom"));
  await expect(page.getByText("今天想练什么？")).toBeVisible();
  await page.getByRole("button", { name: /START/ }).first().click();
  await expect.poll(async () => (await saved(page)).activeWorkout?.phase).toBe("warmup");
  expect((await saved(page)).activeWorkout.phase).toBe("warmup");
});

test("an early-completed chest warmup records separately before manual transition", async ({ page }) => {
  test.setTimeout(45_000);
  await load(page, fixture());
  await page.getByRole("button", { name: /START/ }).first().click();
  await expect(page.getByRole("heading", { name: "徒手站姿胸前开合" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "提前完成当前动作" }).click();
  await expect(page.getByRole("button", { name: "START" })).toBeVisible();
  await page.getByRole("button", { name: "START" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.phase).toBe("strength");
  const state = await saved(page);
  expect(state.phaseRecords[0].items.map((item: { status: string }) => item.status)).toEqual(["early_completed"]);
  expect(state.sessions).toHaveLength(0);
  expect(state.activeWorkout.phase).toBe("strength");
});

test("the chest bodyweight warmup remains available in a custom no-equipment environment", async ({ page }) => {
  const data = fixture();
  await load(page, { ...data, currentEnvironment: "无器械", environments: [...data.environments, "无器械"], plans: [{ ...data.plans[0], environment: "无器械" }], cycleIdsByEnvironment: { ...data.cycleIdsByEnvironment, 无器械: ["v16-chest"] }, cycleIndexByEnvironment: { ...data.cycleIndexByEnvironment, 无器械: 0 }, cycleEnabledByEnvironment: { ...data.cycleEnabledByEnvironment, 无器械: true } });
  await page.getByRole("button", { name: /START/ }).first().click();
  await expect(page.getByRole("heading", { name: "徒手站姿胸前开合" })).toBeVisible();
  await expect(page.getByText("当前环境缺少哑铃，请在暂停菜单跳过本项")).toHaveCount(0);
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过当前动作" }).click();
  await page.getByRole("button", { name: "START" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.phase).toBe("strength");
});

test("legacy plan migrates, shows read-only phases, and starts at warmup", async ({ page }, testInfo) => {
  await load(page, fixture());
  await expect.poll(async () => (await saved(page)).dataVersion).toBe(2);
  await page.goto("/?flow=plans");
  await page.getByText("V1.6 胸部测试").first().click();
  await expect(page.getByText("训练前热身")).toBeVisible();
  await expect(page.getByText("训练后拉伸")).toBeVisible();
  await expect(page.locator(".system-phase-row")).toHaveCount(2);
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath("plan-with-system-phases.png") });
  await page.goto("/?flow=training");
  await page.getByRole("button", { name: /START/ }).first().click();
  await expect(page.getByRole("heading", { name: "徒手站姿胸前开合" })).toBeVisible();
  await expect(page.locator('[data-media-exercise="ritmo:warmup:standing-chest-open-close"] video')).toBeVisible();
  expect((await saved(page)).activeWorkout.phase).toBe("warmup");
  await page.screenshot({ path: testInfo.outputPath("warmup-active.png") });
});

test("normal strength saves once before stretch; skip stretch preserves Session and NEXT", async ({ page }, testInfo) => {
  await load(page, fixture());
  await page.getByRole("button", { name: /START/ }).first().click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.getByText("史密斯卧推").first()).toBeVisible({ timeout: 7_000 });
  await expect(page.getByRole("heading", { name: "站姿徒手胸部伸展" })).toBeVisible({ timeout: 8_000 });
  await page.waitForTimeout(350);
  let data = await saved(page);
  expect(data.sessions).toHaveLength(1);
  expect(data.sessions[0].status).toBe("completed");
  expect(data.cycleIndexByEnvironment["健身房"]).toBe(1);
  expect(data.phaseRecords[0].items.filter((item: { phase: string }) => item.phase === "warmup")).toHaveLength(1);
  expect(data.activeWorkout.stage).toBe("phase-intro");
  await page.screenshot({ path: testInfo.outputPath("cooldown-intro.png") });
  await page.getByRole("button", { name: "START" }).click();
  await expect.poll(async () => (await saved(page)).activeWorkout.stage).toBe("active");
  await page.screenshot({ path: testInfo.outputPath("cooldown-active.png") });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个拉伸阶段" }).click();
  await page.getByRole("button", { name: "确认结束拉伸并查看记录" }).click();
  await expect(page.locator(".records-screen")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("summary.png") });
  await page.reload();
  data = await saved(page);
  expect(data.sessions).toHaveLength(1);
  expect(data.cycleIndexByEnvironment["健身房"]).toBe(1);
  expect(data.phaseRecords[0].items.filter((item: { phase: string }) => item.phase === "cooldown")).toHaveLength(1);
});

test("timed left/right stretch pauses, survives refresh and resumes five-second switch", async ({ page }) => {
  const data = fixture();
  const now = new Date().toISOString();
  const activeWorkout = { id: "v16-side-session", source: "cycle", environmentId: "健身房", startedAt: now, planId: "v16-chest", planName: "V1.6 胸部测试", exercises: [smith], exerciseIndex: 0, setNumber: 1, rep: 1, targetReps: 1, targetDurationSeconds: 0, activeRemainingSeconds: 0, weight: 20, stage: "active", phase: "cooldown", primaryGroup: "胸", warmupIds: [], cooldownIds: ["ritmo:stretch:doorway-single-arm-chest"], phaseItemIndex: 0, phaseSegmentIndex: 0, phaseRemaining: 1, phaseDeadlineAt: null, phaseAccumulated: 0, phaseHadEarly: false, restRemaining: 90, paused: false, completedSets: { "0": [{ setNumber: 1, targetReps: 1, recordedReps: 1, actualReps: 1, repsSource: "default", weight: 20, completed: true }] } };
  await load(page, { ...data, activeWorkout, sessions: [{ id: activeWorkout.id, source: "cycle", environmentId: "健身房", startedAt: now, endedAt: now, planId: "v16-chest", planName: "V1.6 胸部测试", status: "completed", completed: true, exercises: [{ ...smith, completedSets: activeWorkout.completedSets["0"] }] }] });
  await expect(page.getByRole("heading", { name: "门框单臂胸肌拉伸" })).toBeVisible();
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.getByText("准备换侧 · 5 秒")).toBeVisible({ timeout: 4_000 });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  const remaining = (await saved(page)).activeWorkout.phaseRemaining;
  await page.reload();
  const refreshed = (await saved(page)).activeWorkout;
  if (refreshed.stage === "phase-switch") {
    await expect(page.getByText("准备换侧 · 5 秒")).toBeVisible();
    await page.waitForTimeout(1_200);
    expect((await saved(page)).activeWorkout.phaseRemaining).toBe(remaining);
  } else expect(refreshed.phaseSegmentIndex).toBe(1);
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.locator(".target-summary")).toContainText("右侧", { timeout: 8_000 });
  expect((await saved(page)).sessions).toHaveLength(1);
});

test("partial strength keeps NEXT unchanged and cooldown cannot undo its saved status", async ({ page }) => {
  test.setTimeout(30_000);
  const data = fixture([smith, row]);
  const now = new Date().toISOString();
  await load(page, { ...data, activeWorkout: { id: "v16-partial", source: "cycle", environmentId: "健身房", startedAt: now, planId: "v16-chest", planName: "V1.6 胸部测试", exercises: [smith, { ...row, reps: 100 }], exerciseIndex: 1, setNumber: 1, rep: 2, targetReps: 100, targetDurationSeconds: 0, activeRemainingSeconds: 0, weight: 20, stage: "active", phase: "strength", primaryGroup: "胸", warmupIds: [], cooldownIds: ["ritmo:stretch:doorway-single-arm-chest"], phaseItemIndex: 0, phaseSegmentIndex: 0, phaseRemaining: 30, phaseDeadlineAt: null, phaseAccumulated: 0, phaseHadEarly: false, restRemaining: 90, paused: true, completedSets: { "0": [{ setNumber: 1, targetReps: 1, recordedReps: 1, actualReps: 1, repsSource: "default", weight: 20, completed: true }] } } });
  await page.getByRole("button", { name: "继续训练" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "结束训练" }).click();
  await page.getByRole("button", { name: /提前结束/ }).click();
  await expect(page.getByRole("heading", { name: "门框单臂胸肌拉伸" })).toBeVisible();
  let state = await saved(page);
  expect(state.sessions).toHaveLength(1);
  expect(state.sessions[0].status).toBe("partial");
  expect(state.sessions[0].exercises).toHaveLength(1);
  expect(state.cycleIndexByEnvironment["健身房"]).toBe(0);
  await page.getByRole("button", { name: "START" }).click();
  await expect(page.getByRole("heading", { name: "门框单臂胸肌拉伸" })).toBeVisible();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个拉伸阶段" }).click();
  await page.getByRole("button", { name: "确认结束拉伸并查看记录" }).click();
  state = await saved(page);
  expect(state.sessions[0].status).toBe("partial");
  expect(state.cycleIndexByEnvironment["健身房"]).toBe(0);
});
