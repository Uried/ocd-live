/* eslint-disable @typescript-eslint/no-explicit-any -- les réponses JSON de l'API sont volontairement non typées */
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type BrowserContext } from '@playwright/test';

/**
 * Intégration contre une API de CONTRÔLE déployée (jamais la production).
 * Un vrai navigateur passe le contrôle anti-robot de l'hébergeur gratuit, puis réutilise son cookie.
 * Les écritures restent dans la base de contrôle ; aucun SQL n'est exécuté par ce fichier.
 */
const env = (name: string) => process.env[name]?.trim() ?? '';
const enabled = env('OCD_TEST_CONFIRM_ISOLATED') === 'YES';
const required = ['OCD_TEST_API_URL', 'OCD_TEST_PREFLIGHT_TOKEN', 'OCD_TEST_EXPECT_DB', 'OCD_TEST_ADMIN_EMAIL', 'OCD_TEST_ADMIN_PASSWORD', 'OCD_TEST_DATE', 'OCD_TEST_MONTHLY_DATES'];

test.describe.configure({ mode: 'serial' });
test.describe('API de contrôle', () => {
  test.skip(!enabled, 'Désactivé : exige OCD_TEST_CONFIRM_ISOLATED=YES et une API de contrôle préparée. Aucune requête envoyée.');

  let context: BrowserContext;
  let base = '';
  let csrf = '';
  const nonce = randomBytes(8).toString('hex');
  const created: Record<string, unknown> = { nonce, bookings: [], quotes: [] };
  const key = (name: string) => `${nonce}-${name}`;

  type Reply = { status: number; body: Record<string, any> };
  const call = async (method: string, path: string, data?: unknown, headers: Record<string, string> = {}, ctx: BrowserContext = context): Promise<Reply> => {
    const response = await ctx.request.fetch(base + path, { method, data, headers: { ...(csrf && ctx === context ? { 'X-CSRF-Token': csrf } : {}), ...headers }, failOnStatusCode: false, maxRedirects: 3 });
    const text = await response.text();
    if (text.includes('aes.js')) throw new Error('Le contrôle anti-robot de l’hébergeur a bloqué la requête : le cookie du navigateur n’a pas été réutilisé.');
    return { status: response.status(), body: JSON.parse(text) as Record<string, any> };
  };
  const booking = (mode: 'in_person' | 'remote', packageId: number, date: string, time: string, extra: Record<string, unknown> = {}) => ({
    first_name: 'QA', last_name: `Controle ${nonce}`, phone: '+22890000000', email: `qa-${nonce}@example.com`, mode, package_id: packageId, date, time,
    business: { business_name: `Activité de contrôle ${nonce}`, activity_sector: 'Contrôle', country: 'Togo', city: 'Lomé' }, ...extra,
  });
  const date = env('OCD_TEST_DATE');
  const monthlyDates = env('OCD_TEST_MONTHLY_DATES').split(',').map((value) => value.trim());
  let packages: Record<string, any> = {};
  let winner = { id: 0, reference: '', key: '' };
  let monthlyId = 0;

  test.beforeAll(async ({ browser }) => {
    for (const name of required) if (!env(name)) throw new Error(`Réglage manquant : ${name}`);
    if (monthlyDates.length !== 4 || new Set(monthlyDates).size !== 4) throw new Error('OCD_TEST_MONTHLY_DATES doit contenir quatre dates distinctes (séances 1 à 4).');
    const url = new URL(env('OCD_TEST_API_URL'));
    const forbidden = env('OCD_TEST_FORBIDDEN_HOSTS').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
    if (url.protocol !== 'https:' || url.username || forbidden.includes(url.hostname.toLowerCase())) throw new Error('Cible refusée : HTTPS requis et hôte de production interdit.');
    base = url.href.replace(/\/$/, '') + '/';
    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(base + 'packages');
    await page.waitForLoadState('networkidle');
    await page.close();
  });
  test.afterAll(async () => {
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/api-integration-report.json', JSON.stringify(created, null, 2));
    await context?.close();
  });

  test('isolation : préflight, rôle control, base attendue et marqueur', async () => {
    const { status, body } = await call('GET', 'preflight', undefined, { 'X-Preflight-Token': env('OCD_TEST_PREFLIGHT_TOKEN') });
    expect(status).toBe(200);
    const check = body.data;
    expect(check.role).toBe('control');
    expect(check.database.name).toBe(env('OCD_TEST_EXPECT_DB'));
    if (env('OCD_PRODUCTION_DB')) expect(check.database.name).not.toBe(env('OCD_PRODUCTION_DB'));
    expect(check.database.matches_control_name).toBe(true);
    expect(check.database.environment_marker).toBe(true);
    expect(check.database.tables_missing).toEqual([]);
    expect(check.database.named_lock_roundtrip).toBe(true);
    expect(check.database.active_packages).toBe(6);
    expect(check.database.active_rules.in_person).toBeGreaterThan(0);
    expect(check.database.active_rules.remote).toBeGreaterThan(0);
    expect([check.https, check.cookie_secure, check.php_ok, check.app_key_ok]).toEqual([true, true, true, true]);
    expect(Object.values(check.extensions)).not.toContain(false);
    expect(Object.values(check.writable)).not.toContain(false);
    created.database = { name: check.database.name, version: check.database.version, php: check.php_version, functions: check.functions };
  });

  test('les formules et la disponibilité sont lues depuis la base', async () => {
    const list = await call('GET', 'packages');
    expect(list.status).toBe(200);
    packages = Object.fromEntries(list.body.data.packages.map((item: Record<string, any>) => [item.code, item]));
    expect(Object.keys(packages).sort()).toEqual(['DECOUVERTE', 'DUO', 'ESSENTIEL', 'LONG_FORMAT', 'MENSUEL', 'PREMIUM']);
    expect(packages.MENSUEL.sessions_count).toBe(4);
    const day = await call('GET', `availability?mode=in_person&date=${date}&package_id=${packages.ESSENTIEL.id}`);
    expect(day.status).toBe(200);
    expect(day.body.data.availability_checked).toBe(true);
    expect(day.body.data.windows.length).toBeGreaterThan(0);
    expect((await call('GET', `availability?mode=remote&date=${date}&duration=15`)).status).toBe(422);
  });

  test('administration : refus anonyme puis connexion', async ({ browser }) => {
    const anonymous = await browser.newContext();
    try {
      const page = await anonymous.newPage();
      await page.goto(base + 'packages');
      await page.waitForLoadState('networkidle');
      expect((await call('GET', 'admin/bookings', undefined, {}, anonymous)).status).toBe(401);
      expect((await call('PATCH', 'admin/bookings/1/status', { status: 'confirmed' }, {}, anonymous)).status).toBe(401);
    } finally {
      await anonymous.close();
    }
    const session = await call('GET', 'admin/session');
    expect(session.status).toBe(200);
    csrf = session.body.data.csrf_token;
    const login = await call('POST', 'admin/login', { email: env('OCD_TEST_ADMIN_EMAIL'), password: env('OCD_TEST_ADMIN_PASSWORD') });
    expect(login.status).toBe(200);
    csrf = login.body.data.csrf_token;
    expect((await call('GET', 'admin/bookings')).status).toBe(200);
    expect((await call('POST', 'admin/bookings/1/sessions', {}, { 'X-CSRF-Token': 'invalid' })).status).toBe(403);
  });

  test('deux créations simultanées sur le même créneau et le même mode', async () => {
    const payload = booking('in_person', packages.ESSENTIEL.id, date, '09:00');
    const replies = await Promise.all([call('POST', 'bookings', payload, { 'Idempotency-Key': key('race-a') }), call('POST', 'bookings', payload, { 'Idempotency-Key': key('race-b') })]);
    expect(replies.map((reply) => reply.status).sort()).toEqual([201, 409]);
    const loser = replies.find((reply) => reply.status === 409)!;
    expect(loser.body.message).toContain('créneau');
    const won = replies.find((reply) => reply.status === 201)!;
    winner = { id: 0, reference: won.body.data.reference, key: replies[0] === won ? key('race-a') : key('race-b') };
    (created.bookings as unknown[]).push({ scenario: 'race same mode', reference: winner.reference });
    expect((await call('POST', 'bookings', payload, { 'Idempotency-Key': key('after-race') })).status).toBe(409);
  });

  test('présentiel et distance simultanés sur un même horaire', async () => {
    const replies = await Promise.all([
      call('POST', 'bookings', booking('in_person', packages.ESSENTIEL.id, date, '11:00'), { 'Idempotency-Key': key('modes-a') }),
      call('POST', 'bookings', booking('remote', packages.ESSENTIEL.id, date, '11:00'), { 'Idempotency-Key': key('modes-b') }),
    ]);
    expect(replies.map((reply) => reply.status)).toEqual([201, 201]);
    for (const reply of replies) (created.bookings as unknown[]).push({ scenario: 'parallel modes', reference: reply.body.data.reference });
  });

  test('répétition de soumission et contenu modifié', async () => {
    const payload = booking('in_person', packages.ESSENTIEL.id, date, '09:00');
    const replay = await call('POST', 'bookings', payload, { 'Idempotency-Key': winner.key });
    expect(replay.status).toBe(200);
    expect(replay.body.data).toMatchObject({ reference: winner.reference, replayed: true });
    expect((await call('POST', 'bookings', { ...payload, time: '12:30' }, { 'Idempotency-Key': winner.key })).status).toBe(409);
  });

  test('la réservation est consultable avec ses relations et snapshots', async () => {
    const list = await call('GET', 'admin/bookings');
    const row = list.body.data.items.find((item: Record<string, any>) => item.reference === winner.reference);
    expect(row).toBeTruthy();
    winner.id = row.id;
    const detail = await call('GET', `admin/bookings/${winner.id}`);
    expect(detail.status).toBe(200);
    const data = detail.body.data;
    expect(data.booking).toMatchObject({ status: 'pending', mode: 'in_person', package_name_snapshot: 'Essentiel', currency: 'XOF' });
    expect(Number(data.booking.unit_price_snapshot)).toBe(15000);
    expect(data.business.customer_id).toBe(data.customer.id);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0]).toMatchObject({ status: 'scheduled', session_number: 1 });
  });

  test('Mensuel : première séance réelle puis trois séances programmées', async () => {
    const created1 = await call('POST', 'bookings', booking('remote', packages.MENSUEL.id, monthlyDates[0]!, '14:00'), { 'Idempotency-Key': key('monthly') });
    expect(created1.status).toBe(201);
    expect(created1.body.data).toMatchObject({ sessions_expected: 4, sessions_planned: 1, sessions_to_plan: 3, status: 'pending' });
    (created.bookings as unknown[]).push({ scenario: 'monthly', reference: created1.body.data.reference });
    const row = (await call('GET', 'admin/bookings')).body.data.items.find((item: Record<string, any>) => item.reference === created1.body.data.reference);
    monthlyId = row.id;
    let detail = (await call('GET', `admin/bookings/${monthlyId}`)).body.data;
    expect(detail.sessions.map((item: Record<string, any>) => item.status)).toEqual(['scheduled', 'to_plan', 'to_plan', 'to_plan']);
    expect(Number(detail.booking.total_amount)).toBe(54000);
    for (const [index, number] of [2, 3, 4].entries()) {
      const planned = await call('POST', `admin/bookings/${monthlyId}/sessions`, { session_number: number, date: monthlyDates[index + 1], time: '14:00' });
      expect(planned.status).toBe(201);
    }
    expect((await call('POST', `admin/bookings/${monthlyId}/sessions`, { session_number: 2, date: monthlyDates[1], time: '14:00' })).status).toBe(200);
    expect((await call('POST', `admin/bookings/${monthlyId}/sessions`, { session_number: 5, date: monthlyDates[0]!, time: '16:00' })).status).toBe(422);
    detail = (await call('GET', `admin/bookings/${monthlyId}`)).body.data;
    expect(detail.sessions.filter((item: Record<string, any>) => item.status === 'scheduled' && item.start_at)).toHaveLength(4);
  });

  test('modification du statut et historique', async () => {
    expect((await call('PATCH', `admin/bookings/${winner.id}/status`, { status: 'pending' })).status).toBe(422);
    const confirmed = await call('PATCH', `admin/bookings/${winner.id}/status`, { status: 'confirmed', comment: 'Contrôle automatisé' });
    expect(confirmed.status).toBe(200);
    const detail = (await call('GET', `admin/bookings/${winner.id}`)).body.data;
    expect(detail.booking.status).toBe('confirmed');
    expect(detail.history.map((item: Record<string, any>) => item.new_status)).toEqual(['pending', 'confirmed']);
    expect((await call('PATCH', `admin/bookings/${winner.id}/status`, { status: 'confirmed' })).body.data.replayed).toBe(true);
  });

  test('demande Premium enregistrée sans prix', async () => {
    const payload = { ...booking('remote', packages.PREMIUM.id, date, '09:00'), message: 'Demande de contrôle' } as Record<string, unknown>;
    delete payload.package_id; delete payload.date; delete payload.time;
    const quote = await call('POST', 'quotes', payload, { 'Idempotency-Key': key('quote') });
    expect(quote.status).toBe(201);
    expect((await call('POST', 'quotes', payload, { 'Idempotency-Key': key('quote') })).body.data.replayed).toBe(true);
    (created.quotes as unknown[]).push({ reference: quote.body.data.reference });
    const row = (await call('GET', 'admin/quotes')).body.data.items.find((item: Record<string, any>) => item.reference === quote.body.data.reference);
    const detail = (await call('GET', `admin/quotes/${row.id}`)).body.data;
    expect(detail.quote.proposed_amount).toBeNull();
    expect(detail.business.customer_id).toBe(detail.customer.id);
  });

  test('rollback réel avec déclencheur de faute installé dans la base de contrôle', async () => {
    test.skip(env('OCD_TEST_ROLLBACK_TRIGGER') !== 'YES', 'Exige le déclencheur temporaire documenté dans DEPLOYMENT.md.');
    const before = (await call('GET', 'admin/bookings')).body.data.items[0].id;
    const failed = await call('POST', 'bookings', booking('in_person', packages.ESSENTIEL.id, date, '16:00', { last_name: `Rollback ${nonce}` }), { 'Idempotency-Key': key('rollback') });
    expect(failed.status).toBe(500);
    expect(JSON.stringify(failed.body)).not.toMatch(/SQLSTATE|trigger|Stack trace/i);
    expect((await call('GET', 'admin/bookings')).body.data.items[0].id).toBe(before);
    const free = await call('GET', `availability?mode=in_person&date=${date}&package_id=${packages.ESSENTIEL.id}`);
    expect(free.body.data.occupied.some((slot: Record<string, string>) => slot.start_at?.includes('T16:00'))).toBe(false);
  });

  test('un compte manager est refusé et la session se ferme', async () => {
    if (env('OCD_TEST_MANAGER_EMAIL') && env('OCD_TEST_MANAGER_PASSWORD')) {
      const other = await call('POST', 'admin/logout', {});
      expect(other.status).toBe(200);
      const session = await call('GET', 'admin/session');
      csrf = session.body.data.csrf_token;
      expect((await call('POST', 'admin/login', { email: env('OCD_TEST_MANAGER_EMAIL'), password: env('OCD_TEST_MANAGER_PASSWORD') })).status).toBe(401);
    } else {
      expect((await call('POST', 'admin/logout', {})).status).toBe(200);
    }
    expect((await call('GET', 'admin/bookings')).status).toBe(401);
  });
});
