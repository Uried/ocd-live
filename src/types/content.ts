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
  kind?: 'studio' | 'illustration' | 'provided';
  width?: number;
  height?: number;
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

export interface StudioMode {
  id: BookingMode;
  eyebrow: string;
  title: string;
  description: string;
  details: string[];
  cta: string;
}

export interface StudioContent {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    photo: Photo;
    photoLabel: string;
  };
  presentation: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    photo: Photo;
    caption: string;
  };
  experience: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: { number: string; title: string; description: string }[];
  };
  modes: StudioMode[];
  cta: {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
  };
}

export interface PrepareChecklistGroup {
  id: string;
  letter: string;
  title: string;
  items: { id: string; label: string }[];
}

export interface PrepareContent {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    photo: Photo;
    photoLabel: string;
  };
  checklist: {
    eyebrow: string;
    title: string;
    intro: string;
    groups: PrepareChecklistGroup[];
  };
  tips: {
    eyebrow: string;
    title: string;
    items: { number: string; title: string; description: string }[];
  };
  modes: {
    eyebrow: string;
    title: string;
    items: { id: BookingMode; eyebrow: string; title: string; description: string; points: string[] }[];
  };
  cta: {
    eyebrow: string;
    title: string;
    button: string;
  };
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
