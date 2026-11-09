import type { BookingRepository, ContentRepository } from '../../services/repositories/contracts';
import { homeContent } from '../data/home';
import { packages, slots } from '../data/bookings';

async function localResponse<T>(value: T): Promise<T> {
  await new Promise<void>((resolve) => setTimeout(resolve, 160));
  return structuredClone(value);
}

export const mockContentRepository: ContentRepository = {
  getHome: () => localResponse(homeContent),
};

export const mockBookingRepository: BookingRepository = {
  getPackages: (mode) => localResponse(packages.filter((item) => item.modes.includes(mode))),
  getSlots: (mode, packageId) => {
    const selected = packages.find((item) => item.id === packageId && item.modes.includes(mode));
    const duration = selected?.durationMinutes;
    if (!duration) return localResponse([]);
    return localResponse(slots.filter((item) => item.mode === mode && item.available && Date.parse(item.startsAt) > Date.now() && Date.parse(item.endsAt) - Date.parse(item.startsAt) >= duration * 60000).map((item) => ({ ...item, endsAt: new Date(Date.parse(item.startsAt) + duration * 60000).toISOString() })));
  },
};
