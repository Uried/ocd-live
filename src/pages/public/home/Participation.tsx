import { ArrowUpRight, Check, MapPin, Monitor } from 'lucide-react';
import type { ParticipationMode } from '../../../types/content';
import type { BookingMode } from '../../../types/booking';
import { Container } from '../../../components/common/Container';
import { Photo } from '../../../components/common/Photo';
import { Button } from '../../../components/ui/button';

export function Participation({ modes, onBook }: { modes: ParticipationMode[]; onBook: (mode: BookingMode) => void }) {
  return (
    <section id="participer" className="participation section-space" aria-labelledby="participation-title">
      <Container>
        <div className="section-heading"><div><p className="eyebrow">UN MÊME OBJECTIF. DEUX POSSIBILITÉS.</p><h2 id="participation-title">À votre façon.<br /><span className="text-muted">Avec la même ambition.</span></h2></div><p>Votre activité n’a pas de petit rôle.<br />Choisissez comment la mettre en lumière.</p></div>
        <div className="participation-list">
          {modes.map((mode) => <article key={mode.id} className={`participation-row participation-${mode.id}`}>
            <figure className="mode-visual"><Photo photo={mode.photo} /><span className="mode-image-label">{mode.id === 'in-person' ? <MapPin size={16} aria-hidden="true" /> : <Monitor size={16} aria-hidden="true" />}{mode.id === 'in-person' ? 'AU STUDIO · TOGO' : 'DEPUIS VOTRE COMMERCE'}</span><figcaption>Photographie d’illustration · {mode.photo.credit}</figcaption></figure>
            <div className="mode-copy"><div className="mode-eyebrow"><span className="eyebrow">{mode.eyebrow}</span><span className="mode-number">/{mode.number}</span></div><h3>{mode.title}</h3><p>{mode.description}</p><ul>{mode.details.map((detail) => <li key={detail}><Check size={15} aria-hidden="true" />{detail}</li>)}</ul><Button variant={mode.id === 'in-person' ? 'default' : 'outline'} onClick={() => onBook(mode.id)}>{mode.cta}<ArrowUpRight size={18} aria-hidden="true" /></Button></div>
          </article>)}
        </div>
      </Container>
    </section>
  );
}
