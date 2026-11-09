import { describe, expect, it } from 'vitest';
import { mockBookingRepository, mockContentRepository } from './index';
import { cities, countries, packages, slots } from '../data/bookings';

 describe('repositories locaux', () => {
  it('renvoie le contenu sans partager de références mutables', async () => {
    const first = await mockContentRepository.getHome();
    first.navigation.length = 0;
    expect((await mockContentRepository.getHome()).navigation).toHaveLength(4);
  });
  it('filtre les formules selon le mode de participation', async () => {
    const remote = await mockBookingRepository.getPackages('remote');
    expect(remote.length).toBeGreaterThan(0);
    expect(remote.every((item) => item.modes.includes('remote') && item.isDemo)).toBe(true);
    expect(remote).toHaveLength(1);
  });
  it('filtre les créneaux et préserve les données sources', async () => {
    const result = await mockBookingRepository.getSlots('in-person');
    expect(result.every((slot) => slot.mode === 'in-person' && slot.isDemo)).toBe(true);
    result.length = 0;
    expect(slots).toHaveLength(2);
  });
  it('associe chaque ville à un pays et un fuseau valides', () => {
    for (const city of cities) {
      expect(countries.some((country) => country.code === city.countryCode)).toBe(true);
      expect(() => new Intl.DateTimeFormat('fr', { timeZone: city.timeZone })).not.toThrow();
    }
  });
  it('ne présente que des formules explicitement démonstratives', () => {
    expect(packages.every((item) => item.isDemo && Number.isInteger(item.price.amount))).toBe(true);
  });
});
