import { ArrowUpRight, Package, Radio, Video } from 'lucide-react';
import type { HomeContent } from '../../../types/content';
import { Container } from '../../../components/common/Container';

const icons = { package: Package, radio: Radio, video: Video };

export function Services({ services }: { services: HomeContent['services'] }) {
  return (
    <section id="prestations" className="services section-space" aria-labelledby="services-title"><Container className="services-grid">
      <div className="services-intro"><p className="eyebrow">PLUS QU’UNE PRÉSENTATION</p><h2 id="services-title">Ce que vous faites<br />mérite un public.</h2><p>Du produit que vous créez au service que vous imaginez : donnez à votre activité un espace pour être découverte.</p><a href="#participer" className="text-link">Découvrir les deux modes <ArrowUpRight size={18} aria-hidden="true" /></a></div>
      <div className="services-list">{services.map((service) => { const Icon = icons[service.icon]; return <article key={service.number}><span className="service-icon"><Icon size={25} strokeWidth={1.4} aria-hidden="true" /></span><div><h3>{service.title}</h3><p>{service.description}</p></div><span className="service-number">{service.number}</span></article>; })}<p className="services-note">Les formules et tarifs officiels seront communiqués ultérieurement.</p></div>
    </Container></section>
  );
}
