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
  { id: 'atelier-ama', name: 'Atelier Ama', sector: 'Accessoires', cityId: 'lome', description: 'Sacs et accessoires textiles.' },
  { id: 'maison-sawa', name: 'Maison Sawa', sector: 'Décoration', cityId: 'douala', description: 'Objets pour la maison.' },
];

export const customers: Customer[] = [
  { id: 'customer-demo', firstName: 'Ama', lastName: 'Mensah', businessId: 'atelier-ama', countryCode: 'TG' },
];

export const packages: BookingPackage[] = [
  { id: 'demo-discovery', name: 'Essentiel', modes: ['in-person', 'remote'], durationMinutes: 90, durationLabel: '1 h 30', price: { amount: 15000, currency: 'XOF' }, tier: 'standard', validation: 'defined', description: 'Un temps dédié pour présenter votre activité.', benefits: ['Un format de 90 minutes', 'Au studio ou à distance'], inclusions: ['Une session live de 1 h 30'], conditions: ['Choix du créneau selon les disponibilités.'], isDemo: true },
  { id: 'long-format', name: 'Long format', modes: ['in-person', 'remote'], durationMinutes: 240, durationLabel: '4 heures', price: { amount: 32000, currency: 'XOF' }, tier: 'value', validation: 'defined', description: 'Davantage de temps pour développer votre présentation.', benefits: ['Un tarif horaire réduit de 20 % par rapport à Essentiel', 'Une présentation à votre rythme'], inclusions: ['Une session live de 4 heures'], conditions: ['Choix du créneau selon les disponibilités.'], isDemo: true },
  { id: 'premium', name: 'Premium', modes: ['in-person', 'remote'], durationMinutes: null, durationLabel: 'Durée à convenir', price: { amount: null, currency: 'XOF' }, tier: 'premium', validation: 'pending', description: 'Parlons de vos objectifs de visibilité.', benefits: ['Un projet pensé autour de vos objectifs'], inclusions: ['Prestations à définir ensemble'], conditions: ['Périmètre, durée et tarif à convenir avant tout engagement.'], internalProposal: 'Promotion sur les comptes de Boovan envisagée, non validée : ne pas publier comme prestation incluse.', isDemo: true },
  { id: 'monthly', name: 'Mensuel', modes: ['in-person', 'remote'], durationMinutes: null, durationLabel: '4 séances de 1 h 30 / mois', price: { amount: 54000, currency: 'XOF' }, tier: 'flexible', validation: 'defined', description: 'Une présence régulière pour votre activité.', benefits: ['Quatre rendez-vous sur le mois', '10 % de réduction par rapport à quatre séances Essentiel'], inclusions: ['Quatre sessions live de 1 h 30, soit 6 heures au total'], conditions: ['Calendrier des quatre séances à convenir ensemble.'], isDemo: true },
  { id: 'discovery-proposal', name: 'Découverte', modes: ['in-person', 'remote'], durationMinutes: 45, durationLabel: '45 minutes', price: { amount: 7500, currency: 'XOF' }, tier: 'flexible', validation: 'defined', description: 'Un format court pour une première prise de parole.', benefits: ['Une présentation ciblée', 'Le même tarif horaire que la formule Essentiel'], inclusions: ['Une session live de 45 minutes'], conditions: ['Choix du créneau selon les disponibilités.'], internalProposal: 'Suggestion commerciale initiale validée par l’utilisateur : 45 minutes à 7 500 FCFA.', isDemo: true },
  { id: 'duo-proposal', name: 'Duo', modes: ['in-person', 'remote'], durationMinutes: 90, durationLabel: '1 h 30 à deux intervenants', price: { amount: 15000, currency: 'XOF' }, tier: 'flexible', validation: 'defined', description: 'Une session à deux voix pour présenter votre projet.', benefits: ['Deux intervenants, sans supplément', 'Un temps de parole à partager'], inclusions: ['Une session live commune de 1 h 30 pour deux intervenants'], conditions: ['Durée totale partagée entre les deux intervenants. Choix du créneau selon les disponibilités.'], internalProposal: 'Suggestion commerciale initiale validée par l’utilisateur : une session commune de 1 h 30 à deux, à 15 000 FCFA.', isDemo: true },
];

export const slots: BookingSlot[] = Array.from({ length: 14 }, (_, day) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + day + 1);
  return (['in-person', 'remote'] as const).flatMap((mode) => [9, 14].map((hour) => {
    const start = new Date(date);
    start.setUTCHours(hour, 0, 0, 0);
    return { id: `slot-${mode}-${day}-${hour}`, mode, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + (hour === 9 ? 240 : 180) * 60000).toISOString(), timeZone: 'Africa/Lome', available: true, isDemo: true as const };
  }));
}).flat();

export const bookings: Booking[] = [
  { id: 'booking-demo', customerId: 'customer-demo', businessId: 'atelier-ama', mode: 'in-person', packageId: 'demo-discovery', slotId: 'slot-demo-studio', status: 'draft', isDemo: true },
];

export const payments: Payment[] = [
  { id: 'payment-demo', bookingId: 'booking-demo', amount: 15000, currency: 'XOF', status: 'pending', isDemo: true },
];
