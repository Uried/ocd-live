import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const source = process.argv[2];
const destination = process.argv[3];
if (!source || !destination) throw new Error('Usage: node scripts/prepare-brand.mjs <source.png> <destination.png>');
const data = await readFile(source);
const browser = await chromium.launch({ channel: 'chromium', headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
    const colors = new Map();
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const [r, g, b, alpha] = pixels.slice(index, index + 4);
        if (alpha > 8) {
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
        if (alpha > 240 && r > 100 && r > g * 1.3 && g > b * 1.5) {
          const color = '#' + [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('');
          colors.set(color, (colors.get(color) ?? 0) + 1);
        }
      }
    }
    if (right < left || bottom < top || colors.size === 0) throw new Error('Logo vide ou orange introuvable.');
    const cropped = document.createElement('canvas');
    cropped.width = right - left + 1;
    cropped.height = bottom - top + 1;
    cropped.getContext('2d').drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    return { png: cropped.toDataURL('image/png').split(',')[1], width: cropped.width, height: cropped.height, orange: [...colors].sort((a, b) => b[1] - a[1])[0][0] };
  }, data.toString('base64'));
  await writeFile(destination, Buffer.from(result.png, 'base64'));
  console.log(JSON.stringify({ width: result.width, height: result.height, orange: result.orange }, null, 2));
} finally {
  await browser.close();
}
