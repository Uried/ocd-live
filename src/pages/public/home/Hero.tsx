import { ArrowDown, ArrowUpRight } from 'lucide-react';
import type { HomeContent } from '../../../types/content';
import type { BookingMode } from '../../../types/booking';
import { Container } from '../../../components/common/Container';
import { Photo } from '../../../components/common/Photo';
import { Button } from '../../../components/ui/button';

export function Hero({ content, onBook }: { content: HomeContent['hero']; onBook: (mode: BookingMode | null) => void }) {
  const titleLines = content.title.split('\n');
  return (
    <section id="accueil" className="hero" aria-labelledby="hero-title">
      <Photo photo={{ ...content.photo, position: 'var(--hero-photo-position)' }} priority className="hero-photo" />
      <Container className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow"><span className="signal-dot" />{content.eyebrow}</p>
          <h1 id="hero-title">{titleLines.map((line, index) => <span className={`hero-title-line${index === titleLines.length - 1 ? ' hero-word' : ''}`} key={line}>{line}{index < titleLines.length - 1 ? ' ' : ''}</span>)}</h1>
          <p className="hero-description">{content.description}</p>
          <div className="hero-buttons">
            <Button variant="accent" onClick={() => onBook(null)}>Réserver mon live <ArrowUpRight size={19} aria-hidden="true" /></Button>
            <Button variant="outline" asChild><a href="#participer">Découvrir OCD Live <ArrowDown size={18} aria-hidden="true" /></a></Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
