import liveCommerce from '../../assets/images/live-commerce.jpg';
import production from '../../assets/images/production.jpg';
import heroStudio from '../../assets/images/hero-studio.webp';
import type { HomeContent } from '../../types/content';

export const homeContent: HomeContent = {
  navigation: [
    { label: 'Accueil', href: '/#accueil' },
    { label: 'Comment ça marche', href: '/#comment-ca-marche' },
    { label: 'Nos offres', href: '/#prestations' },
    { label: 'FAQ', href: '/#faq' },
  ],
  hero: {
    eyebrow: 'LIVE SHOPPING · TOGO & À DISTANCE',
    title: 'Votre activité\nmérite d’être\nvue.',
    description: 'Présentez vos produits, développez votre visibilité et échangez directement avec votre audience grâce aux lives OCD Live.',
    photo: {
      src: heroStudio,
      alt: 'Une présentatrice montre un pot de sauce dans le studio OCD Live, devant le logo et le mur lumineux, face au matériel de live shopping.',
      credit: 'OCD Live · visuel fourni, généré à partir du studio réel',
      source: '',
      position: '50% 50%',
      kind: 'provided',
      width: 1376,
      height: 768,
    },
    photoLabel: 'Le studio OCD Live, au Togo.',
  },
  modes: [
    {
      id: 'in-person', number: '01', eyebrow: 'LE LIVE EN PRÉSENTIEL',
      title: 'Vos produits.\nNotre studio.',
      description: 'Venez présenter votre activité dans les locaux OCD Live au Togo. Vous apportez votre savoir-faire, une équipe technique vous accompagne.',
      details: ['Une présentation depuis nos locaux au Togo', 'Une équipe pour encadrer votre session', 'Vos produits et votre histoire au premier plan'],
      cta: 'Choisir le présentiel',
      photo: { src: production, alt: 'Une professionnelle prépare une caméra pour un tournage.', credit: 'Samantha Borges', source: 'https://unsplash.com/photos/cTMBzKtxrQk', position: '50% 45%' },
    },
    {
      id: 'remote', number: '02', eyebrow: 'LE LIVE À DISTANCE',
      title: 'Votre commerce.\nVotre point de départ.',
      description: 'Participez depuis votre commerce ou votre domicile. Une autre façon de prendre la parole, avec la possibilité d’un accompagnement par une assistante située au Togo.',
      details: ['Depuis votre commerce ou votre domicile', 'Sans déplacement dans nos locaux', 'Un accompagnement possible, à définir ensemble'],
      cta: 'Choisir la distance',
      photo: { src: liveCommerce, alt: 'Une commerçante présente un produit en direct vidéo depuis sa boutique, filmée par un téléphone sur trépied.', credit: 'OCD Live · visuel fourni', source: '', position: '50% 50%', kind: 'provided', width: 1376, height: 768 },
    },
  ],
  steps: [
    { number: '01', title: 'Choisissez votre mode.', description: 'Au studio au Togo ou à distance : partez de ce qui vous convient.' },
    { number: '02', title: 'Trouvez votre formule.', description: 'Choisissez une formule adaptée à votre présentation avec notre équipe.' },
    { number: '03', title: 'Réservez votre créneau.', description: 'Sélectionnez votre session parmi les disponibilités proposées.' },
    { number: '04', title: 'Prenez la parole.', description: 'Présentez vos produits, votre activité et ce qui vous rend unique.' },
  ],
  services: [
    { number: '01', title: 'Présentez vos produits.', description: 'Montrez les détails, expliquez les usages et donnez vie à ce que vous proposez.', icon: 'package' },
    { number: '02', title: 'Incarnez votre activité.', description: 'Faites découvrir votre savoir-faire et racontez l’histoire derrière votre entreprise.', icon: 'video' },
    { number: '03', title: 'Développez votre visibilité.', description: 'Utilisez le format live pour faire connaître votre activité à de nouveaux publics.', icon: 'radio' },
  ],
  faq: [
    { id: 'public', question: 'À qui s’adressent les sessions OCD Live ?', answer: 'Aux entrepreneurs, commerçants, entreprises et particuliers souhaitant présenter leurs produits ou services et développer leur visibilité.' },
    { id: 'location', question: 'Dois-je me déplacer au Togo ?', answer: 'Le mode présentiel se déroule dans les locaux OCD Live au Togo. Le mode à distance permet de participer depuis votre commerce ou votre domicile.' },
    { id: 'support', question: 'Puis-je être accompagné à distance ?', answer: 'Un accompagnement par une assistante située au Togo est possible. Ses modalités devront être précisées avec l’équipe avant toute réservation.' },
    { id: 'pricing', question: 'Où trouver les tarifs et les disponibilités ?', answer: 'Les formules, tarifs et disponibilités sont communiqués par notre équipe lors de l’échange préparatoire à votre session.' },
  ],
  footer: { contact: '', location: 'Togo', social: ['Instagram', 'Facebook', 'TikTok'] },
};
