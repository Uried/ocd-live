import type { Booking, BookingPackage, BookingSlot, Business, City, Country, Customer, Payment } from '../../types/booking';

export const countries: Country[] = [
  { code: 'TG', name: 'Togo', currency: 'XOF' },
  { code: 'BJ', name: 'Bénin', currency: 'XOF' },
  { code: 'CM', name: 'Cameroun', currency: 'XAF' },
  { code: 'SN', name: 'Sénégal', currency: 'XOF' },
  { code: 'CI', name: 'Côte d’Ivoire', currency: 'XOF' },
  { code: 'GA', name: 'Gabon', currency: 'XAF' },
  { code: 'TD', name: 'Tchad', currency: 'XAF' },
  { code: 'CF', name: 'République centrafricaine', currency: 'XAF' },
];

export const cities: City[] = [
  { id: 'lome', name: 'Lomé', countryCode: 'TG', timeZone: 'Africa/Lome' },
  { id: 'cotonou', name: 'Cotonou', countryCode: 'BJ', timeZone: 'Africa/Porto-Novo' },
  { id: 'douala', name: 'Douala', countryCode: 'CM', timeZone: 'Africa/Douala' },
  { id: 'yaounde', name: 'Yaoundé', countryCode: 'CM', timeZone: 'Africa/Douala' },
  { id: 'dakar', name: 'Dakar', countryCode: 'SN', timeZone: 'Africa/Dakar' },
  { id: 'abidjan', name: 'Abidjan', countryCode: 'CI', timeZone: 'Africa/Abidjan' },
  { id: 'libreville', name: 'Libreville', countryCode: 'GA', timeZone: 'Africa/Libreville' },
  { id: 'ndjamena', name: 'N’Djamena', countryCode: 'TD', timeZone: 'Africa/Ndjamena' },
  { id: 'bangui', name: 'Bangui', countryCode: 'CF', timeZone: 'Africa/Bangui' },
];

export const businesses: Business[] = [
  { id: 'atelier-ama', name: 'Atelier Ama', sector: 'Accessoires', cityId: 'lome', description: 'Sacs et accessoires textiles — entreprise fictive.' },
  { id: 'maison-sawa', name: 'Maison Sawa', sector: 'Décoration', cityId: 'douala', description: 'Objets pour la maison — entreprise fictive.' },
];

export const customers: Customer[] = [
  { id: 'customer-demo', firstName: 'Ama', lastName: 'Mensah', businessId: 'atelier-ama', countryCode: 'TG' },
];

export const packages: BookingPackage[] = [
  { id: 'demo-discovery', name: 'Exemple découverte — non commercialisé', modes: ['in-person', 'remote'], durationMinutes: 30, price: { amount: 15000, currency: 'XOF' }, isDemo: true },
  { id: 'demo-presentation', name: 'Exemple présentation — non commercialisé', modes: ['in-person'], durationMinutes: 60, price: { amount: 25000, currency: 'XOF' }, isDemo: true },
];

export const slots: BookingSlot[] = [
  { id: 'slot-demo-studio', mode: 'in-person', startsAt: '2030-06-18T10:00:00Z', endsAt: '2030-06-18T11:00:00Z', timeZone: 'Africa/Lome', available: true, isDemo: true },
  { id: 'slot-demo-remote', mode: 'remote', startsAt: '2030-06-18T14:00:00Z', endsAt: '2030-06-18T14:30:00Z', timeZone: 'Africa/Lome', available: true, isDemo: true },
];

export const bookings: Booking[] = [
  { id: 'booking-demo', customerId: 'customer-demo', businessId: 'atelier-ama', mode: 'in-person', packageId: 'demo-discovery', slotId: 'slot-demo-studio', status: 'draft', isDemo: true },
];

export const payments: Payment[] = [
  { id: 'payment-demo', bookingId: 'booking-demo', amount: 15000, currency: 'XOF', status: 'pending', isDemo: true },
];
