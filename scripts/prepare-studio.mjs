import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('Usage: node scripts/prepare-studio.mjs <source.jpg> <destination.webp>');
const image = await readFile(source);
const browser = await chromium.launch({ channel: 'chromium', headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async (base64) => {
    const photo = new Image();
    photo.src = `data:image/jpeg;base64,${base64}`;
    await photo.decode();
    const canvas = document.createElement('canvas');
    canvas.width = photo.naturalWidth;
    canvas.height = photo.naturalHeight;
    canvas.getContext('2d').drawImage(photo, 0, 0);
    return canvas.toDataURL('image/webp', 0.92).split(',')[1];
  }, image.toString('base64'));
  await writeFile(destination, Buffer.from(result, 'base64'));
  console.log('Photographie convertie en WebP, sans recadrage ni agrandissement.');
} finally {
  await browser.close();
}
