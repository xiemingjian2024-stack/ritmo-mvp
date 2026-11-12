import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test("isolated cycle: countdown, active edit, rest, next-action media, timed finish, history", async ({ page }, testInfo) => {
  const smith = { id: "smith", name: "史密斯卧推", muscle: "胸", equipment: "Smith 架", sets: 2, reps: 7, weight: 20, restSeconds: 90 };
  const plank = { id: "plank", name: "前臂平板支撑", muscle: "核心", equipment: "徒手", sets: 1, reps: 0, weight: 0, targetDurationSeconds: 6 };
  const data = {
    currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [
      { id: "media-flow", name: "媒体流程验证", environment: "健身房", exercises: [smith, plank] },
      { id: "next-cycle", name: "下一循环", environment: "健身房", exercises: [smith] },
    ],
    cycleIdsByEnvironment: { 健身房: ["media-flow", "next-cycle"], 家里: [] },
    cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [], activeWorkout: null,
  };
  await page.goto("/?flow=training");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), data);
  await page.reload();
  await page.getByRole("button", { name: "START 媒体流程验证" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator(".countdown-screen")).toBeVisible();
  await expect(page.locator('.exercise-media[data-media-exercise="smith"]')).toBeVisible({ timeout: 6_000 });
  await expect(page.locator('.exercise-media[data-media-exercise="smith"] img')).toHaveAttribute("src", "/assets/workout/smith-press.png");
  await page.getByTestId("phone-frame").screenshot({ path: testInfo.outputPath("01-active-placeholder.png") });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await expect(page.getByRole("heading", { name: "训练控制" })).toBeVisible();
  const pausedRep = Number(await page.locator(".rep-count strong").textContent());
  await page.getByTestId("phone-frame").screenshot({ path: testInfo.outputPath("02-paused.png") });
  await page.getByRole("button", { name: "调整参数" }).click();
  await page.getByRole("button", { name: "增加下一组次数" }).click();
  await page.getByRole("button", { name: "增加下一组重量" }).click();
  await page.getByTestId("phone-frame").screenshot({ path: testInfo.outputPath("03-next-set-adjustment.png") });
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect(page.locator(".active-content")).toBeVisible();
  expect(Number(await page.locator(".rep-count strong").textContent())).toBeGreaterThanOrEqual(pausedRep);
  await expect(page.locator(".rest-content")).toBeVisible({ timeout: 9_000 });
  const midway = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(midway.activeWorkout.completedSets["0"][0]).toMatchObject({ targetReps: 7, recordedReps: 7, weight: 20 });
  await page.getByTestId("phone-frame").screenshot({ path: testInfo.outputPath("04-rest.png") });
  await page.getByRole("button", { name: "提前开始下一组" }).click();
  await expect(page.locator(".active-content")).toBeVisible();
  await expect(page.locator(".target-summary")).toContainText("8 次");
  await expect(page.locator(".target-summary")).toContainText("20.5");
  await expect(page.locator(".transition-screen")).toBeVisible({ timeout: 10_000 });
  const preview = page.locator('.transition-art[data-media-exercise="plank"] video');
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThanOrEqual(2);
  await page.getByTestId("phone-frame").screenshot({ path: testInfo.outputPath("05-next-action.png") });
  await page.getByRole("button", { name: "START", exact: true }).click();
  await expect(page.locator(".countdown-screen")).toBeVisible();
  const activeVideo = page.locator('.exercise-media[data-media-exercise="plank"] video');
  await expect(activeVideo).toBeVisible({ timeout: 6_000 });
  await expect.poll(() => activeVideo.evaluate((el: HTMLVideoElement) => el.paused)).toBe(false);
  expect(await activeVideo.evaluate((el: HTMLVideoElement) => [el.videoWidth, el.videoHeight])).toEqual([720, 720]);
  const mediaBox = await page.locator('.exercise-media[data-media-exercise="plank"]').boundingBox();
  const rhythmBox = await page.locator(".rep-count").boundingBox();
  expect(mediaBox && rhythmBox && mediaBox.y + mediaBox.height <= rhythmBox.y).toBe(true);
  await page.getByTestId("phone-frame").screenshot({ path: testInfo.outputPath("06-active-video.png") });
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await expect.poll(() => activeVideo.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
  const frozen = await page.locator(".rep-count strong").textContent();
  await page.waitForTimeout(1_150);
  await expect(page.locator(".rep-count strong")).toHaveText(frozen || "");
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect.poll(() => activeVideo.evaluate((el: HTMLVideoElement) => el.paused)).toBe(false);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}").sessions?.length ?? 0), { timeout: 10_000 }).toBe(1);
  const finished = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(finished.sessions).toHaveLength(1);
  expect(finished.sessions[0]).toMatchObject({ planId: "media-flow", status: "completed" });
  expect(finished.sessions[0].exercises[0].completedSets).toHaveLength(2);
  expect(finished.sessions[0].exercises[1].completedSets[0]).toMatchObject({ measurementType: "duration", recordedDurationSeconds: 6 });
  expect(finished.cycleIndexByEnvironment.健身房).toBe(1);
  await page.getByRole("button", { name: "START" }).click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个拉伸阶段" }).click();
  await page.getByRole("button", { name: "确认结束拉伸并查看记录" }).click();
  await page.getByRole("button", { name: "训练", exact: true }).click();
  await expect(page.locator(".training-next-hero")).toBeVisible();
  await page.locator(".floating-nav").getByRole("button", { name: "记录" }).click();
  await expect(page.getByText("媒体流程验证")).toBeVisible();
  await page.getByText("媒体流程验证").scrollIntoViewIfNeeded();
  await page.getByTestId("phone-frame").screenshot({ path: testInfo.outputPath("07-history.png") });
});

test("a failed local animation falls back without blocking timed completion", async ({ page }, testInfo) => {
  const plank = { id: "plank", name: "前臂平板支撑", muscle: "核心", equipment: "徒手", sets: 1, reps: 0, weight: 0, targetDurationSeconds: 4 };
  const data = {
    currentEnvironment: "健身房", environments: ["健身房", "家里"],
    plans: [{ id: "failure-plan", name: "媒体失败验证", environment: "健身房", exercises: [plank] }],
    cycleIdsByEnvironment: { 健身房: ["failure-plan"], 家里: [] }, cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
    cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [],
    activeWorkout: { id: "failure-session", source: "cycle", environmentId: "健身房", startedAt: new Date().toISOString(),
      planId: "failure-plan", planName: "媒体失败验证", exercises: [plank], exerciseIndex: 0, setNumber: 1,
      targetReps: 0, targetDurationSeconds: 4, activeRemainingSeconds: 4, weight: 0,
      stage: "active", restRemaining: 90, paused: false, completedSets: {} },
  };
  await page.goto("/?flow=training");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), data);
  await page.route("**/media/personal-v15/plank.mp4", (route) => route.abort());
  await page.reload();
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible();
  await page.getByTestId("phone-frame").screenshot({ path: testInfo.outputPath("08-failed-media-placeholder.png") });
  // Reload intentionally restores an active workout paused; resumption is explicit.
  await page.getByRole("button", { name: "继续训练" }).click();
  await expect(page.locator(".training-next-hero")).toBeVisible({ timeout: 7_000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].exercises[0].completedSets[0]).toMatchObject({ measurementType: "duration", recordedDurationSeconds: 4 });
});
