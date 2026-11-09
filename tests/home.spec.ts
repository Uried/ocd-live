import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('respecte le logo officiel et la palette orange sur fond blanc', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.hero')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', { name: 'Réserver un live en présentiel' })).toHaveCSS('background-color', 'rgb(239, 107, 7)');
  const logos = page.locator('.logo-image');
  await expect(logos).toHaveCount(2);
  for (const logo of await logos.all()) {
    await expect(logo).toHaveJSProperty('naturalWidth', 169);
    await expect(logo).toHaveJSProperty('naturalHeight', 64);
    expect(await logo.evaluate((image) => Math.abs(image.getBoundingClientRect().width / image.getBoundingClientRect().height - 169 / 64))).toBeLessThan(0.01);
  }
});

for (const width of [360, 390, 430, 768, 1024, 1440, 1600, 1920]) {
  test(`accueil sans débordement à ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const line of await page.locator('.hero-title-line').all()) {
      expect(await line.evaluate((element) => element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight))).toBeLessThan(1.1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const image = page.locator('.hero-photo img');
    await expect(image).toBeVisible();
    expect(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    for (const photo of await page.locator('.photo img').all()) {
      await photo.scrollIntoViewIfNeeded();
      await expect.poll(() => photo.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    if ([390, 768, 1440].includes(width)) {
      await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
      await page.screenshot({ path: `test-results/hero-${width}.png` });
    }
  });
}

test('les CTA présélectionnent le mode, sans requête de réservation', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Participer à distance' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('radio', { name: /À distance/ })).toBeChecked();
  await dialog.getByRole('button', { name: 'Préparer ma session' }).click();
  await expect(dialog.getByRole('heading', { name: 'Votre choix est prêt.' })).toBeVisible();
  await expect(dialog.getByText('Aucune réservation n’a été créée.', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Participer à distance' })).toBeFocused();
  await page.getByRole('button', { name: 'Réserver un live en présentiel' }).click();
  await expect(dialog.getByRole('radio', { name: /En présentiel/ })).toBeChecked();
  expect(writes).toEqual([]);
});

test('le menu mobile fonctionne au clavier et suit les ancres', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('navigation', { name: 'Navigation mobile' }).getByRole('link', { name: /FAQ/ }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page).toHaveURL(/#faq$/);
  await page.getByRole('button', { name: 'Dois-je me déplacer au Togo ?' }).click();
  await expect(page.getByText('Le mode présentiel se déroule', { exact: false })).toBeVisible();
});

test('le CTA du menu mobile ouvre la préparation et restitue le focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Réserver un live' }).click();
  await expect(page.getByRole('dialog', { name: 'À vous de choisir.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeFocused();
});

test('la préparation générique demande un choix explicite', async ({ page }) => {
  await page.goto('/');
  await page.locator('header').getByRole('button', { name: 'Réserver un live' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Préparer ma session' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Choisissez un mode de participation.');
});

for (const width of [390, 1440]) {
  test(`audit accessibilité accueil et dialogue à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Participer à distance' }).click();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}
