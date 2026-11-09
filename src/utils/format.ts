import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Currency } from '../types/booking';

export function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, currencyDisplay: 'code', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'd MMMM yyyy', { locale: fr }) : 'Date indisponible';
}
