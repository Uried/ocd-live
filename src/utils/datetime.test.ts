import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDaysToKey, addMinutesToTime, lomeNowParts, parseDateKey, slotIsPast, timeToMinutes, toDateKey } from './datetime';

describe('calculs de dates Africa/Lome', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('convertit une clé de date sans ambiguïté UTC', () => {
    vi.setSystemTime(new Date('2026-11-09T23:30:00Z'));
    expect(toDateKey(parseDateKey('2026-03-05'))).toBe('2026-03-05');
    expect(addDaysToKey('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('additionne une durée en gérant le passage à minuit', () => {
    expect(addMinutesToTime('10:15', 90)).toEqual({ end: '11:45', endDateOffset: 0 });
    expect(addMinutesToTime('23:23', 240)).toEqual({ end: '03:23', endDateOffset: 1 });
    expect(addMinutesToTime('09:00', 240)).toEqual({ end: '13:00', endDateOffset: 0 });
    expect(addMinutesToTime('00:45', 45)).toEqual({ end: '01:30', endDateOffset: 0 });
  });
  it('lit l’heure de Lomé indépendamment du fuseau local', () => {
    vi.setSystemTime(new Date('2026-11-09T12:00:00Z'));
    expect(lomeNowParts()).toEqual({ dateKey: '2026-11-09', time: '12:00' });
  });
  it('refuse une heure passée le jour même mais pas un jour futur', () => {
    vi.setSystemTime(new Date('2026-11-09T12:00:00Z'));
    expect(slotIsPast('2026-11-08', '23:59')).toBe(true);
    expect(slotIsPast('2026-11-09', '11:59')).toBe(true);
    expect(slotIsPast('2026-11-09', '12:00')).toBe(false);
    expect(slotIsPast('2026-11-09', '13:00')).toBe(false);
    expect(slotIsPast('2026-11-10', '00:00')).toBe(false);
  });
  it('convertit les heures en minutes pour les comparaisons', () => {
    expect(timeToMinutes('11:23')).toBe(683);
    expect(timeToMinutes('09:00')).toBe(540);
  });
});
