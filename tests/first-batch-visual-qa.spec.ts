import { expect, test, type Page } from "@playwright/test";

const marker = JSON.stringify({ untouched: "first-batch-visual-qa" });

async function openQa(page: Page, path: string) {
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", value), marker);
  await page.goto(`/?visualQa=first-batch&${path}`, { waitUntil: "networkidle" });
}

test("recommended home starts a temporary workout without changing stored plans", async ({ page }) => {
  await openQa(page, "flow=training&empty=1");
  await expect(page.locator(".home-recommendation-card")).toHaveCount(2);
  await expect(page.locator(".home-recommendation-card").first()).toContainText("胸部新手训练");
  await page.locator(".home-recommendation-card .home-start-button").first().click();
  await expect(page.locator(".active-content")).toBeVisible();
  await page.getByRole("button", { name: "暂停 / 调整" }).click();
  await page.getByRole("button", { name: "跳过整个热身阶段" }).click();
  await page.getByRole("button", { name: "确认结束热身并开始力量训练" }).click();
  await expect(page.locator(".training-screen")).toBeVisible({ timeout: 6_000 });
  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe(marker);
});

test("plans QA state opens populated detail and preserves edit affordances", async ({ page }) => {
  await openQa(page, "flow=plans&qaScreen=detail");
  await expect(page.locator(".cycle-row")).toHaveCount(0);
  await expect(page.locator(".detail-exercise-row")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "编辑方案名称" })).toBeVisible();
  await expect(page.locator(".save-plan")).toHaveText("保存方案");
  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe(marker);
});

test("add-exercise QA selection and cycle ordering remain interactive", async ({ page }) => {
  await openQa(page, "flow=plans&qaScreen=add");
  await expect(page.locator(".picker-action")).toBeDisabled();
  await page.locator(".muscle-tabs").getByRole("button", { name: "背" }).click();
  await page.locator(".library-list > button:not(:disabled)").first().click();
  await expect(page.locator(".picker-action")).toHaveText("添加已选动作 · 1");
  await page.goto("/?visualQa=first-batch&flow=plans", { waitUntil: "networkidle" });
  await expect(page.locator(".cycle-row")).toHaveCount(4);
  await expect(page.locator(".plan-list-row")).toHaveCount(7);
  await page.locator(".cycle-drag").first().click();
  await expect(page.getByRole("button", { name: "下移胸部基础" })).toBeVisible();
  await page.getByRole("button", { name: "下移胸部基础" }).click();
  await expect(page.locator(".manager-notice")).toContainText("下一次训练保持为：胸部基础");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("button", { name: "从循环移出背部力量" }).click();
  await expect(page.locator(".cycle-title-line").filter({ hasText: "NEXT" })).toContainText("胸部基础");
  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe(marker);
});

test("carousels reach the right edge and can scroll to the next card", async ({ page }) => {
  await openQa(page, "flow=training&empty=1");
  const carousel = page.locator(".home-recommendations");
  const screen = await page.getByTestId("device-screen").boundingBox();
  const box = await carousel.boundingBox();
  expect(screen && box).toBeTruthy();
  expect(Math.abs(box!.x + box!.width - screen!.x - screen!.width)).toBeLessThanOrEqual(1);
  await carousel.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
  await expect.poll(() => carousel.evaluate((node) => node.scrollLeft)).toBeGreaterThan(200);
  await page.goto("/?visualQa=first-batch&flow=plans&qaScreen=create", { waitUntil: "networkidle" });
  const presets = page.locator(".preset-carousel");
  const presetBox = await presets.boundingBox();
  expect(Math.abs(presetBox!.x + presetBox!.width - screen!.x - screen!.width)).toBeLessThanOrEqual(1);
  await presets.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
  await expect.poll(() => presets.evaluate((node) => node.scrollLeft)).toBeGreaterThan(200);
});

test("My Plans retains members, grows the loop card, and shares environment with Training", async ({ page }) => {
  await openQa(page, "flow=plans");
  const card = page.locator(".cycle-card");
  const initialHeight = (await card.boundingBox())!.height;
  await expect(page.locator(".plan-cycle-switch[aria-pressed='true']")).toHaveCount(4);
  await page.getByRole("button", { name: "将核心激活加入循环" }).click();
  await expect(page.locator(".cycle-row")).toHaveCount(5);
  await expect(page.locator(".plan-list-row")).toHaveCount(7);
  const grown = await card.boundingBox();
  const heading = await page.locator(".scheme-heading").boundingBox();
  expect(grown!.height).toBeGreaterThan(initialHeight + 40);
  expect(grown!.y + grown!.height).toBeLessThan(heading!.y);
  await page.locator(".scheme-home .mobile-scroll").evaluate((node) => node.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.locator(".scheme-home .mobile-scroll").evaluate((node) => node.scrollTop)).toBe(0);
  await page.addStyleTag({ content: ".phone-bezel{clip-path:inset(70px 192px 861px 192px)!important}.device-screen{border-radius:0!important;box-shadow:none!important}" });
  const screenBox = await page.getByTestId("device-screen").boundingBox();
  await page.screenshot({ path: "reports/ritmo-first-batch-v3-qa/feedback-after/03-plans-5-cycle.png", clip: { x: screenBox!.x, y: screenBox!.y, width: 393, height: 852 } });
  await page.locator(".scheme-home .header-environment").click();
  await expect(page.getByRole("radiogroup", { name: "训练环境" })).toBeVisible();
  await expect(page.getByText("管理环境")).toHaveCount(0);
  await page.locator(".environment-options button").filter({ hasText: "家里" }).click();
  await expect(page.locator(".scheme-home .header-environment")).toContainText("家里");
  await page.locator(".floating-nav button").filter({ hasText: "训练" }).click();
  await expect(page.locator(".training-home .header-environment")).toContainText("家里");
  await page.locator(".training-home .header-environment").click();
  await page.locator(".environment-options button").filter({ hasText: "健身房" }).click();
  await page.locator(".floating-nav button").filter({ hasText: "方案" }).click();
  await expect(page.locator(".scheme-home .header-environment")).toContainText("健身房");
  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe(marker);
});

test("an empty environment offers recommendations and applying one does not create a loop", async ({ page }) => {
  await openQa(page, "flow=plans");
  await page.locator(".scheme-home .header-environment").click();
  await page.locator(".environment-options button").filter({ hasText: "家里" }).click();
  await expect(page.getByRole("heading", { name: "推荐方案" })).toBeVisible();
  await expect(page.locator(".plans-recommendations .preset-card")).toHaveCount(2);
  await expect(page.getByText("开启训练循环")).toHaveCount(0);
  if (process.env.RITMO_REVIEW_OUTPUT) {
    await page.addStyleTag({ content: ".mobile-cursor{display:none!important}" });
    await page.getByTestId("device-screen").screenshot({ path: `${process.env.RITMO_REVIEW_OUTPUT}/12-plans-empty-home.png` });
  }
  await page.locator(".plans-recommendations .primary-button").first().click();
  await expect(page.getByRole("heading", { name: "我的方案" })).toBeVisible();
  await expect(page.locator(".plan-list-row")).toHaveCount(1);
  await expect(page.locator(".cycle-card")).toHaveCount(0);
  await page.locator(".plan-cycle-switch").click();
  await expect(page.locator(".cycle-card .cycle-row")).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"))).toBe(marker);
});

test("the three root tabs share one capsule geometry", async ({ page }) => {
  await openQa(page, "flow=training&empty=1");
  const size = async () => page.locator(".floating-nav").evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
  });
  const header = async () => page.locator(".root-header").evaluate((node) => ({
    height: Math.round(node.getBoundingClientRect().height),
    titleSize: getComputedStyle(node.querySelector("h1")!).fontSize,
  }));
  const training = await size();
  const trainingHeader = await header();
  await page.locator(".floating-nav button").filter({ hasText: "方案" }).click();
  const plans = await size();
  const plansHeader = await header();
  await page.locator(".floating-nav button").filter({ hasText: "记录" }).click();
  const records = await size();
  const recordsHeader = await header();
  expect(plans).toEqual(training);
  expect(records).toEqual(training);
  expect(plansHeader).toEqual(trainingHeader);
  expect(recordsHeader).toEqual(trainingHeader);
});

test("vertical pages still scroll without a visible scroll indicator", async ({ page }) => {
  await openQa(page, "flow=records");
  await expect(page.locator(".records-screen .mobile-scrollbar")).toBeHidden();
  const scroll = page.locator(".records-screen .mobile-scroll");
  await scroll.evaluate((node) => node.scrollTo({ top: 300, behavior: "instant" }));
  await expect.poll(() => scroll.evaluate((node) => node.scrollTop)).toBeGreaterThan(200);
});
