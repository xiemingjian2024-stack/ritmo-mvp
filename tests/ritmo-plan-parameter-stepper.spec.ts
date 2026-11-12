import { expect, test } from "@playwright/test";

test("plan exercise parameters use centered steppers and commit only on Done", async ({ page }) => {
  const originalStorage = JSON.stringify({ untouched: "plan-parameter-qa" });
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", value), originalStorage);
  await page.goto("/?visualQa=first-batch&flow=plans&qaScreen=detail", { waitUntil: "networkidle" });

  const firstExercise = page.locator(".detail-exercise-row").first();
  await firstExercise.locator(".exercise-main").click();
  const editor = page.locator(".bottom-sheet:has(.plan-parameter-editor)");
  await expect(editor).toBeVisible();
  await expect(editor.locator(".rest-parameter-row")).toHaveCount(3);
  await expect(editor.locator(".rest-parameter-row").first()).toContainText("组数");
  await editor.getByRole("button", { name: "增加组数" }).click();
  await editor.getByRole("button", { name: "增加目标次数" }).click();
  await editor.getByRole("button", { name: "减少训练重量" }).click();
  await expect(editor.locator(".rest-parameter-row").first()).toContainText("4");

  const screen = await page.getByTestId("device-screen").boundingBox();
  const sheet = await editor.boundingBox();
  const row = await editor.locator(".rest-parameter-row").first().boundingBox();
  const done = await editor.getByRole("button", { name: "完成", exact: true }).boundingBox();
  await page.getByTestId("device-screen").screenshot({ path: "/private/tmp/ritmo-plan-parameter-after.png" });
  expect(screen && sheet && row && done).toBeTruthy();
  expect(row!.x - screen!.x).toBeGreaterThanOrEqual(18);
  expect(screen!.x + screen!.width - row!.x - row!.width).toBeGreaterThanOrEqual(18);
  expect(screen!.y + screen!.height - done!.y - done!.height).toBeGreaterThanOrEqual(18);

  await page.getByTestId("sheet-overlay").last().click({ position: { x: 10, y: 10 } });
  await expect(editor).toHaveCount(0);
  await expect(firstExercise).toContainText("3 × 10 次 · 20 kg");

  await firstExercise.locator(".exercise-main").click();
  await expect(editor.locator(".rest-parameter-row").first()).toContainText("3");
  await editor.getByRole("button", { name: "增加组数" }).click();
  await editor.getByRole("button", { name: "完成", exact: true }).click();
  await expect(firstExercise).toContainText("4 × 10 次 · 20 kg");
  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe(originalStorage);
});
