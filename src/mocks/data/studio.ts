import studioEspace from '../../assets/images/studio-espace.webp';
import studioReal from '../../assets/images/studio.webp';
import type { StudioContent } from '../../types/content';

export const studioContent: StudioContent = {
  hero: {
    eyebrow: 'LE STUDIO OCD LIVE · TOGO',
    title: 'Bienvenue dans votre\nespace d’expression',
    description: 'Un lieu dédié à votre prise de parole : vos produits, votre histoire et votre savoir-faire prennent la lumière, en direct.',
    photo: {
      src: studioEspace,
      alt: 'Un studio de création de contenu : éclairages professionnels, caméras sur trépied, fauteuil et décoration boisée aux tons cuivrés.',
      credit: 'OCD Live · visuel fourni pour le projet',
      source: '',
      position: '50% 55%',
      kind: 'provided',
      width: 1376,
      height: 768,
    },
    photoLabel: 'Le studio OCD Live.',
  },
  presentation: {
    eyebrow: 'UN LIEU DÉDIÉ',
    title: 'Un espace pensé pour\nvotre prise de parole.',
    paragraphs: [
      'Présenter en direct demande un cadre à la hauteur de votre activité. Le studio OCD Live vous accueille pour installer vos produits, préparer votre message et parler à votre audience dans les meilleures dispositions.',
      'Ici, votre activité devient le sujet principal : vous apportez votre savoir-faire, l’espace met votre histoire en scène.',
    ],
    photo: {
      src: studioReal,
      alt: 'Les locaux OCD Live : un intervenant installé à son bureau devant le logo OCD Live, dessinant le contour de l’Afrique en lumière.',
      credit: 'OCD Live · photographie fournie pour le projet',
      source: '',
      position: '50% 30%',
      kind: 'studio',
      width: 415,
      height: 739,
    },
    caption: 'Les locaux OCD Live, au Togo.',
  },
  experience: {
    eyebrow: 'VOTRE SÉANCE, ÉTAPE PAR ÉTAPE',
    title: 'Le déroulé d’un live,\nsimplement.',
    intro: 'De la préparation à l’échange avec votre audience, chaque moment a sa place.',
    steps: [
      { number: '01', title: 'Préparez vos produits.', description: 'Rassemblez ce que vous souhaitez présenter : vos produits, vos supports et l’histoire de votre activité.' },
      { number: '02', title: 'Installez votre présentation.', description: 'Mettez en place votre espace de prise de parole, accompagné par l’équipe OCD Live.' },
      { number: '03', title: 'Présentez en direct.', description: 'Montrez les détails, expliquez les usages et donnez vie à ce que vous proposez.' },
      { number: '04', title: 'Échangez avec votre audience.', description: 'Répondez aux réactions, valorisez votre offre et faites découvrir votre univers.' },
    ],
  },
  modes: [
    {
      id: 'in-person',
      eyebrow: 'LE PRÉSENTIEL',
      title: 'Venez au studio.',
      description: 'Rejoignez les locaux OCD Live au Togo : vous apportez vos produits, une équipe vous accompagne pour installer votre présentation et encadrer votre session.',
      details: ['Vos produits au premier plan', 'Un cadre dédié à votre prise de parole', 'Une équipe pour encadrer votre session'],
      cta: 'Réserver en présentiel',
    },
    {
      id: 'remote',
      eyebrow: 'LA DISTANCE',
      title: 'Présentez depuis chez vous.',
      description: 'Depuis votre commerce ou votre domicile, vous prenez la parole en direct. Un accompagnement local prévu par OCD Live peut vous assister, à définir ensemble.',
      details: ['Depuis votre lieu de travail', 'Sans déplacement dans nos locaux', 'Un accompagnement possible, à préciser avec l’équipe'],
      cta: 'Réserver à distance',
    },
  ],
  cta: {
    eyebrow: 'À VOUS DE JOUER',
    title: 'Votre activité mérite\nd’être vue.',
    description: 'Le studio OCD Live vous attend.',
    cta: 'Réserver mon live',
  },
};
