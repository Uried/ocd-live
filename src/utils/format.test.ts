import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from './format';

describe('formatage localisé', () => {
  it('distingue explicitement les deux monnaies CFA', () => {
    expect(formatMoney(15000, 'XOF')).toMatch(/15\s?000\sXOF/);
    expect(formatMoney(25000, 'XAF')).toMatch(/25\s?000\sXAF/);
  });
  it('affiche une date en français', () => {
    expect(formatDate('2030-06-18')).toBe('18 juin 2030');
  });
  it('gère les dates invalides', () => {
    expect(formatDate('not-a-date')).toBe('Date indisponible');
  });
});
