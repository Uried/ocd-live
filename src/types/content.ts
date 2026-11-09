import type { BookingMode } from './booking';

export interface NavigationItem {
  label: string;
  href: string;
}

export interface Photo {
  src: string;
  alt: string;
  credit: string;
  source: string;
  position: string;
}

export interface ParticipationMode {
  id: BookingMode;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  details: string[];
  cta: string;
  photo: Photo;
}

export interface HomeContent {
  navigation: NavigationItem[];
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    photo: Photo;
    photoLabel: string;
  };
  modes: ParticipationMode[];
  steps: { number: string; title: string; description: string }[];
  services: { number: string; title: string; description: string; icon: 'video' | 'package' | 'radio' }[];
  faq: { id: string; question: string; answer: string }[];
  footer: {
    contact: string;
    location: string;
    social: string[];
  };
}
