import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const root = new URL("../", import.meta.url).pathname;
const out = `${root}evidence`;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1 });

async function capture(name, url, prepare) {
  await page.goto(url);
  const screen = page.getByTestId("device-screen");
  await screen.waitFor({ state: "visible" });
  const box = await screen.boundingBox();
  if (!box || Math.abs(box.width - 393) > 1 || Math.abs(box.height - 852) > 1) {
    throw new Error(`Expected 393x852 phone screen, got ${box?.width}x${box?.height}`);
  }
  if (prepare) await prepare(page);
  await screen.screenshot({ path: `${out}/${name}.png` });
}

await capture("training-active", "http://127.0.0.1:4173/?flow=training", async (p) => {
  await p.getByRole("button", { name: "暂停" }).click();
});
await capture("plans-empty", "http://127.0.0.1:4173/?flow=plans");
await capture("records-front", "http://127.0.0.1:4173/?flow=records");
await page.getByRole("button", { name: "背面" }).click();
await page.getByTestId("device-screen").screenshot({ path: `${out}/records-back.png` });

await browser.close();
console.log(out);
