import { expect, test } from "@playwright/test";

// Historical third-party GIF experiment is retained for reference only.
// The V1.5 personal allowlist deliberately blocks this URL override for all 51 IDs.
test.skip(true, "retired third-party media experiment; V1.5 uses self-produced allowlisted MP4s");
test.setTimeout(90_000);

const samples = [
  { id: "hasan:0025", name: "杠铃平板卧推", muscle: "胸", equipment: "barbell", file: "0025-EIeI8Vf.mp4" },
  { id: "hasan:0861", name: "坐姿绳索划船", muscle: "背", equipment: "cable", file: "0861-fUBheHs.mp4" },
  { id: "hasan:0310", name: "哑铃前平举", muscle: "肩", equipment: "dumbbell", file: "0310-3eGE2JC.mp4" },
  { id: "hasan:0298", name: "交叉锤式哑铃弯举", muscle: "手臂", equipment: "dumbbell", file: "0298-Qyk5J3p.mp4" },
  { id: "hasan:1760", name: "哑铃杯式深蹲", muscle: "腿", equipment: "dumbbell", file: "1760-yn8yg1r.mp4" },
];
const exercises = samples.map((sample, index) => ({ id: sample.id, name: sample.name, muscle: sample.muscle, equipment: sample.equipment, sets: 1, reps: index === 0 ? 9 : 4, weight: index === 0 ? 20 : 0 }));
const seed = {
  currentEnvironment: "健身房", environments: ["健身房", "家里"],
  plans: [
    { id: "local-media-five", name: "五部位媒体测试", environment: "健身房", exercises },
    { id: "next-cycle", name: "下一循环", environment: "健身房", exercises: [exercises[0]] },
  ],
  cycleIdsByEnvironment: { 健身房: ["local-media-five", "next-cycle"], 家里: [] },
  cycleIndexByEnvironment: { 健身房: 0, 家里: 0 },
  cycleEnabledByEnvironment: { 健身房: true, 家里: false }, sessions: [], activeWorkout: null,
};

test("five private animations play through a real cycle, pause, switch and save without changing NEXT rules", async ({ page }) => {
  await page.goto("/?flow=training&localMedia=1");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), seed);
  await page.reload();
  await page.getByRole("button", { name: "START 五部位媒体测试" }).click();
  await expect(page.locator(".countdown-screen")).toBeVisible();

  for (const [index, sample] of samples.entries()) {
    if (index > 0) {
      await expect(page.locator(".transition-screen")).toBeVisible({ timeout: 12_000 });
      const preview = page.locator(`.transition-art[data-media-exercise="${sample.id}"] video`);
      await expect(preview).toBeVisible();
      await expect(preview).toHaveAttribute("src", new RegExp(sample.file));
      await expect.poll(() => preview.evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(2);
      if (index === 1) await page.getByTestId("phone-frame").screenshot({ path: "reports/ritmo-v14-gif-local-test/02-next-action-preview.png" });
      await page.getByRole("button", { name: "START", exact: true }).click();
    }
    const video = page.locator(`.exercise-media[data-media-exercise="${sample.id}"] video`);
    await expect(video).toBeVisible({ timeout: 6_000 });
    await expect(video).toHaveAttribute("src", new RegExp(sample.file));
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
    const meta = await video.evaluate((element: HTMLVideoElement) => ({ width: element.videoWidth, height: element.videoHeight, muted: element.muted, loop: element.loop, inline: element.playsInline }));
    expect(meta).toEqual({ width: 180, height: 180, muted: true, loop: true, inline: true });
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.1);
    const media = await page.locator(`.exercise-media[data-media-exercise="${sample.id}"]`).boundingBox();
    const rhythm = await page.locator(".rep-count").boundingBox();
    expect(media && rhythm && media.y + media.height <= rhythm.y).toBe(true);
    await page.getByTestId("phone-frame").screenshot({ path: `reports/ritmo-v14-gif-local-test/0${index + 1}-active-${sample.id.replace(":", "-")}.png` });
    if (index === 0) {
      await video.evaluate((element: HTMLVideoElement) => { element.currentTime = 2.8; });
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(1);
      await page.getByRole("button", { name: "暂停 / 调整" }).click();
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
      const frozenTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
      const frozenRep = await page.locator(".rep-count strong").textContent();
      await page.waitForTimeout(650);
      expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(frozenTime, 1);
      await expect(page.locator(".rep-count strong")).toHaveText(frozenRep ?? "");
      await page.getByRole("button", { name: "继续训练" }).click();
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
    }
  }

  await expect(page.locator(".training-next-hero")).toBeVisible({ timeout: 12_000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].status).toBe("completed");
  expect(saved.sessions[0].exercises.map((exercise: { id: string }) => exercise.id)).toEqual(samples.map((sample) => sample.id));
  expect(saved.sessions[0].exercises.every((exercise: { completedSets: unknown[] }) => exercise.completedSets.length === 1)).toBe(true);
  expect(saved.cycleIndexByEnvironment.健身房).toBe(1);
});

test("missing private media displays the same placeholder and never blocks training", async ({ page }) => {
  const item = samples[2];
  const plan = { id: "media-failure", name: "失败降级测试", environment: "健身房", exercises: [{ ...exercises[2], reps: 4 }] };
  await page.goto("/?flow=training&localMedia=1");
  await page.evaluate((value) => localStorage.setItem("ritmo-demo-v3", JSON.stringify(value)), {
    ...seed, plans: [plan], cycleIdsByEnvironment: { 健身房: [plan.id], 家里: [] },
  });
  await page.route(`**/${item.file}`, (route) => route.abort());
  await page.reload();
  await page.getByRole("button", { name: "START 失败降级测试" }).click();
  await expect(page.getByText("演示加载失败，请检查本地素材")).toBeVisible({ timeout: 6_000 });
  await page.getByTestId("phone-frame").screenshot({ path: "reports/ritmo-v14-gif-local-test/07-failed-local-media.png" });
  await expect(page.locator(".training-next-hero")).toBeVisible({ timeout: 10_000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ritmo-demo-v3") || "{}"));
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].exercises[0].completedSets).toHaveLength(1);
});
