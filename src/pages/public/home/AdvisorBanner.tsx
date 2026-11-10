import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '../../../components/common/Container';

export function AdvisorBanner() {
  return (
    <section className="advisor-banner" aria-labelledby="advisor-banner-title">
      <Container className="advisor-banner-inner">
        <div className="advisor-banner-copy">
          <p className="eyebrow">LE CONSEILLER OCD LIVE</p>
          <h2 id="advisor-banner-title">Vous ne savez pas quelle formule choisir ?</h2>
          <p>Quatre questions suffisent pour trouver le format qui correspond à votre activité, votre rythme et votre budget.</p>
        </div>
        <Link className="button button-accent" to="/conseiller">Laissez-nous vous guider <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </Container>
    </section>
  );
}
