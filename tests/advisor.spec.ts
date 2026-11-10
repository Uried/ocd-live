import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const answer = async (page: import('@playwright/test').Page, name: string | RegExp) => {
  await page.getByRole('radio', { name }).check();
  await page.getByRole('button', { name: /Continuer|Voir ma recommandation/ }).click();
};

test('le conseiller mène de l’accueil à une recommandation puis à la réservation préremplie', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/');
  await page.getByRole('link', { name: 'Laissez-nous vous guider' }).click();
  await expect(page).toHaveURL(/\/conseiller$/);
  await expect(page.getByRole('heading', { name: 'Trouvons la formule qui vous ressemble.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuer', exact: true })).toBeDisabled();
  await answer(page, 'Présenter plusieurs produits et vendre');
  await answer(page, 'Au studio OCD Live');
  await answer(page, 'Environ 1 h 30');
  await answer(page, 'Entre 10 000 et 20 000 FCFA');
  await expect(page.getByRole('heading', { name: 'Essentiel' })).toBeVisible();
  await expect(page.locator('.advisor-result')).toContainText('15 000 FCFA');
  await expect(page.locator('.advisor-result')).toContainText('1 h 30');
  await expect(page.locator('.advisor-result')).toContainText('Au studio OCD Live');
  await page.getByRole('link', { name: 'Choisir cette formule' }).click();
  await expect(page).toHaveURL(/reservation\?mode=in-person&formule=demo-discovery/);
  await expect(page.getByRole('combobox', { name: 'Participation', exact: true })).toHaveValue('in-person');
  await expect(page.locator('.booking-toolbar')).toContainText('Essentiel');
  await expect(page.getByRole('heading', { name: 'Choisissez votre jour et votre heure.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuer', exact: true })).toBeDisabled();
  expect(writes).toEqual([]);
});

test('le conseiller retombe sur Premium quand le budget ne suffit pas', async ({ page }) => {
  await page.goto('/conseiller');
  await answer(page, 'Organiser une présentation plus longue');
  await answer(page, 'Depuis mon commerce ou mon domicile');
  await answer(page, 'Plusieurs heures');
  await answer(page, 'Moins de 10 000 FCFA');
  await expect(page.getByRole('heading', { name: 'Premium' })).toBeVisible();
  await expect(page.locator('.advisor-result')).toContainText('Tarif sur demande');
  await expect(page.locator('.advisor-result')).toContainText('À distance');
  await page.getByRole('link', { name: 'Choisir cette formule' }).click();
  await expect(page).toHaveURL(/reservation\?mode=remote&formule=premium/);
  await expect(page.getByRole('combobox', { name: 'Participation', exact: true })).toHaveValue('remote');
});

test('le retour conserve les réponses et Recommencer repart de zéro', async ({ page }) => {
  await page.goto('/conseiller');
  await page.getByRole('radio', { name: 'Faire découvrir mon activité et mes produits' }).check();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quel type de participation préférez-vous ?' })).toBeVisible();
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page.getByRole('radio', { name: 'Faire découvrir mon activité et mes produits' })).toBeChecked();
  await page.getByRole('button', { name: 'Recommencer' }).click();
  await expect(page.getByRole('radio', { name: 'Faire découvrir mon activité et mes produits' })).not.toBeChecked();
});

for (const width of [390, 1440]) {
  test(`conseiller responsive et accessible à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/conseiller');
    await expect(page.getByRole('heading', { name: 'Trouvons la formule qui vous ressemble.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await answer(page, 'Développer ma visibilité sur plusieurs séances');
    await answer(page, 'Je suis flexible');
    await answer(page, 'Je souhaite être conseillé');
    await answer(page, 'Plus de 40 000 FCFA');
    await expect(page.getByRole('heading', { name: 'Mensuel' })).toBeVisible();
    await expect(page.locator('.advisor-result')).toContainText('Au studio ou à distance');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ animations: 'disabled', path: `test-results/advisor-${width}.png`, fullPage: true });
  });
}
