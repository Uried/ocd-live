export type BookingMode = 'in-person' | 'remote';
export type BookingStatus = 'draft' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type Currency = 'XOF' | 'XAF';

export interface Country {
  code: string;
  name: string;
  currency: Currency;
}

export interface City {
  id: string;
  name: string;
  countryCode: string;
  timeZone: string;
}

export interface Business {
  id: string;
  name: string;
  sector: string;
  cityId: string;
  description: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  businessId?: string;
  countryCode: string;
}

export interface BookingPackage {
  id: string;
  name: string;
  modes: BookingMode[];
  durationMinutes: number | null;
  price: { amount: number | null; currency: Currency };
  tier: 'standard' | 'value' | 'premium' | 'flexible';
  validation: 'defined' | 'pending' | 'suggestion';
  description: string;
  durationLabel: string;
  benefits: string[];
  inclusions: string[];
  conditions: string[];
  internalProposal?: string;
  isDemo: true;
}

export interface BookingSlot {
  id: string;
  mode: BookingMode;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  available: boolean;
  isDemo: true;
}

export interface Booking {
  id: string;
  customerId: string;
  businessId?: string;
  mode: BookingMode;
  packageId: string;
  slotId: string;
  status: BookingStatus;
  isDemo: true;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  isDemo: true;
}
