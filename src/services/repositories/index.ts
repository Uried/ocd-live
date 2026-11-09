import { mockBookingRepository, mockContentRepository } from '../../mocks/repositories';
import type { BookingRepository, ContentRepository } from './contracts';

export const contentRepository: ContentRepository = mockContentRepository;
export const bookingRepository: BookingRepository = mockBookingRepository;
