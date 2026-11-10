import type { BookingMode, BookingPackage, BookingSlot } from '../../types/booking';
import type { HomeContent, PrepareContent, StudioContent } from '../../types/content';

export interface ContentRepository {
  getHome(): Promise<HomeContent>;
  getStudio(): Promise<StudioContent>;
  getPrepare(): Promise<PrepareContent>;
}

export interface BookingRepository {
  getPackages(mode: BookingMode): Promise<BookingPackage[]>;
  getSlots(mode: BookingMode, packageId: string): Promise<BookingSlot[]>;
}
