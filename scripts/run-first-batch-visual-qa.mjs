import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const baseURL = process.env.RITMO_QA_URL || "http://127.0.0.1:4174";
const phase = process.argv[2] || "before";
const report = join(root, "reports", "ritmo-first-batch-v3-qa");
const output = join(report, phase);
const reference = join(root, "reports", "ritmo-v1.3-visual-audit", "figma-final-normalized");
mkdirSync(output, { recursive: true });

const screens = [
  { name: "02-training-recommended", url: "/?flow=training&visualQa=first-batch&empty=1", selectors: { title: ".root-header h1", lead: ".recommendation-home h2", carousel: ".home-recommendations", card: ".home-recommendation-card", action: ".home-recommendation-card .home-start-button", secondary: ".custom-training-entry", nav: ".floating-nav" } },
  { name: "03-plans-home", url: "/?flow=plans&visualQa=first-batch", selectors: { title: ".root-header h1", cycle: ".cycle-card", cycleFirst: ".cycle-row", myPlans: ".scheme-heading", independent: ".independent-list", nav: ".floating-nav" } },
  { name: "04-create-plan", url: "/?flow=plans&visualQa=first-batch&qaScreen=create", selectors: { header: ".subpage-header", blank: ".blank-plan-card", recommendTitle: ".create-section h2", card: ".preset-card", action: ".preset-card .primary-button" } },
  { name: "05-plan-detail", url: "/?flow=plans&visualQa=first-batch&qaScreen=detail", selectors: { sheet: ".bottom-sheet:has(.plan-detail)", title: ".plan-detail-heading", firstRow: ".detail-exercise-row", add: ".manual-add.compact", action: ".save-plan" } },
  { name: "06-add-exercise", url: "/?flow=plans&visualQa=first-batch&qaScreen=add", selectors: { sheet: ".bottom-sheet:has(.exercise-picker-layout)", title: ".sheet-title", search: ".search-field", filter: ".availability-switch", firstRow: ".library-list > button", action: ".picker-action" }, selectThree: true },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 1100 }, deviceScaleFactor: 1 });
const metrics = {};
const sentinel = JSON.stringify({ untouched: "first-batch-visual-qa" });
for (const screen of screens) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", value), sentinel);
  await page.goto(baseURL + screen.url, { waitUntil: "networkidle" });
  if (screen.selectThree) for (let index = 0; index < 3; index += 1) await page.locator(".library-list > button").nth(index).click();
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))); });
  await page.waitForTimeout(300);
  await page.addStyleTag({ content: ".phone-bezel{clip-path:inset(70px 192px 861px 192px)!important}.device-screen{border-radius:0!important;box-shadow:none!important}" });
  const box = await page.getByTestId("device-screen").boundingBox();
  if (!box || Math.abs(box.width - 393) > 1 || Math.abs(box.height - 852) > 1) throw new Error(`${screen.name}: expected 393 × 852 app viewport`);
  const path = join(output, `${screen.name}.png`);
  await page.screenshot({ path, clip: { x: Math.round(box.x), y: Math.round(box.y), width: 393, height: 852 } });
  const elements = {};
  for (const [name, selector] of Object.entries(screen.selectors)) {
    const rect = await page.locator(selector).first().boundingBox();
    if (!rect) throw new Error(`${screen.name}: missing ${name} (${selector})`);
    elements[name] = { x: +(rect.x - box.x).toFixed(1), y: +(rect.y - box.y).toFixed(1), width: +rect.width.toFixed(1), height: +rect.height.toFixed(1) };
  }
  if (await page.evaluate(() => localStorage.getItem("ritmo-demo-v3")) !== sentinel) throw new Error(`${screen.name}: QA wrote user storage`);
  if (errors.length) throw new Error(`${screen.name}: ${errors.join(" | ")}`);
  metrics[screen.name] = elements;
  await page.close();
}
writeFileSync(join(output, "metrics.json"), JSON.stringify(metrics, null, 2));

if (phase === "after" || phase === "feedback-after") {
  for (const screen of screens) {
    const toData = (path) => `data:image/png;base64,${readFileSync(path).toString("base64")}`;
    const figma = toData(join(reference, `${screen.name}.png`));
    const before = toData(join(report, phase === "after" ? "before" : "after", `${screen.name}.png`));
    const after = toData(join(output, `${screen.name}.png`));
    const canvasPage = await context.newPage();
    await canvasPage.setContent(`<canvas width="393" height="852"></canvas>`);
    await canvasPage.evaluate(async ({ figma, after }) => {
      const load = (src) => new Promise((done) => { const image = new Image(); image.onload = () => done(image); image.src = src; });
      const [source, current] = await Promise.all([load(figma), load(after)]);
      const ctx = document.querySelector("canvas").getContext("2d");
      ctx.drawImage(source, 0, 0, 393, 852); ctx.globalAlpha = 0.5; ctx.drawImage(current, 0, 0, 393, 852); ctx.globalAlpha = 1;
    }, { figma, after });
    await canvasPage.locator("canvas").screenshot({ path: join(output, `${screen.name}-overlay.png`) });
    await canvasPage.setViewportSize({ width: 1209, height: 900 });
    await canvasPage.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#dddbe3;font:12px -apple-system,sans-serif}.grid{display:grid;grid-template-columns:repeat(3,393px);gap:10px;padding:10px}.cell{position:relative;padding-top:28px;background:#fff}.cell b{position:absolute;top:7px;left:10px}.cell img{display:block;width:393px;height:852px}</style><div class="grid"><div class="cell"><b>FIGMA FINAL</b><img src="${figma}"></div><div class="cell"><b>${phase === "after" ? "BEFORE" : "PREVIOUS"}</b><img src="${before}"></div><div class="cell"><b>${phase === "after" ? "AFTER" : "FEEDBACK FIX"}</b><img src="${after}"></div></div>`);
    await canvasPage.waitForFunction(() => [...document.images].every((image) => image.complete));
    await canvasPage.screenshot({ path: join(output, `${screen.name}-comparison.png`), fullPage: true });
    await canvasPage.close();
  }
}
await browser.close();
console.log(JSON.stringify({ phase, output, screens: screens.map((screen) => screen.name), storagePreserved: true }));
