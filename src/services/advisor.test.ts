import { describe, expect, it } from 'vitest';
import { advisorQuestions, packagePriceLabel, recommendPackage } from './advisor';
import type { AdvisorAnswers } from './advisor';
import { packages } from '../mocks/data/bookings';

const base: AdvisorAnswers = { goal: 'sell', participation: 'in-person', duration: 'standard', budget: '10000-20000' };
const answers = (patch: Partial<AdvisorAnswers>): AdvisorAnswers => ({ ...base, ...patch });

describe('conseiller de formule', () => {
  it('couvre les quatre questions demandées', () => {
    expect(advisorQuestions.map((item) => item.id)).toEqual(['goal', 'participation', 'duration', 'budget']);
    for (const question of advisorQuestions) {
      expect(question.options.length).toBeGreaterThanOrEqual(3);
      for (const option of question.options) {
        expect(option.label.trim().length).toBeGreaterThan(0);
        expect(option.icon.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('recommande Essentiel pour une présentation de 1 h 30 avec un budget de 15 000 FCFA', () => {
    const result = recommendPackage(answers({}), packages);
    expect(result?.package.name).toBe('Essentiel');
    expect(result?.fallback).toBe(false);
    expect(result?.mode).toBe('in-person');
  });

  it('recommande Découverte quand le budget est inférieur à 10 000 FCFA et le format court', () => {
    const result = recommendPackage(answers({ goal: 'discover', duration: 'short', budget: 'under-10000' }), packages);
    expect(result?.package.name).toBe('Découverte');
    expect(result?.package.price.amount).toBe(7500);
  });

  it('recommande Long format pour une présentation de plusieurs heures', () => {
    const result = recommendPackage(answers({ goal: 'long', duration: 'long', budget: '20000-40000' }), packages);
    expect(result?.package.name).toBe('Long format');
    expect(result?.package.durationMinutes).toBe(240);
  });

  it('recommande Mensuel pour une visibilité sur plusieurs séances', () => {
    expect(recommendPackage(answers({ goal: 'recurring', duration: 'advised', budget: 'over-40000' }), packages)?.package.name).toBe('Mensuel');
    expect(recommendPackage(answers({ goal: 'sell', duration: 'monthly', budget: 'over-40000' }), packages)?.package.name).toBe('Mensuel');
  });

  it('bascule sur Premium quand le budget ne couvre pas le besoin', () => {
    const result = recommendPackage(answers({ goal: 'long', duration: 'long', budget: 'under-10000' }), packages);
    expect(result?.package.name).toBe('Premium');
    expect(result?.fallback).toBe(true);
  });

  it('bascule sur Premium quand la formule Mensuel dépasse le budget', () => {
    const result = recommendPackage(answers({ goal: 'recurring', duration: 'monthly', budget: '20000-40000' }), packages);
    expect(result?.package.name).toBe('Premium');
    expect(result?.fallback).toBe(true);
  });

  it('départage à durée égale en faveur de la formule standard', () => {
    const result = recommendPackage(answers({ goal: 'unsure', duration: 'standard', budget: '10000-20000' }), packages);
    expect(result?.package.name).toBe('Essentiel');
  });

  it('respecte le mode de participation et laisse la participation flexible ouverte', () => {
    const inPerson = recommendPackage(answers({ participation: 'in-person' }), packages);
    const remote = recommendPackage(answers({ participation: 'remote' }), packages);
    const flexible = recommendPackage(answers({ participation: 'flexible' }), packages);
    expect(inPerson?.mode).toBe('in-person');
    expect(remote?.mode).toBe('remote');
    expect(flexible?.mode).toBeNull();
  });

  it('ne retient que les formules compatibles avec le mode choisi', () => {
    const remoteOnly = packages.map((item) => item.name === 'Essentiel' ? { ...item, modes: ['remote' as const] } : item);
    expect(recommendPackage(answers({ participation: 'in-person' }), remoteOnly)?.package.name).not.toBe('Essentiel');
    expect(recommendPackage(answers({ participation: 'remote' }), remoteOnly)?.package.name).toBe('Essentiel');
  });

  it('explique la recommandation à partir des données réelles de la formule', () => {
    const result = recommendPackage(answers({}), packages);
    expect(result?.reason).toContain('15 000');
    expect(result?.reason).toContain('1 h 30');
    expect(result?.reason).toContain(result!.package.description);
  });

  it('formate les tarifs sans en inventer', () => {
    const essentiel = packages.find((item) => item.name === 'Essentiel')!;
    const premium = packages.find((item) => item.name === 'Premium')!;
    expect(packagePriceLabel(essentiel)).toBe('15 000 FCFA');
    expect(packagePriceLabel(premium)).toBe('Tarif sur demande');
  });
});
