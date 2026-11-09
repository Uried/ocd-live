import { ArrowUpRight } from 'lucide-react';
import type { HomeContent } from '../../../types/content';
import { Container } from '../../../components/common/Container';

export function HowItWorks({ steps }: { steps: HomeContent['steps'] }) {
  return (
    <section id="comment-ca-marche" className="how-it-works section-space" aria-labelledby="steps-title"><Container>
      <div className="section-heading"><div><p className="eyebrow">DE L’IDÉE À LA PRISE DE PAROLE</p><h2 id="steps-title">Le live commence<br />bien avant le direct.</h2></div><p>Un parcours simple, pour vous concentrer<br />sur ce que vous faites de mieux.</p></div>
      <ol className="steps-grid">{steps.map((step) => <li key={step.number}><div className="step-top"><span>{step.number}</span><ArrowUpRight size={21} aria-hidden="true" /></div><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
      <p className="steps-note">Le parcours présenté est celui prévu pour la plateforme. Les réservations ne sont pas encore ouvertes sur cette version.</p>
    </Container></section>
  );
}
