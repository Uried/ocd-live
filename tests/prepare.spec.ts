import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('la checklist interactive mesure la progression et persiste localement', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Préparer son live' }).click();
  await expect(page).toHaveURL(/\/preparer-live$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Un bon live se prépare avant même de commencer.');
  await expect(page.locator('.prepare-item input')).toHaveCount(19);
  await expect(page.locator('.prepare-progress-meter > p').first()).toContainText('Aucun point coché');
  await page.getByRole('checkbox', { name: 'Vérifier son téléphone' }).check();
  await page.getByRole('checkbox', { name: 'Vérifier la connexion Internet' }).check();
  await expect(page.locator('.prepare-progress-meter > p').first()).toContainText('2 points sur 19');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Vérifier son téléphone' })).toBeChecked();
  await expect(page.locator('.prepare-progress-meter > p').first()).toContainText('2 points sur 19');
  await page.getByRole('button', { name: 'Réinitialiser la checklist' }).click();
  await expect(page.getByRole('checkbox', { name: 'Vérifier son téléphone' })).not.toBeChecked();
  expect(writes).toEqual([]);
});

test('les liens du hero et du CTA final mènent correctement', async ({ page }) => {
  await page.goto('/preparer-live');
  await expect(page.getByRole('link', { name: 'Préparer ma séance' })).toHaveAttribute('href', '#checklist');
  await page.getByRole('link', { name: 'Réserver un live' }).click();
  await expect(page).toHaveURL(/\/reservation$/);
  await page.goBack();
  await expect(page.locator('.prepare-tips-list li')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Vous venez au studio.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vous restez chez vous.' })).toBeVisible();
  await page.getByRole('link', { name: 'Réserver ma séance' }).click();
  await expect(page).toHaveURL(/\/reservation$/);
});

for (const width of [390, 1440]) {
  test(`préparer-live responsive et accessible à ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/preparer-live');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('.prepare-cta h2')).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ animations: 'disabled', path: `test-results/prepare-${width}.png`, fullPage: true });
  });
}
