import type { BookingMode, BookingPackage, BookingSlot } from '../../types/booking';
import type { HomeContent } from '../../types/content';

export interface ContentRepository {
  getHome(): Promise<HomeContent>;
}

export interface BookingRepository {
  getPackages(mode: BookingMode): Promise<BookingPackage[]>;
  getSlots(mode: BookingMode): Promise<BookingSlot[]>;
}
