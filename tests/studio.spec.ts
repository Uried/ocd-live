import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('la navigation mène au Studio et les CTA à la réservation', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Le Studio' }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bienvenue dans votre espace d’expression');
  await expect(page.getByRole('link', { name: 'Découvrir le studio' })).toHaveAttribute('href', '#experience');
  await page.getByRole('button', { name: 'Réserver une séance' }).click();
  await expect(page).toHaveURL(/\/reservation$/);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Réserver en présentiel' }).click();
  await expect(page).toHaveURL(/reservation\?mode=in-person/);
  await expect(page.getByRole('combobox', { name: 'Participation', exact: true })).toHaveValue('in-person');
  await page.goBack();
  await page.getByRole('button', { name: 'Réserver à distance' }).click();
  await expect(page).toHaveURL(/reservation\?mode=remote/);
  await expect(page.getByRole('combobox', { name: 'Participation', exact: true })).toHaveValue('remote');
  await page.goBack();
  await page.getByRole('link', { name: 'Réserver mon live' }).click();
  await expect(page).toHaveURL(/\/reservation$/);
  expect(writes).toEqual([]);
});

test('le Studio reste naturel et complet', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.studio-steps li')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Présentez en direct.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Venez au studio.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Présentez depuis chez vous.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Votre activité mérite d’être vue.' })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/démonstration|ficti[fv]|simulation|prototype|bientôt disponible|aucune réservation/i);
});

for (const width of [390, 1440]) {
  test(`studio responsive et accessible à ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('.studio-cta h2')).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ animations: 'disabled', path: `test-results/studio-${width}.png`, fullPage: true });
  });
}
