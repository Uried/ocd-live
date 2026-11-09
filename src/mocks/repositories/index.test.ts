import { describe, expect, it } from 'vitest';
import { mockBookingRepository, mockContentRepository } from './index';
import { cities, countries, packages, slots } from '../data/bookings';

describe('repositories locaux', () => {
  it('renvoie le contenu sans partager de références mutables', async () => {
    const first = await mockContentRepository.getHome();
    first.navigation.length = 0;
    expect((await mockContentRepository.getHome()).navigation).toHaveLength(4);
  });
  it('renvoie six formules compatibles avec le mode sans partager de références', async () => {
    const remote = await mockBookingRepository.getPackages('remote');
    expect(remote).toHaveLength(6);
    expect(remote.every((item) => item.modes.includes('remote') && item.isDemo)).toBe(true);
    remote.forEach((item) => { item.benefits.length = 0; });
    expect((await mockBookingRepository.getPackages('remote')).every((item) => item.benefits.length > 0)).toBe(true);
  });
  it('adapte les créneaux à la durée et préserve les fenêtres sources', async () => {
    const source = structuredClone(slots);
    const short = await mockBookingRepository.getSlots('in-person', 'demo-discovery');
    const long = await mockBookingRepository.getSlots('in-person', 'long-format');
    expect(short.length).toBeGreaterThan(long.length);
    expect(long.length).toBeGreaterThan(0);
    const discovery = await mockBookingRepository.getSlots('in-person', 'discovery-proposal');
    const duo = await mockBookingRepository.getSlots('in-person', 'duo-proposal');
    expect(discovery.length).toBeGreaterThan(0);
    expect(duo.length).toBeGreaterThan(0);
    for (const [result, duration] of [[short, 90], [long, 240], [discovery, 45], [duo, 90]] as const) {
      expect(result.every((slot) => slot.mode === 'in-person' && slot.available && Date.parse(slot.endsAt) - Date.parse(slot.startsAt) === duration * 60000)).toBe(true);
    }
    expect(slots).toEqual(source);
  });
  it('ne fabrique pas de créneaux pour une durée indéfinie ou une formule inconnue', async () => {
    expect(await mockBookingRepository.getSlots('remote', 'monthly')).toEqual([]);
    expect(await mockBookingRepository.getSlots('remote', 'unknown')).toEqual([]);
  });
  it('associe chaque ville à un pays et un fuseau valides', () => {
    for (const city of cities) {
      expect(countries.some((country) => country.code === city.countryCode)).toBe(true);
      expect(() => new Intl.DateTimeFormat('fr', { timeZone: city.timeZone })).not.toThrow();
    }
  });
  it('centralise les cinq tarifs validés et conserve le Premium sur demande', () => {
    expect(packages).toHaveLength(6);
    expect(new Set(packages.map((item) => item.id)).size).toBe(6);
    expect(packages.map((item) => [item.id, item.price.amount, item.durationMinutes])).toEqual([
      ['demo-discovery', 15000, 90], ['long-format', 32000, 240], ['premium', null, null],
      ['monthly', 54000, null], ['discovery-proposal', 7500, 45], ['duo-proposal', 15000, 90],
    ]);
    expect(packages.filter((item) => item.price.amount !== null).every((item) => item.validation === 'defined' && item.price.currency === 'XOF')).toBe(true);
    expect(packages.find((item) => item.id === 'monthly')?.price.amount).toBe(15000 * 4 * 0.9);
    expect(packages.find((item) => item.id === 'long-format')?.price.amount).toBe(10000 * 4 * 0.8);
  });
});
