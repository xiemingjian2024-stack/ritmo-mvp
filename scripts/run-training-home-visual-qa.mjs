import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const baseURL = process.env.RITMO_QA_URL || "http://127.0.0.1:4174";
const report = join(root, "reports", "ritmo-training-home-v3-qa");
const sourcePath = join(report, "source", "figma-final.png");
const beforePath = join(report, "iterations", "00-before.png");
const afterPath = join(report, "final", "01-after.png");
const overlayPath = join(report, "final", "02-overlay-50.png");
const heatmapPath = join(report, "final", "03-difference-heatmap.png");
const comparisonPath = join(report, "final", "04-figma-before-after.png");
const metricsPath = join(report, "final", "metrics.json");
mkdirSync(join(report, "final"), { recursive: true });

const figma = {
  title: { x: 18, y: 72, width: 84, height: 53 },
  environment: { x: 222, y: 74.5, width: 93, height: 48 },
  settings: { x: 327, y: 74.5, width: 48, height: 48 },
  hero: { x: 18, y: 141, width: 357, height: 504 },
  image: { x: 18, y: 141, width: 357, height: 504 },
  trainingName: { x: 42, y: 207, width: 150, height: 80 },
  actionList: { x: 18, y: 318, width: 357, height: 132 },
  start: { x: 126, y: 481, width: 140, height: 140 },
  quickStart: { x: 18, y: 657, width: 357, height: 92 },
  navigation: { x: 35, y: 758, width: 312, height: 70 },
};

const selectors = {
  title: ".training-home .root-header h1",
  environment: ".training-home .header-environment",
  settings: ".training-home .root-header .icon-button",
  hero: "[data-qa='next-card']",
  image: ".training-next-photo",
  trainingName: ".training-next-copy h2",
  actionList: ".training-next-list",
  start: ".training-next-start",
  quickStart: "[data-qa='quick-start']",
  navigation: ".training-home + .floating-nav",
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 1100 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));
const sentinel = JSON.stringify({ untouched: "training-home-visual-qa" });
await page.addInitScript((value) => localStorage.setItem("ritmo-demo-v3", value), sentinel);
await page.goto(`${baseURL}/?flow=training&visualQa=training-home`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
});
await page.waitForTimeout(350);

// The QA evidence is the app viewport itself, not the simulator's rounded device shell.
// Status and safe-area content stay visible; only the demonstrator bezel treatment is removed.
await page.addStyleTag({ content: ".phone-bezel{clip-path:inset(70px 192px 861px 192px)!important}.device-screen{border-radius:0!important;box-shadow:none!important}" });

const screen = page.getByTestId("device-screen");
const screenBox = await screen.boundingBox();
if (!screenBox || Math.abs(screenBox.width - 393) > 1 || Math.abs(screenBox.height - 852) > 1) {
  throw new Error(`Expected 393 × 852 app screen, received ${screenBox?.width} × ${screenBox?.height}`);
}
await page.screenshot({ path: afterPath, clip: { x: Math.round(screenBox.x), y: Math.round(screenBox.y), width: 393, height: 852 } });

const current = {};
for (const [name, selector] of Object.entries(selectors)) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Missing visual QA element: ${name} (${selector})`);
  current[name] = {
    x: +(box.x - screenBox.x).toFixed(1),
    y: +(box.y - screenBox.y).toFixed(1),
    width: +box.width.toFixed(1),
    height: +box.height.toFixed(1),
  };
}

const storedAfterQa = await page.evaluate(() => localStorage.getItem("ritmo-demo-v3"));
if (storedAfterQa !== sentinel) throw new Error("Visual QA mode modified the existing RITMO localStorage value");
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(" | ")}`);

const metrics = Object.fromEntries(Object.keys(figma).map((name) => {
  const target = figma[name];
  const actual = current[name];
  return [name, {
    figma: target,
    current: actual,
    delta: {
      x: +(actual.x - target.x).toFixed(1),
      y: +(actual.y - target.y).toFixed(1),
      width: +(actual.width - target.width).toFixed(1),
      height: +(actual.height - target.height).toFixed(1),
    },
  }];
}));
writeFileSync(metricsPath, JSON.stringify({ viewport: { width: 393, height: 852, deviceScaleFactor: 1 }, metrics }, null, 2));

const toData = (path) => `data:image/png;base64,${readFileSync(path).toString("base64")}`;
const sourceData = toData(sourcePath);
const beforeData = toData(beforePath);
const afterData = toData(afterPath);

const artifactPage = await context.newPage();
await artifactPage.setViewportSize({ width: 1200, height: 1000 });
await artifactPage.setContent(`<canvas id="canvas" width="393" height="852"></canvas>`);
await artifactPage.evaluate(async ({ sourceData, afterData }) => {
  const load = (src) => new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(image); image.src = src; });
  const [source, after] = await Promise.all([load(sourceData), load(afterData)]);
  const canvas = document.querySelector("canvas"); const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, 393, 852); ctx.globalAlpha = 0.5; ctx.drawImage(after, 0, 0, 393, 852); ctx.globalAlpha = 1;
}, { sourceData, afterData });
await artifactPage.locator("canvas").screenshot({ path: overlayPath });

await artifactPage.evaluate(async ({ sourceData, afterData }) => {
  const load = (src) => new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(image); image.src = src; });
  const [source, after] = await Promise.all([load(sourceData), load(afterData)]);
  const canvas = document.querySelector("canvas"); const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, 393, 852); const a = ctx.getImageData(0, 0, 393, 852);
  ctx.clearRect(0, 0, 393, 852); ctx.drawImage(after, 0, 0, 393, 852); const b = ctx.getImageData(0, 0, 393, 852);
  const out = ctx.createImageData(393, 852);
  for (let i = 0; i < a.data.length; i += 4) {
    const diff = (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])) / 3;
    const alpha = diff < 18 ? 0 : Math.min(235, 45 + diff * 1.45);
    out.data[i] = 255; out.data[i + 1] = Math.max(0, 118 - diff); out.data[i + 2] = 70; out.data[i + 3] = alpha;
  }
  ctx.fillStyle = "#17151f"; ctx.fillRect(0, 0, 393, 852); ctx.putImageData(out, 0, 0);
}, { sourceData, afterData });
await artifactPage.locator("canvas").screenshot({ path: heatmapPath });

await artifactPage.setViewportSize({ width: 1199, height: 900 });
await artifactPage.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;background:#dddbe3;font:12px -apple-system,sans-serif}.grid{display:grid;grid-template-columns:repeat(3,393px);gap:10px;padding:10px}.cell{position:relative;padding-top:28px;background:#fff}.cell b{position:absolute;top:7px;left:10px}.cell img{display:block;width:393px;height:852px}</style><div class="grid"><div class="cell"><b>FIGMA FINAL</b><img src="${sourceData}"></div><div class="cell"><b>BEFORE</b><img src="${beforeData}"></div><div class="cell"><b>AFTER</b><img src="${afterData}"></div></div>`);
await artifactPage.waitForFunction(() => [...document.images].every((image) => image.complete));
await artifactPage.screenshot({ path: comparisonPath, fullPage: true });

await browser.close();
console.log(JSON.stringify({ afterPath, overlayPath, heatmapPath, comparisonPath, metricsPath, consoleErrors, localStoragePreserved: true }, null, 2));
