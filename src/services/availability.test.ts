import { afterEach, describe, expect, it, vi } from 'vitest';
import { availabilityConfig, getDayIssue, getTimeIssue } from './availability';

const TODAY = '2026-11-09';
afterEach(() => { vi.useRealTimers(); availabilityConfig.openDays = null; availabilityConfig.openHours = { 'in-person': null, remote: null }; availabilityConfig.unavailableDates = []; availabilityConfig.occupiedSlots = []; });

describe('règles de disponibilité centralisées', () => {
  it('bloque les jours passés et hors horizon, pas les jours à venir', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-09T12:00:00Z'));
    expect(getDayIssue('2026-11-08', 'remote')).toBe('past');
    expect(getDayIssue('2026-11-09', 'remote')).toBeNull();
    expect(getDayIssue('2027-02-10', 'remote')).toBe('beyond-horizon');
  });
  it('applique les fermetures, indisponibilités et horaires configurés', () => {
    availabilityConfig.openDays = [1, 2, 3, 4, 5];
    availabilityConfig.openHours = { 'in-person': { start: '08:00', end: '18:00' }, remote: { start: '08:00', end: '22:00' } };
    expect(getDayIssue('2026-11-15', 'remote', TODAY)).toBe('closed');
    availabilityConfig.openDays = null;
    availabilityConfig.unavailableDates = [{ date: '2026-11-20', modes: ['remote'] }];
    expect(getDayIssue('2026-11-20', 'remote', TODAY)).toBe('unavailable');
    expect(getDayIssue('2026-11-20', 'in-person', TODAY)).toBeNull();
    expect(getTimeIssue('2026-11-20', '10:00', 90, 'remote', TODAY)).toBe('unavailable');
    expect(getTimeIssue('2026-11-19', '07:00', 90, 'in-person', TODAY)).toBe('outside-hours');
    expect(getTimeIssue('2026-11-19', '17:00', 240, 'in-person', TODAY)).toBe('outside-hours');
    expect(getTimeIssue('2026-11-19', '10:00', 240, 'in-person', TODAY)).toBeNull();
  });
  it('détecte les chevauchements avec les créneaux occupés', () => {
    availabilityConfig.occupiedSlots = [{ date: '2026-11-20', start: '10:00', durationMinutes: 90, modes: ['in-person'] }];
    expect(getTimeIssue('2026-11-20', '10:30', 45, 'in-person', TODAY)).toBe('occupied');
    expect(getTimeIssue('2026-11-20', '11:30', 90, 'in-person', TODAY)).toBeNull();
    expect(getTimeIssue('2026-11-20', '08:00', 240, 'in-person', TODAY)).toBe('occupied');
    expect(getTimeIssue('2026-11-20', '10:30', 45, 'remote', TODAY)).toBeNull();
  });
});
