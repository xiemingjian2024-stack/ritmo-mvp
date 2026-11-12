import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, isMobile: true });

test("environment sheet accepts touch selections", async ({ page }) => {
  await page.goto("/?flow=plans", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /切换训练环境/ }).tap();
  const sheet = page.getByTestId("bottom-sheet");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("radio", { name: /家里/ }).tap();
  await expect(page.getByRole("button", { name: /切换训练环境，当前家里/ })).toBeVisible();
});

test("nested plan editor sheet accepts touch stepper and Done", async ({ page }) => {
  await page.goto("/?visualQa=first-batch&flow=plans&qaScreen=detail", { waitUntil: "networkidle" });
  const exercise = page.locator(".detail-exercise-row").first();
  await exercise.locator(".exercise-main").tap();
  const editor = page.locator(".bottom-sheet:has(.plan-parameter-editor)");
  await expect(editor).toBeVisible();
  const screen = await page.getByTestId("device-screen").boundingBox();
  expect(screen).not.toBeNull();
  await expect.poll(async () => (await editor.boundingBox())?.y ?? Infinity).toBeLessThan(screen!.y + screen!.height - 300);
  const bounds = await editor.boundingBox();
  expect(bounds).not.toBeNull();
  const outside = { x: bounds!.x + bounds!.width / 2, y: bounds!.y - 20 };
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.className, outside);
  expect(hit).toContain("sheet-overlay");
  await expect(exercise).toContainText("3 × 10 次");
  await editor.getByRole("button", { name: "增加组数" }).tap();
  await expect(editor.locator(".rest-parameter-row").first()).toContainText("4");
  await expect(exercise).toContainText("3 × 10 次");
  await editor.getByRole("button", { name: "完成", exact: true }).tap();
  await expect(exercise).toContainText("4 × 10 次");
});

test("records calendar sheet accepts a touch date selection", async ({ page }) => {
  await page.goto("/?flow=records", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "打开日历" }).tap();
  const sheet = page.getByTestId("bottom-sheet");
  await expect(sheet).toBeVisible();
  const day = sheet.locator(".calendar-days button:not([disabled])").first();
  await day.tap();
  await expect(sheet).toHaveCount(0);
});
