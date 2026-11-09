import { ArrowDown, ArrowRight, ArrowUpRight, AudioLines, MapPin, Monitor } from 'lucide-react';
import type { HomeContent } from '../../../types/content';
import type { BookingMode } from '../../../types/booking';
import { Container } from '../../../components/common/Container';
import { Photo } from '../../../components/common/Photo';
import { Button } from '../../../components/ui/button';

export function Hero({ content, onBook }: { content: HomeContent['hero']; onBook: (mode: BookingMode) => void }) {
  const titleLines = content.title.split('\n');
  return (
    <section id="accueil" className="hero" aria-labelledby="hero-title">
      <Container className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow"><span className="signal-dot" />{content.eyebrow}</p>
          <h1 id="hero-title">{titleLines.slice(0, -1).map((line) => <span className="hero-title-line" key={line}>{line} </span>)}<span className="hero-word">{titleLines.at(-1)}<ArrowUpRight aria-hidden="true" strokeWidth={1.3} /></span></h1>
          <p className="hero-description">{content.description}</p>
          <div className="hero-buttons"><Button variant="accent" onClick={() => onBook('in-person')}>Réserver un live en présentiel <ArrowUpRight size={19} aria-hidden="true" /></Button><Button variant="ghost" onClick={() => onBook('remote')}>Participer à distance <ArrowRight size={19} aria-hidden="true" /></Button></div>
          <div className="hero-location"><span><MapPin size={14} aria-hidden="true" /> Au studio, au Togo</span><span className="location-divider" /><span><Monitor size={14} aria-hidden="true" /> Depuis votre commerce</span></div>
        </div>
        <figure className="hero-visual">
          <div className="hero-photo-wrap"><Photo photo={content.photo} priority className="hero-photo" /><div className="viewfinder viewfinder-tl" /><div className="viewfinder viewfinder-br" /><span className="photo-top-label">LE LIVE, AU SERVICE DE VOTRE ACTIVITÉ</span><div className="hero-photo-caption"><AudioLines size={28} strokeWidth={1.4} aria-hidden="true" /><span>Votre savoir-faire.<br /><strong>Au premier plan.</strong></span></div></div>
          <figcaption><span>{content.photoLabel}</span><span>PHOTO D’ILLUSTRATION</span></figcaption>
          <div className="hero-side-label" aria-hidden="true">OCD LIVE — DONNEZ DE LA VOIX À VOTRE ACTIVITÉ</div>
        </figure>
      </Container>
      <Container className="hero-bottom"><a href="#participer" className="discover-link"><ArrowDown size={16} aria-hidden="true" /> Découvrez une autre façon de vous faire connaître</a><span>VOTRE HISTOIRE COMMENCE ICI</span></Container>
    </section>
  );
}
