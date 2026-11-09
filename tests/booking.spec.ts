import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
  test(`comparaison responsive et accessible à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/reservation?mode=remote');
    await expect(page.locator('.package-card')).toHaveCount(6);
    for (const [name, price] of [['Essentiel', /15\s*000 FCFA/], ['Long format', /32\s*000 FCFA/], ['Mensuel', /54\s*000 FCFA/], ['Découverte', /7\s*500 FCFA/], ['Duo', /15\s*000 FCFA/], ['Premium', /Tarif sur demande/]] as const) {
      await expect(page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })).toContainText(price);
    }
    await expect(page.locator('.package-grid')).not.toContainText(/Boovan|suggestion|fictif|démonstration/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `test-results/packages-${width}.png`, fullPage: true });
  });
}

test('parcours distance, retours, changement de durée et conservation des informations', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Choisir la distance' }).click();
  await page.getByRole('button', { name: 'Choisir Essentiel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuer', exact: true })).toBeDisabled();
  await page.locator('.calendar-day:not([disabled])').last().click();
  await expect(page.getByRole('button', { name: 'Continuer', exact: true })).toBeDisabled();
  await page.getByLabel('Heure de début souhaitée', { exact: true }).fill('10:15');
  await expect(page.locator('.schedule-recap')).toContainText('10:15 – 11:45');
  await page.screenshot({ animations: 'disabled', path: 'test-results/schedule-step.png' });
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  for (const [label, value] of [['Nom complet', 'Ama Mensah'], ['Adresse e-mail', 'ama@example.com'], ['Téléphone', '+22890000000'], ['Nom de votre activité', 'Atelier Ama'], ['Secteur d’activité', 'Mode'], ['Ville et pays', 'Lomé, Togo'], ['Lieu de connexion', 'Mon atelier'], ['Équipement et connexion internet disponibles', 'Ordinateur et fibre']] as const) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Voir mon récapitulatif' }).click();
  await expect(page.locator('.booking-summary')).toContainText('Ama Mensah');
  await page.getByRole('button', { name: 'Changer de formule', exact: true }).click();
  await page.getByRole('button', { name: 'Choisir Long format', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuer', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Heure de début souhaitée', { exact: true })).toHaveValue('');
  await page.locator('.calendar-day:not([disabled])').last().click();
  await page.getByLabel('Heure de début souhaitée', { exact: true }).fill('09:00');
  await expect(page.locator('.schedule-recap')).toContainText('09:00 – 13:00');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByLabel('Nom complet', { exact: true })).toHaveValue('Ama Mensah');
  await page.getByRole('button', { name: 'Voir mon récapitulatif' }).click();
  await page.getByRole('button', { name: 'Terminer ma sélection' }).click();
  await expect(page.getByRole('heading', { name: 'Votre sélection est prête.' })).toBeVisible();
  await expect(page.locator('.booking-summary')).toContainText('Long format');
  await page.getByRole('link', { name: 'Revenir à l’accueil' }).first().click();
  await page.getByRole('button', { name: 'Choisir la distance' }).click();
  await expect(page.getByRole('heading', { name: 'Votre sélection est prête.' })).toBeVisible();
  expect(writes).toEqual([]);
});

test('le calendrier refuse une heure passée aujourd’hui et se pilote au clavier', async ({ page }) => {
  await page.goto('/reservation?mode=remote');
  await page.getByRole('button', { name: 'Choisir Essentiel', exact: true }).click();
  await page.locator('.calendar-day[data-today]').click();
  await page.locator('input[type=time]').fill('00:01');
  await expect(page.getByRole('alert')).toHaveText('Choisissez une heure à venir.');
  await expect(page.getByRole('button', { name: 'Continuer', exact: true })).toBeDisabled();
  await expect(page.locator('input[type=time]')).toHaveAttribute('aria-invalid', 'true');
  const today = page.locator('.calendar-day[data-today]');
  const todayNumber = Number(await today.getAttribute('data-day'));
  await today.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => Number((document.activeElement as HTMLElement | null)?.dataset.day))).toBeGreaterThan(todayNumber);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => Number((document.activeElement as HTMLElement | null)?.dataset.day))).toBeGreaterThan(todayNumber + 1);
  const selected = page.locator('.calendar-day[aria-pressed="true"]');
  await selected.hover();
  await expect(selected).toHaveCSS('background-color', 'rgb(41, 41, 41)');
  await page.locator('select').selectOption('in-person');
  await expect(page).toHaveURL(/mode=in-person/);
});

test('la navigation mensuelle reste dans la période de réservation', async ({ page }) => {
  await page.goto('/reservation?mode=remote');
  await page.getByRole('button', { name: 'Choisir Essentiel', exact: true }).click();
  const next = page.getByRole('button', { name: 'Mois suivant', exact: true });
  for (let index = 0; index < 5 && await next.isEnabled(); index++) await next.click();
  await expect(next).toBeDisabled();
});

test('mensuel avec quatre séances et calendrier à convenir, informations adaptées au studio', async ({ page }) => {
  await page.goto('/reservation?mode=in-person');
  await page.getByRole('button', { name: 'Choisir Mensuel', exact: true }).click();
  await expect(page.locator('.booking-panel')).toContainText('4 séances de 1 h 30 / mois');
  await expect(page.locator('.booking-toolbar')).toContainText(/54\s*000 FCFA/);
  await expect(page.locator('.calendar-day')).toHaveCount(0);
  await expect(page.getByLabel('Heure de début souhaitée', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByLabel('Lieu de connexion', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Votre session se déroule dans les locaux OCD Live au Togo.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Voir mon récapitulatif' }).click();
  await expect(page.getByRole('heading', { name: 'Faisons connaissance.' })).toBeVisible();
});
