import type { BookingMode, BookingPackage } from '../types/booking';

export type AdvisorGoal = 'discover' | 'sell' | 'long' | 'recurring' | 'unsure';
export type AdvisorParticipation = 'in-person' | 'remote' | 'flexible';
export type AdvisorDuration = 'short' | 'standard' | 'long' | 'monthly' | 'advised';
export type AdvisorBudget = 'under-10000' | '10000-20000' | '20000-40000' | 'over-40000' | 'advised';

export interface AdvisorAnswers {
  goal: AdvisorGoal;
  participation: AdvisorParticipation;
  duration: AdvisorDuration;
  budget: AdvisorBudget;
}

export interface AdvisorOption {
  value: string;
  label: string;
  icon: string;
}

export interface AdvisorQuestion {
  id: keyof AdvisorAnswers;
  title: string;
  options: AdvisorOption[];
}

export const advisorQuestions: AdvisorQuestion[] = [
  {
    id: 'goal',
    title: 'Quel est votre objectif principal ?',
    options: [
      { value: 'discover', label: 'Faire découvrir mon activité et mes produits', icon: 'sparkles' },
      { value: 'sell', label: 'Présenter plusieurs produits et vendre', icon: 'shopping-bag' },
      { value: 'long', label: 'Organiser une présentation plus longue', icon: 'presentation' },
      { value: 'recurring', label: 'Développer ma visibilité sur plusieurs séances', icon: 'calendar-range' },
      { value: 'unsure', label: 'Je ne sais pas encore', icon: 'compass' },
    ],
  },
  {
    id: 'participation',
    title: 'Quel type de participation préférez-vous ?',
    options: [
      { value: 'in-person', label: 'Au studio OCD Live', icon: 'map-pin' },
      { value: 'remote', label: 'Depuis mon commerce ou mon domicile, avec l’assistance locale', icon: 'monitor-smartphone' },
      { value: 'flexible', label: 'Je suis flexible', icon: 'shuffle' },
    ],
  },
  {
    id: 'duration',
    title: 'Combien de temps souhaitez-vous consacrer à votre présentation ?',
    options: [
      { value: 'short', label: 'Moins d’une heure', icon: 'timer' },
      { value: 'standard', label: 'Environ 1 h 30', icon: 'clock' },
      { value: 'long', label: 'Plusieurs heures', icon: 'hourglass' },
      { value: 'monthly', label: 'Plusieurs séances réparties dans le mois', icon: 'calendar-days' },
      { value: 'advised', label: 'Je souhaite être conseillé', icon: 'message-circle-question' },
    ],
  },
  {
    id: 'budget',
    title: 'Quel budget envisagez-vous ?',
    options: [
      { value: 'under-10000', label: 'Moins de 10 000 FCFA', icon: 'coins' },
      { value: '10000-20000', label: 'Entre 10 000 et 20 000 FCFA', icon: 'wallet' },
      { value: '20000-40000', label: 'Entre 20 000 et 40 000 FCFA', icon: 'banknote' },
      { value: 'over-40000', label: 'Plus de 40 000 FCFA', icon: 'gem' },
      { value: 'advised', label: 'Je préfère recevoir un conseil', icon: 'handshake' },
    ],
  },
];

export interface AdvisorRecommendation {
  package: BookingPackage;
  mode: BookingMode | null;
  reason: string;
  fallback: boolean;
}

const budgetCeiling: Record<AdvisorBudget, number> = {
  'under-10000': 10000,
  '10000-20000': 20000,
  '20000-40000': 40000,
  'over-40000': Number.POSITIVE_INFINITY,
  'advised': Number.POSITIVE_INFINITY,
};

const durationTarget: Partial<Record<AdvisorDuration, number>> = { short: 45, standard: 90, long: 240 };

const goalLabel: Record<AdvisorGoal, string> = {
  discover: 'faire découvrir votre activité et vos produits',
  sell: 'présenter plusieurs produits et vendre',
  long: 'organiser une présentation plus longue',
  recurring: 'développer votre visibilité sur plusieurs séances',
  unsure: 'préparer votre première session',
};

const tierRank = { standard: 0, value: 1, flexible: 2, premium: 3 } as const;

const isMonthlyPackage = (item: BookingPackage) => item.durationMinutes === null && item.price.amount !== null;
const isQuotePackage = (item: BookingPackage) => item.price.amount === null;

const matchesDuration = (item: BookingPackage, duration: AdvisorDuration): boolean => {
  const minutes = item.durationMinutes;
  if (duration === 'advised') return true;
  if (duration === 'monthly') return isMonthlyPackage(item);
  if (minutes === null) return false;
  if (duration === 'short') return minutes <= 60;
  if (duration === 'standard') return minutes > 60 && minutes <= 120;
  return minutes >= 150;
};

const scorePackage = (answers: AdvisorAnswers, item: BookingPackage): number => {
  const minutes = item.durationMinutes;
  let score = matchesDuration(item, answers.duration) ? 4 : 0;
  switch (answers.goal) {
    case 'discover':
      score += minutes !== null && minutes <= 60 ? 3 : minutes !== null && minutes <= 90 ? 1 : 0;
      break;
    case 'sell':
      score += minutes !== null && minutes >= 90 ? 3 : minutes !== null && minutes <= 60 ? 1 : 0;
      break;
    case 'long':
      score += minutes !== null && minutes >= 240 ? 3 : 0;
      break;
    case 'recurring':
      score += isMonthlyPackage(item) ? 6 : -6;
      break;
    case 'unsure':
      score += minutes !== null && minutes <= 90 ? 2 : 0;
      break;
  }
  return score;
};

const durationCloseness = (answers: AdvisorAnswers, item: BookingPackage): number => {
  const target = durationTarget[answers.duration];
  if (target === undefined || item.durationMinutes === null) return Number.MAX_SAFE_INTEGER;
  return Math.abs(item.durationMinutes - target);
};

export function packagePriceLabel(item: BookingPackage): string {
  return item.price.amount === null ? 'Tarif sur demande' : `${new Intl.NumberFormat('fr-FR').format(item.price.amount)} FCFA`;
}

export function advisorMode(answers: Pick<AdvisorAnswers, 'participation'>): BookingMode | null {
  return answers.participation === 'flexible' ? null : answers.participation;
}

function reasonFor(answers: AdvisorAnswers, item: BookingPackage): string {
  const sentences = [item.description];
  const price = item.price.amount === null ? null : packagePriceLabel(item);
  if (item.durationMinutes === null) {
    sentences.push(`Son organisation, ${item.durationLabel.charAt(0).toLowerCase()}${item.durationLabel.slice(1)}, se règle avec l’équipe.`);
  } else if (price) {
    sentences.push(`Son format de ${item.durationLabel} à ${price} cadre avec vos réponses.`);
  }
  sentences.push(`Elle répond à votre objectif : ${goalLabel[answers.goal]}.`);
  return sentences.join(' ');
}

const fallbackReason = 'Vos réponses décrivent un projet qui sort du cadre des formules standard. La formule Premium permet de convenir ensemble de la durée, des prestations et du tarif.';

export function recommendPackage(answers: AdvisorAnswers, packages: BookingPackage[]): AdvisorRecommendation | null {
  const mode = advisorMode(answers);
  const ceiling = budgetCeiling[answers.budget];
  const modeFit = (item: BookingPackage) => mode === null || item.modes.includes(mode);
  const budgetFit = (item: BookingPackage) => item.price.amount === null ? ceiling === Number.POSITIVE_INFINITY : item.price.amount <= ceiling;
  const quote = packages.find(isQuotePackage);
  const fallback = (): AdvisorRecommendation | null => quote ? { package: quote, mode, reason: fallbackReason, fallback: true } : null;

  if (answers.goal === 'recurring' || answers.duration === 'monthly') {
    const monthly = packages.find((item) => isMonthlyPackage(item) && modeFit(item) && budgetFit(item));
    return monthly ? { package: monthly, mode, reason: reasonFor(answers, monthly), fallback: false } : fallback();
  }

  const candidates = packages.filter((item) => !isQuotePackage(item) && modeFit(item) && budgetFit(item));
  if (!candidates.length) return fallback();
  const best = candidates
    .map((item) => ({ item, score: scorePackage(answers, item) }))
    .sort((a, b) =>
      b.score - a.score
      || durationCloseness(answers, a.item) - durationCloseness(answers, b.item)
      || (a.item.price.amount ?? Number.POSITIVE_INFINITY) - (b.item.price.amount ?? Number.POSITIVE_INFINITY)
      || tierRank[a.item.tier] - tierRank[b.item.tier]
      || a.item.name.localeCompare(b.item.name, 'fr'))[0]?.item;
  if (!best) return fallback();

  if (answers.duration !== 'advised' && !matchesDuration(best, answers.duration)) return fallback();
  return { package: best, mode, reason: reasonFor(answers, best), fallback: false };
}
