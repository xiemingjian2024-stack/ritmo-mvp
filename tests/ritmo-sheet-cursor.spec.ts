import { expect, test } from "@playwright/test";

test("simulated cursor stays visible above a bottom sheet", async ({ page }) => {
  await page.goto("/?flow=plans", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /切换训练环境/ }).click();
  const sheet = page.getByTestId("bottom-sheet");
  const option = sheet.getByRole("radio", { name: /家里/ });
  await expect(option).toBeVisible();
  const screen = await page.getByTestId("device-screen").boundingBox();
  expect(screen).not.toBeNull();
  await expect.poll(async () => (await option.boundingBox())?.y ?? Infinity).toBeLessThan(screen!.y + screen!.height - 100);
  const box = await option.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const cursor = page.getByTestId("mobile-cursor");
  await expect(cursor).toHaveAttribute("data-visible", "true");
  const layers = await page.evaluate(() => ({
    cursor: Number(getComputedStyle(document.querySelector(".mobile-cursor")!).zIndex),
    sheet: Number(getComputedStyle(document.querySelector(".bottom-sheet")!).zIndex),
    indicator: Number(getComputedStyle(document.querySelector(".home-indicator-svg")!).zIndex),
  }));
  expect(layers.cursor).toBeGreaterThan(layers.sheet);
  expect(layers.indicator).toBeGreaterThan(layers.cursor);
  await page.getByTestId("device-screen").screenshot({ path: "/private/tmp/ritmo-sheet-cursor-visible.png" });
  await option.click();
  await expect(page.getByRole("button", { name: /切换训练环境，当前家里/ })).toBeVisible();
});
