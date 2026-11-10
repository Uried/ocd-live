import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Check, MapPin, MonitorSmartphone, RotateCcw } from 'lucide-react';
import { usePrepareContent } from '../../hooks/usePrepareContent';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Button } from '../../components/ui/button';
import { Container } from '../../components/common/Container';
import { Photo } from '../../components/common/Photo';
import '../../styles/prepare.css';

const STORAGE_KEY = 'ocd-prepare-checklist';
const lines = (title: string) => title.split('\n').map((line, index, all) => <span key={line}>{line}{index < all.length - 1 ? ' ' : ''}</span>);

const loadChecked = (): Set<string> => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
};

export function PreparePage() {
  const { state, retry } = usePrepareContent();
  const [checked, setChecked] = useState<Set<string>>(loadChecked);
  const navigate = useNavigate();

  useEffect(() => {
    const previous = document.title;
    document.title = 'Préparer son live — OCD Live';
    return () => { document.title = previous; };
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked])); } catch { /* stockage indisponible */ }
  }, [checked]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '2000% 0px -6% 0px' });
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [state.status]);

  if (state.status === 'loading') return <main className="page-state" aria-busy="true"><span className="loading-mark" aria-hidden="true" /><p role="status">OCD Live · Préparation de votre expérience…</p></main>;
  if (state.status === 'error') return <main className="page-state"><h1>Une petite interruption.</h1><p role="alert">Le contenu n’a pas pu être chargé.</p><Button onClick={retry}>Réessayer</Button></main>;

  const { home, prepare } = state;
  const groups = prepare.checklist.groups;
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const done = groups.reduce((sum, group) => sum + group.items.filter((item) => checked.has(item.id)).length, 0);
  const percent = total ? Math.round((done / total) * 100) : 0;
  const toggle = (id: string) => setChecked((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const reset = () => setChecked(new Set());

  return (
    <PublicLayout content={home} onBook={() => navigate('/reservation')}>
      <section className="prepare-hero" aria-labelledby="prepare-hero-title">
        <Photo photo={{ ...prepare.hero.photo, position: 'var(--prepare-hero-photo-position)' }} priority className="prepare-hero-photo" />
        <Container className="prepare-hero-inner">
          <div className="prepare-hero-copy">
            <p className="eyebrow prepare-hero-eyebrow"><span className="signal-dot" />{prepare.hero.eyebrow}</p>
            <h1 id="prepare-hero-title">{lines(prepare.hero.title)}</h1>
            <p className="prepare-hero-description">{prepare.hero.description}</p>
            <div className="prepare-hero-actions">
              <Button variant="accent" asChild><a href="#checklist">Préparer ma séance <ArrowDown size={18} aria-hidden="true" /></a></Button>
              <Button variant="outline" asChild><Link to="/reservation">Réserver un live <ArrowUpRight size={18} aria-hidden="true" /></Link></Button>
            </div>
          </div>
        </Container>
      </section>

      <section id="checklist" className="prepare-checklist" aria-labelledby="prepare-checklist-title">
        <Container className="prepare-checklist-grid">
          <aside className="prepare-progress" data-reveal>
            <p className="eyebrow">{prepare.checklist.eyebrow}</p>
            <h2 id="prepare-checklist-title">{lines(prepare.checklist.title)}</h2>
            <p className="prepare-progress-intro">{prepare.checklist.intro}</p>
            <div className="prepare-progress-meter">
              <strong>{percent}<span aria-hidden="true"> %</span><span className="sr-only">pour cent</span></strong>
              <div className="prepare-progress-track" role="progressbar" aria-label="Progression de la préparation" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${percent}%` }} />
              </div>
              <p aria-live="polite">{done === 0 ? 'Aucun point coché pour le moment.' : `${done} point${done > 1 ? 's' : ''} sur ${total}`}</p>
              {percent === 100 && <p className="prepare-progress-done" role="status">Tout est prêt : belle séance en perspective.</p>}
            </div>
            <Button variant="ghost" onClick={reset} disabled={done === 0}><RotateCcw size={16} aria-hidden="true" />Réinitialiser la checklist</Button>
          </aside>
          <ol className="prepare-groups">
            {groups.map((group) => {
              const groupDone = group.items.filter((item) => checked.has(item.id)).length;
              return (
                <li key={group.id} className="prepare-group" data-complete={groupDone === group.items.length || undefined} data-reveal>
                  <div className="prepare-group-head">
                    <span className="prepare-group-letter" aria-hidden="true">{group.letter}</span>
                    <h3>{group.title}</h3>
                    <span className="prepare-group-count" aria-label={`${groupDone} sur ${group.items.length}`}>{groupDone}/{group.items.length}</span>
                  </div>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <label className="prepare-item">
                          <input type="checkbox" checked={checked.has(item.id)} onChange={() => toggle(item.id)} />
                          <span className="prepare-item-box" aria-hidden="true"><Check size={14} /></span>
                          <span>{item.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      <section className="prepare-tips" aria-labelledby="prepare-tips-title">
        <Container>
          <div className="section-heading" data-reveal>
            <div><p className="eyebrow">{prepare.tips.eyebrow}</p><h2 id="prepare-tips-title">{lines(prepare.tips.title)}</h2></div>
          </div>
          <ol className="prepare-tips-list">
            {prepare.tips.items.map((tip, index) => (
              <li key={tip.number} data-reveal style={{ transitionDelay: `${index * 60}ms` }}>
                <span className="prepare-tip-number" aria-hidden="true">{tip.number}</span>
                <div><h3>{tip.title}</h3><p>{tip.description}</p></div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="prepare-modes" aria-labelledby="prepare-modes-title">
        <Container>
          <div className="section-heading" data-reveal>
            <div><p className="eyebrow">{prepare.modes.eyebrow}</p><h2 id="prepare-modes-title">{lines(prepare.modes.title)}</h2></div>
          </div>
          <div className="prepare-mode-grid">
            {prepare.modes.items.map((mode, index) => (
              <article key={mode.id} className={`prepare-mode-panel ${index === 0 ? 'prepare-mode-dark' : 'prepare-mode-light'}`} data-reveal>
                <span className="prepare-mode-chip">{mode.id === 'in-person' ? <MapPin size={15} aria-hidden="true" /> : <MonitorSmartphone size={15} aria-hidden="true" />}{mode.id === 'in-person' ? 'AU STUDIO · TOGO' : 'DEPUIS CHEZ VOUS'}</span>
                <p className="eyebrow">{mode.eyebrow}</p>
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
                <ul>{mode.points.map((point) => <li key={point}><Check size={15} aria-hidden="true" />{point}</li>)}</ul>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="prepare-cta" aria-labelledby="prepare-cta-title">
        <Container className="prepare-cta-inner" data-reveal>
          <p className="eyebrow">{prepare.cta.eyebrow}</p>
          <h2 id="prepare-cta-title">{lines(prepare.cta.title)}</h2>
          <Link className="button button-accent" to="/reservation">{prepare.cta.button} <ArrowUpRight size={21} aria-hidden="true" /></Link>
        </Container>
      </section>
    </PublicLayout>
  );
}
