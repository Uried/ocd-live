import type { BookingMode } from '../types/booking';
import { addDaysToKey, lomeNowParts, slotIsPast, timeToMinutes } from '../utils/datetime';

export type DayIssue = 'past' | 'beyond-horizon' | 'closed' | 'unavailable';
export type TimeIssue = 'past' | 'closed' | 'unavailable' | 'outside-hours' | 'occupied';

export interface AvailabilityConfig {
  timeZone: 'Africa/Lome';
  /** Nombre de jours ouverts à la réservation à partir d'aujourd'hui. */
  horizonDays: number;
  /** Jours d'ouverture (0 = dimanche). null : règle non définie — tous les jours sont proposés. À confirmer par OCD Live. */
  openDays: number[] | null;
  /** Plage horaire d'ouverture par mode (HH:MM local Africa/Lome). null : non définie, aucune restriction. À confirmer. */
  openHours: Record<BookingMode, { start: string; end: string } | null>;
  /** Journées indisponibles ponctuellement. Vide tant que non renseigné. */
  unavailableDates: { date: string; modes?: BookingMode[] }[];
  /** Créneaux déjà occupés (date + heure de début + durée). Vide tant qu'aucun système ne renseigne les occupations. */
  occupiedSlots: { date: string; start: string; durationMinutes: number; modes?: BookingMode[] }[];
  /** Capacités par mode (studio, intervenants à distance). null : ressources non modélisées, à définir avec l'API. */
  resources: Record<BookingMode, { id: string; capacity: number }[]> | null;
}

export const availabilityConfig: AvailabilityConfig = {
  timeZone: 'Africa/Lome',
  horizonDays: 90,
  openDays: null,
  openHours: { 'in-person': null, remote: null },
  unavailableDates: [],
  occupiedSlots: [],
  resources: null,
};

const appliesToMode = (modes: BookingMode[] | undefined, mode: BookingMode) => !modes || modes.includes(mode);
export const lomeTodayKey = () => lomeNowParts().dateKey;
export const bookingHorizonKey = () => addDaysToKey(lomeTodayKey(), availabilityConfig.horizonDays);

export function getDayIssue(dateKey: string, mode: BookingMode, todayKey = lomeTodayKey()): DayIssue | null {
  if (dateKey < todayKey) return 'past';
  if (dateKey > addDaysToKey(todayKey, availabilityConfig.horizonDays)) return 'beyond-horizon';
  const { openDays, unavailableDates } = availabilityConfig;
  if (openDays && !openDays.includes(new Date(`${dateKey}T00:00:00Z`).getUTCDay())) return 'closed';
  if (unavailableDates.some((entry) => entry.date === dateKey && appliesToMode(entry.modes, mode))) return 'unavailable';
  return null;
}

export function getTimeIssue(dateKey: string, start: string, durationMinutes: number, mode: BookingMode, todayKey = lomeTodayKey()): TimeIssue | null {
  const dayIssue = getDayIssue(dateKey, mode, todayKey);
  if (dayIssue === 'closed') return 'closed';
  if (dayIssue === 'unavailable') return 'unavailable';
  if (slotIsPast(dateKey, start)) return 'past';
  const startMinutes = timeToMinutes(start);
  const endMinutes = startMinutes + durationMinutes;
  const hours = availabilityConfig.openHours[mode];
  if (hours && (startMinutes < timeToMinutes(hours.start) || endMinutes > timeToMinutes(hours.end) + (endMinutes >= 1440 ? 1440 : 0))) return 'outside-hours';
  const overlaps = availabilityConfig.occupiedSlots.some((slot) => {
    if (slot.date !== dateKey || !appliesToMode(slot.modes, mode)) return false;
    const startOccupied = timeToMinutes(slot.start);
    return startMinutes < startOccupied + slot.durationMinutes && startOccupied < endMinutes;
  });
  return overlaps ? 'occupied' : null;
}
