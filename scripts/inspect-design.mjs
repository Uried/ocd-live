import { chromium } from 'playwright-core';

const url = process.argv[2];
const prefix = process.argv[3];
if (!url || !prefix) throw new Error('Usage: node scripts/inspect-design.mjs <url> <output-prefix>');
const browser = await chromium.launch({ channel: 'chromium', headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (const photo of await page.locator('.photo img').all()) {
      await photo.scrollIntoViewIfNeeded();
      await photo.evaluate((image) => image.decode());
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ animations: 'disabled', path: `${prefix}-${width}.png`, fullPage: true });
    await page.screenshot({ animations: 'disabled', path: `${prefix}-hero-${width}.png` });
    console.log(JSON.stringify({ url, width, status: response.status(), ...await page.evaluate(() => ({ title: document.title, heading: document.querySelector('h1')?.innerText, overflow: document.documentElement.scrollWidth > innerWidth, heroBackground: document.querySelector('.hero') && getComputedStyle(document.querySelector('.hero')).backgroundColor, buttons: [...document.querySelectorAll('.hero-buttons button')].map((button) => ({ label: button.innerText, color: getComputedStyle(button).backgroundColor, radius: getComputedStyle(button).borderRadius })) })) }));
    await page.close();
  }
} finally {
  await browser.close();
}
