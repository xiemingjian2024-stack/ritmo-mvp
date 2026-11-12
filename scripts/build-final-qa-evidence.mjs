import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = join(root, "reports", "ritmo-v1.3-visual-qa", "figma-reference");
const actual = join(root, "reports", "ritmo-v1.3-visual-qa-final", "screenshots");
const compare = join(root, "reports", "ritmo-v1.3-visual-qa-final", "comparisons");
const contact = join(root, "reports", "ritmo-v1.3-visual-qa-final", "contact-sheet.png");
const files = [
  "01-training-next.png", "02-training-recommended.png", "03-plans-home.png",
  "04-create-plan.png", "05-plan-detail.png", "06-add-exercise.png",
  "07-active-set.png", "08-rest.png", "09-rest-parameters.png",
  "10-next-exercise.png", "11-records-home.png",
];

mkdirSync(compare, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 812, height: 892 }, deviceScaleFactor: 1 });
const url = (path) => `data:image/png;base64,${readFileSync(path).toString("base64")}`;

for (const file of files) {
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:812px;height:892px;overflow:hidden;background:#e9e7ef;font:12px -apple-system,sans-serif;color:#17151b}.label{position:absolute;top:8px;font-weight:700;letter-spacing:.05em}.left{left:10px}.right{left:413px}img{position:absolute;top:32px;width:393px;height:852px;object-fit:fill}.source{left:8px}.actual{left:411px}</style><div class="label left">FIGMA FINAL</div><div class="label right">RITMO V1.3 FIXED</div><img class="source" src="${url(join(source, file))}"><img class="actual" src="${url(join(actual, file))}">`);
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.screenshot({ path: join(compare, file) });
}

await page.setViewportSize({ width: 1242, height: 1816 });
await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:1242px;height:1816px;overflow:hidden;background:#d9d7de}.grid{display:grid;grid-template-columns:repeat(3,406px);gap:6px;padding:6px}.tile{width:406px;height:446px;overflow:hidden;background:#e9e7ef}.tile img{width:406px;height:446px;object-fit:fill;position:static}</style><div class="grid">${files.map((file) => `<div class="tile"><img src="${url(join(compare, file))}"></div>`).join("")}</div>`);
await page.waitForFunction(() => [...document.images].every((image) => image.complete));
await page.screenshot({ path: contact });
await browser.close();
