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
  getSlots: (mode) => localResponse(slots.filter((item) => item.mode === mode)),
};
