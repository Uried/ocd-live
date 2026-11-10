import prepareHero from '../../assets/images/prepare-hero.webp';
import type { PrepareContent } from '../../types/content';

export const prepareContent: PrepareContent = {
  hero: {
    eyebrow: 'PRÉPARER SON LIVE · OCD LIVE',
    title: 'Un bon live se prépare\navant même de commencer.',
    description: 'Quelques préparatifs suffisent pour présenter vos produits avec assurance, capter l’attention et profiter pleinement de votre séance.',
    photo: {
      src: prepareHero,
      alt: 'Des mains disposent des produits — pots, bracelets et flacons — sur une table en bois, face à un téléphone sur trépied prêt à filmer.',
      credit: 'OCD Live · visuel fourni pour le projet',
      source: '',
      position: '50% 60%',
      kind: 'provided',
      width: 1376,
      height: 768,
    },
    photoLabel: 'La préparation d’une présentation de produits.',
  },
  checklist: {
    eyebrow: 'VOTRE CHECKLIST',
    title: 'Cinq étapes pour\narriver prêt.',
    intro: 'Cochez chaque point au fur et à mesure : votre progression est conservée sur cet appareil.',
    groups: [
      {
        id: 'produits', letter: 'A', title: 'Préparer ses produits',
        items: [
          { id: 'a1', label: 'Sélectionner les produits ou services à présenter' },
          { id: 'a2', label: 'Vérifier leur disponibilité' },
          { id: 'a3', label: 'Préparer les prix et les offres' },
          { id: 'a4', label: 'Rassembler les informations importantes' },
        ],
      },
      {
        id: 'presentation', letter: 'B', title: 'Préparer sa présentation',
        items: [
          { id: 'b1', label: 'Définir les points essentiels à présenter' },
          { id: 'b2', label: 'Préparer une courte introduction de son activité' },
          { id: 'b3', label: 'Identifier les avantages de ses produits' },
          { id: 'b4', label: 'Préparer les réponses aux questions fréquentes' },
        ],
      },
      {
        id: 'espace', letter: 'C', title: 'Préparer son espace',
        items: [
          { id: 'c1', label: 'Nettoyer et organiser l’espace de présentation' },
          { id: 'c2', label: 'Disposer les produits de manière visible' },
          { id: 'c3', label: 'Prévoir un environnement calme' },
          { id: 'c4', label: 'Vérifier que l’éclairage est suffisant' },
        ],
      },
      {
        id: 'materiel', letter: 'D', title: 'Préparer son matériel',
        items: [
          { id: 'd1', label: 'Vérifier son téléphone' },
          { id: 'd2', label: 'Vérifier la connexion Internet' },
          { id: 'd3', label: 'S’assurer que la batterie est suffisante' },
          { id: 'd4', label: 'Prévoir les accessoires nécessaires' },
        ],
      },
      {
        id: 'objectif', letter: 'E', title: 'Préparer son objectif',
        items: [
          { id: 'e1', label: 'Définir ce que l’on souhaite obtenir du live' },
          { id: 'e2', label: 'Identifier les produits prioritaires' },
          { id: 'e3', label: 'Préparer ses coordonnées professionnelles à communiquer' },
        ],
      },
    ],
  },
  tips: {
    eyebrow: 'CONSEILS PRATIQUES',
    title: 'Trois réflexes qui changent\ntout pendant le direct.',
    items: [
      { number: '01', title: 'Attirez l’attention dès les premières secondes.', description: 'Commencez par votre produit ou votre message le plus fort : les premières secondes décident de la suite.' },
      { number: '02', title: 'Montrez les produits plutôt que de les décrire.', description: 'Faites voir les détails, les usages et les gestes : le direct vit par ce que vous montrez.' },
      { number: '03', title: 'Échangez naturellement avec vos spectateurs.', description: 'Répondez, remerciez, rebondissez sur les réactions : votre présence compte autant que votre offre.' },
    ],
  },
  modes: {
    eyebrow: 'DEUX FAÇONS DE SE PRÉPARER',
    title: 'Selon votre mode\nde participation.',
    items: [
      {
        id: 'in-person',
        eyebrow: 'LE PRÉSENTIEL',
        title: 'Vous venez au studio.',
        description: 'Rejoignez les locaux OCD Live au Togo avec vos produits : l’environnement de tournage est déjà prêt pour votre prise de parole.',
        points: ['Vos produits avec vous', 'Un environnement de tournage dédié', 'Une équipe pour encadrer votre session'],
      },
      {
        id: 'remote',
        eyebrow: 'LA DISTANCE',
        title: 'Vous restez chez vous.',
        description: 'Depuis votre boutique ou votre domicile, un accompagnement local prévu par OCD Live au Togo vous aide à réaliser le live.',
        points: ['Depuis votre boutique ou votre domicile', 'Un accompagnement local au Togo', 'Votre espace devient votre plateau'],
      },
    ],
  },
  cta: {
    eyebrow: 'PRÊT À PASSER EN DIRECT ?',
    title: 'Votre prochain live\ncommence ici.',
    button: 'Réserver ma séance',
  },
};
