import { expect, test, type Page } from "@playwright/test";

const qaUrl = "/?flow=training&visualQa=training-home";
const storageSentinel = JSON.stringify({ untouched: "training-home-visual-qa" });

async function openQaState(page: Page) {
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", value), storageSentinel);
  await page.goto(qaUrl, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  });
}

test("fixed visual QA state is isolated and matches the final-frame geometry", async ({ page }) => {
  await openQaState(page);

  await expect(page.getByText("胸部训练")).toHaveCount(0);
  await expect(page.locator(".training-next-copy h2")).toHaveText("胸");
  await expect(page.locator(".training-next-list li")).toHaveCount(4);
  await expect(page.locator(".training-next-meta")).toContainText("约 28 分钟");

  const screen = await page.getByTestId("device-screen").boundingBox();
  expect(screen).not.toBeNull();
  const targets = {
    hero: [18, 141, 357, 504],
    start: [126, 481, 140, 140],
    quick: [18, 657, 357, 92],
    nav: [35, 758, 312, 70],
  } as const;
  const selectors = {
    hero: "[data-qa='next-card']",
    start: ".training-next-start",
    quick: "[data-qa='quick-start']",
    nav: ".training-home + .floating-nav",
  } as const;

  for (const key of Object.keys(targets) as Array<keyof typeof targets>) {
    const box = await page.locator(selectors[key]).boundingBox();
    expect(box).not.toBeNull();
    const actual = [box!.x - screen!.x, box!.y - screen!.y, box!.width, box!.height];
    actual.forEach((value, index) => expect(Math.abs(value - targets[key][index])).toBeLessThanOrEqual(3));
  }

  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe(storageSentinel);
});

test("START, environment switching and root navigation remain functional", async ({ page }) => {
  await openQaState(page);
  await page.locator(".training-next-start").click();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator(".countdown-screen strong")).toHaveText("3");
  await expect(page.locator(".training-screen")).toBeVisible({ timeout: 5_000 });

  await page.goto(qaUrl, { waitUntil: "networkidle" });
  await page.locator(".header-environment").click();
  await page.locator(".environment-options button").filter({ hasText: "家里" }).click();
  await expect(page.getByText("今天想练什么？")).toBeVisible();

  await page.goto(qaUrl, { waitUntil: "networkidle" });
  await page.locator(".floating-nav button").filter({ hasText: "方案" }).click();
  await expect(page.locator(".scheme-content h1")).toHaveText("方案");

  await page.goto(qaUrl, { waitUntil: "networkidle" });
  await page.locator(".floating-nav button").filter({ hasText: "记录" }).click();
  await expect(page.locator(".records-content h1")).toHaveText("记录");
  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe(storageSentinel);
});

for (const viewport of [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
]) {
  test(`training home stays usable at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openQaState(page);

    const frame = await page.getByTestId("phone-frame").boundingBox();
    const start = page.locator(".training-next-start");
    const quick = page.locator("[data-qa='quick-start']");
    const nav = page.locator(".training-home + .floating-nav");
    expect(frame).not.toBeNull();
    expect(frame!.x).toBeGreaterThanOrEqual(0);
    expect(frame!.y).toBeGreaterThanOrEqual(0);
    expect(frame!.x + frame!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(frame!.y + frame!.height).toBeLessThanOrEqual(viewport.height + 1);
    await expect(start).toBeVisible();
    await expect(quick).toBeVisible();
    await expect(nav).toBeVisible();
    await expect(page.locator(".training-next-copy h2")).toHaveText("胸");
    expect(await page.locator(".training-home-content").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  });
}
