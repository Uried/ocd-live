import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('le Hero immersif conserve la marque et les autres compositions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Votre activité mérite d’être vue.');
  await expect(page.locator('.hero')).toHaveCSS('background-color', 'rgb(23, 23, 23)');
  const primary = page.getByRole('button', { name: 'Réserver mon live' });
  await expect(primary).toHaveCSS('background-color', 'rgb(239, 107, 7)');
  await expect(primary).toHaveCSS('color', 'rgb(23, 23, 23)');
  await expect(primary).toHaveCSS('border-radius', '14px');
  await expect(page.locator('.how-it-works')).toHaveCSS('border-radius', '32px');
  await expect(page.locator('.logo-inverse .logo-live')).toHaveCSS('color', 'rgb(23, 23, 23)');
  await expect(page.locator('.hero-photo img')).toHaveJSProperty('naturalWidth', 1376);
  await expect(page.locator('.hero-photo img')).toHaveJSProperty('naturalHeight', 768);
  await expect(page.locator('.hero-photo img')).toHaveAttribute('fetchpriority', 'high');
  await expect(page.locator('.hero-photo img')).toHaveAttribute('loading', 'eager');
  await expect(page.locator('.hero-description')).toHaveText('Présentez vos produits, développez votre visibilité et échangez directement avec votre audience grâce aux lives OCD Live.');
  const logos = page.locator('.logo-image');
  await expect(logos).toHaveCount(2);
  for (const logo of await logos.all()) {
    await expect(logo).toHaveJSProperty('naturalWidth', 169);
    await expect(logo).toHaveJSProperty('naturalHeight', 64);
    expect(await logo.evaluate((image) => Math.abs(image.getBoundingClientRect().width / image.getBoundingClientRect().height - 169 / 64))).toBeLessThan(0.01);
  }
});

test('correction éditoriale : les interfaces publiques restent naturelles', async ({ page }) => {
  const technicalCopy = /démonstration|ficti[fv]|simulation|prototype|aperçu|bientôt disponible|aucune réservation|exemple de|non commercialisé|à confirmer|à renseigner|officiels à venir|futur parcours|sur cette version|pas encore|ultérieurement/i;
  const checkCopy = async () => expect(await page.locator('body').innerText()).not.toMatch(technicalCopy);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await checkCopy();
  for (const question of await page.locator('.accordion-trigger').all()) {
    await question.click();
    await checkCopy();
  }
  await page.getByRole('button', { name: 'Choisir la distance' }).click();
  await checkCopy();
  await expect(page.getByRole('heading', { name: 'Le bon format. Pour vous.' })).toBeVisible();
  await checkCopy();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Confidentialité & crédits' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await checkCopy();
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
    const framing = await image.evaluate((element) => {
      const img = element as HTMLImageElement;
      const frame = img.getBoundingClientRect();
      const [px = 50, py = 50] = getComputedStyle(img).objectPosition.split(' ').map(parseFloat);
      const scale = Math.max(frame.width / img.naturalWidth, frame.height / img.naturalHeight);
      const ox = frame.x + (frame.width - img.naturalWidth * scale) * px / 100;
      const oy = frame.y + (frame.height - img.naturalHeight * scale) * py / 100;
      const regions = [
        { name: 'logo', x: 665, y: 218, right: 937, bottom: 362 },
        { name: 'visage, mains et produit', x: 895, y: 196, right: 1145, bottom: 520 },
      ].map((region) => ({ name: region.name, left: ox + region.x * scale, top: oy + region.y * scale, right: ox + region.right * scale, bottom: oy + region.bottom * scale }));
      const copy = document.querySelector('.hero-copy')!.getBoundingClientRect();
      return { frame: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom }, regions, copy: { right: copy.right, top: copy.top } };
    });
    for (const region of framing.regions) {
      expect(region.left, region.name).toBeGreaterThanOrEqual(framing.frame.left - 1);
      expect(region.right, region.name).toBeLessThanOrEqual(framing.frame.right + 1);
      expect(region.top, region.name).toBeGreaterThanOrEqual(framing.frame.top - 1);
      expect(region.bottom, region.name).toBeLessThanOrEqual(framing.frame.bottom + 1);
    }
    if (width > 900) {
      expect(framing.copy.right).toBeLessThan(framing.regions[0]!.left);
    } else {
      expect(framing.copy.top).toBeGreaterThan(framing.regions[1]!.bottom);
    }
    await page.locator('.hero').screenshot({ animations: 'disabled', path: `test-results/hero-${width}.png` });
    if ([390, 768, 1440].includes(width)) {
      await page.screenshot({ animations: 'disabled', path: `test-results/home-${width}.png`, fullPage: true });
    }
  });
}

test('les CTA présélectionnent le mode, sans requête de réservation', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Choisir la distance' }).click();
  await expect(page).toHaveURL(/reservation\?mode=remote/);
  await expect(page.getByRole('combobox', { name: 'Participation', exact: true })).toHaveValue('remote');
  await expect(page.locator('.package-card')).toHaveCount(6);
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Accueil', exact: true }).click();
  await page.getByRole('button', { name: 'Choisir le présentiel' }).click();
  await expect(page.getByRole('combobox', { name: 'Participation', exact: true })).toHaveValue('in-person');
  expect(writes).toEqual([]);
});

for (const [mode, label] of [['in-person', /En présentiel/], ['remote', /À distance/]] as const) {
  test(`le nouveau Hero mène à la présentation et au parcours ${mode}`, async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()); });
    await page.goto('/');
    await page.getByRole('link', { name: 'Découvrir OCD Live' }).click();
    await expect(page).toHaveURL(/#participer$/);
    await expect(page.locator('#participation-title')).toBeInViewport();
    await page.goto('/');
    await page.getByRole('button', { name: 'Réserver mon live' }).click();
    const dialog = page.getByRole('dialog', { name: 'À vous de choisir.' });
    await expect(dialog.getByRole('radio').first()).not.toBeChecked();
    await expect(dialog.getByRole('radio').last()).not.toBeChecked();
    await dialog.getByRole('radio', { name: label }).check();
    await dialog.getByRole('button', { name: 'Découvrir les formules' }).click();
    await expect(page).toHaveURL(new RegExp(`reservation\\?mode=${mode}$`));
    await expect(page.getByRole('combobox', { name: 'Participation', exact: true })).toHaveValue(mode);
    expect(writes).toEqual([]);
  });
}

test('le Hero respecte la réduction des animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.hero-copy')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
});

test('les actions du Hero restent utilisables si la photo ne charge pas', async ({ page }) => {
  await page.route('**/hero-studio*.webp', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.hero .photo-fallback')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Réserver mon live' }).click();
  await expect(page.getByRole('dialog', { name: 'À vous de choisir.' })).toBeVisible();
});

test('le menu mobile fonctionne au clavier et suit les ancres', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCSS('border-radius', '20px');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ animations: 'disabled', path: 'test-results/menu-390.png' });
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
  await dialog.getByRole('button', { name: 'Découvrir les formules' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Choisissez un mode de participation.');
});

for (const width of [390, 1440]) {
  test(`audit accessibilité accueil et dialogue à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('header').getByRole('button', { name: 'Réserver un live' }).click();
    await expect(page.getByRole('dialog')).toHaveCSS('border-radius', width === 390 ? '20px' : '22px');
    await expect(page.locator('.mode-option').first()).toHaveCSS('border-radius', '14px');
    await page.screenshot({ animations: 'disabled', path: `test-results/booking-${width}.png` });
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}
