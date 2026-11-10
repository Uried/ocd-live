import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Check, MapPin, MonitorSmartphone } from 'lucide-react';
import { useStudioContent } from '../../hooks/useStudioContent';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Button } from '../../components/ui/button';
import { Container } from '../../components/common/Container';
import { Photo } from '../../components/common/Photo';
import '../../styles/studio.css';

const lines = (title: string) => title.split('\n').map((line, index, all) => <span key={line}>{line}{index < all.length - 1 ? ' ' : ''}</span>);

export function StudioPage() {
  const { state, retry } = useStudioContent();
  const navigate = useNavigate();

  useEffect(() => {
    const previous = document.title;
    document.title = 'Le Studio — OCD Live';
    return () => { document.title = previous; };
  }, []);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '2000% 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [state.status]);

  if (state.status === 'loading') return <main className="page-state" aria-busy="true"><span className="loading-mark" aria-hidden="true" /><p role="status">OCD Live · Préparation de votre expérience…</p></main>;
  if (state.status === 'error') return <main className="page-state"><h1>Une petite interruption.</h1><p role="alert">Le contenu n’a pas pu être chargé.</p><Button onClick={retry}>Réessayer</Button></main>;

  const { home, studio } = state;
  const [inPerson, remote] = studio.modes;

  return (
    <PublicLayout content={home} onBook={() => navigate('/reservation')}>
      <section className="studio-hero" aria-labelledby="studio-hero-title">
        <Photo photo={{ ...studio.hero.photo, position: 'var(--studio-hero-photo-position)' }} priority className="studio-hero-photo" />
        <Container className="studio-hero-inner">
          <div className="studio-hero-copy">
            <p className="eyebrow studio-hero-eyebrow"><span className="signal-dot" />{studio.hero.eyebrow}</p>
            <h1 id="studio-hero-title">{lines(studio.hero.title)}</h1>
            <p className="studio-hero-description">{studio.hero.description}</p>
            <div className="studio-hero-actions">
              <Button variant="accent" onClick={() => navigate('/reservation')}>Réserver une séance <ArrowUpRight size={19} aria-hidden="true" /></Button>
              <a className="studio-hero-link" href="#experience"><span>Découvrir le studio</span><ArrowDown size={17} aria-hidden="true" /></a>
            </div>
          </div>
        </Container>
      </section>

      <section className="studio-presentation" aria-labelledby="studio-presentation-title">
        <Container className="studio-presentation-grid">
          <figure className="studio-presentation-visual" data-reveal>
            <Photo photo={studio.presentation.photo} />
            <figcaption>{studio.presentation.caption}</figcaption>
          </figure>
          <div className="studio-presentation-copy" data-reveal>
            <p className="eyebrow">{studio.presentation.eyebrow}</p>
            <h2 id="studio-presentation-title">{lines(studio.presentation.title)}</h2>
            {studio.presentation.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </Container>
      </section>

      <section id="experience" className="studio-experience" aria-labelledby="studio-experience-title">
        <Container>
          <div className="section-heading studio-experience-heading" data-reveal>
            <div><p className="eyebrow">{studio.experience.eyebrow}</p><h2 id="studio-experience-title">{lines(studio.experience.title)}</h2></div>
            <p>{studio.experience.intro}</p>
          </div>
          <ol className="studio-steps">
            {studio.experience.steps.map((step, index) => (
              <li key={step.number} data-reveal style={{ transitionDelay: `${index * 60}ms` }}>
                <span className="studio-step-number" aria-hidden="true">{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.description}</p></div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="studio-modes" aria-labelledby="studio-modes-title">
        <Container>
          <div className="section-heading" data-reveal>
            <div><p className="eyebrow">DEUX FAÇONS DE PRENDRE LA PAROLE</p><h2 id="studio-modes-title">Au studio ou depuis chez vous.</h2></div>
            <p>Le même objectif, deux cadres de présentation.<br />Choisissez celui qui vous ressemble.</p>
          </div>
          <div className="studio-mode-grid">
            {inPerson && (
              <article className="studio-mode-panel studio-mode-dark" data-reveal>
                <span className="studio-mode-number" aria-hidden="true">01</span>
                <span className="studio-mode-chip"><MapPin size={15} aria-hidden="true" />AU STUDIO · TOGO</span>
                <p className="eyebrow">{inPerson.eyebrow}</p>
                <h3>{inPerson.title}</h3>
                <p>{inPerson.description}</p>
                <ul>{inPerson.details.map((detail) => <li key={detail}><Check size={15} aria-hidden="true" />{detail}</li>)}</ul>
                <Button variant="accent" onClick={() => navigate(`/reservation?mode=${inPerson.id}`)}>{inPerson.cta}<ArrowUpRight size={18} aria-hidden="true" /></Button>
              </article>
            )}
            {remote && (
              <article className="studio-mode-panel studio-mode-light" data-reveal>
                <span className="studio-mode-number" aria-hidden="true">02</span>
                <span className="studio-mode-chip"><MonitorSmartphone size={15} aria-hidden="true" />DEPUIS VOTRE COMMERCE</span>
                <p className="eyebrow">{remote.eyebrow}</p>
                <h3>{remote.title}</h3>
                <p>{remote.description}</p>
                <ul>{remote.details.map((detail) => <li key={detail}><Check size={15} aria-hidden="true" />{detail}</li>)}</ul>
                <Button variant="outline" onClick={() => navigate(`/reservation?mode=${remote.id}`)}>{remote.cta}<ArrowUpRight size={18} aria-hidden="true" /></Button>
              </article>
            )}
          </div>
        </Container>
      </section>

      <section className="studio-cta" aria-labelledby="studio-cta-title">
        <Container className="studio-cta-inner" data-reveal>
          <span className="studio-cta-signal" aria-hidden="true"><span className="signal-dot" /><span className="signal-dot" /><span className="signal-dot" /></span>
          <p className="eyebrow">{studio.cta.eyebrow}</p>
          <h2 id="studio-cta-title">{lines(studio.cta.title)}</h2>
          <p>{studio.cta.description}</p>
          <Link className="button button-accent" to="/reservation">{studio.cta.cta} <ArrowUpRight size={21} aria-hidden="true" /></Link>
        </Container>
      </section>
    </PublicLayout>
  );
}
