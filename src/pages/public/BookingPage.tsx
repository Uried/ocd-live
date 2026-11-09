import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Link, Outlet, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { bookingRepository, contentRepository } from '../../services/repositories';
import { bookingHorizonKey, getDayIssue, getTimeIssue, lomeTodayKey } from '../../services/availability';
import { addDaysToKey, addMinutesToTime, parseDateKey, toDateKey } from '../../utils/datetime';
import type { BookingMode, BookingPackage } from '../../types/booking';
import type { NavigationItem } from '../../types/content';
import { Button } from '../../components/ui/button';
import { Header } from '../../components/layout/Header';
import '../../styles/booking.css';

type Details = {
  name: string;
  email: string;
  phone: string;
  business: string;
  sector: string;
  city: string;
  location: string;
  connection: string;
};

type Draft = {
  mode: BookingMode;
  packageId: string;
  slotDate: string;
  slotTime: string;
  step: number;
  details: Details;
};

const emptyDetails: Details = { name: '', email: '', phone: '', business: '', sector: '', city: '', location: '', connection: '' };
const emptyDraft: Draft = { mode: 'in-person', packageId: '', slotDate: '', slotTime: '', step: 0, details: emptyDetails };
type FlowContext = [Draft, Dispatch<SetStateAction<Draft>>];

const packagePrice = (item: BookingPackage) => item.price.amount === null ? 'Tarif sur demande' : `${new Intl.NumberFormat('fr-FR').format(item.price.amount)} FCFA`;
const modeLabel = (mode: BookingMode) => mode === 'remote' ? 'À distance' : 'En présentiel';
const dayLabel = (dateKey: string, dateStyle: 'full' | 'long' = 'full') => new Intl.DateTimeFormat('fr-FR', { dateStyle }).format(parseDateKey(dateKey));
const slotLabel = (draft: Pick<Draft, 'slotDate' | 'slotTime'>, selected: BookingPackage) => {
  if (!draft.slotDate || !draft.slotTime) return '';
  const date = dayLabel(draft.slotDate);
  if (!selected.durationMinutes) return `${date} · ${draft.slotTime} · Africa/Lome`;
  const { end, endDateOffset } = addMinutesToTime(draft.slotTime, selected.durationMinutes);
  const nextDay = endDateOffset > 0 ? `, le lendemain ${dayLabel(addDaysToKey(draft.slotDate, endDateOffset), 'long')}` : '';
  return `${date} · ${draft.slotTime} – ${end}${nextDay} · Africa/Lome`;
};

const steps = ['Formule', 'Date & horaire', 'Votre activité', 'Récapitulatif', 'Votre sélection'];

export function BookingFlowLayout() {
  const state = useState<Draft>(emptyDraft);
  return <Outlet context={state} />;
}

function BookingCalendar({ value, mode, onChange }: { value: string; mode: BookingMode; onChange: (dateKey: string) => void }) {
  const todayKey = lomeTodayKey();
  const today = parseDateKey(todayKey);
  const monthFloor = new Date(today.getFullYear(), today.getMonth(), 1);
  const horizonDate = parseDateKey(bookingHorizonKey());
  const horizonMonthFloor = new Date(horizonDate.getFullYear(), horizonDate.getMonth(), 1);
  const [cursor, setCursor] = useState(() => {
    const base = value ? parseDateKey(value) : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(cursor);
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const offset = (cursor.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [...Array<null>(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  const move = (delta: number) => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const day = Number((event.target as HTMLElement).dataset.day);
    if (!day) return;
    const delta = deltas[event.key];
    const direction = delta ?? (event.key === 'Home' ? 1 : event.key === 'End' ? -1 : 0);
    if (!direction) return;
    let next = event.key === 'Home' ? 1 : event.key === 'End' ? daysInMonth : day + direction;
    while (next >= 1 && next <= daysInMonth) {
      const button = event.currentTarget.querySelector<HTMLButtonElement>(`[data-day="${next}"]`);
      if (button && !button.disabled) { button.focus(); break; }
      next += direction;
    }
    event.preventDefault();
  };
  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="calendar-nav" aria-label="Mois précédent" disabled={cursor <= monthFloor} onClick={() => move(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <strong>{label}</strong>
        <button type="button" className="calendar-nav" aria-label="Mois suivant" disabled={cursor >= horizonMonthFloor} onClick={() => move(1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <div role="grid" aria-label={`Choisir une date en ${label}`} onKeyDown={onGridKeyDown}>
        <div role="row" className="calendar-weekdays">{['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((day) => <span role="columnheader" key={day}>{day}</span>)}</div>
        {weeks.map((week, weekIndex) => (
          <div role="row" className="calendar-week" key={weekIndex}>
            {week.map((day, dayIndex) => {
              if (day === null) return <span role="gridcell" className="calendar-empty" key={dayIndex} aria-hidden="true" />;
              const key = toDateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day));
              const selected = key === value;
              const disabled = getDayIssue(key, mode, todayKey) !== null;
              return (
                <span role="gridcell" key={dayIndex} aria-selected={selected}>
                  <button type="button" className="calendar-day" data-day={day} data-today={key === todayKey || undefined} aria-pressed={selected} aria-current={key === todayKey ? 'date' : undefined} disabled={disabled} aria-label={dayFormatter.format(new Date(cursor.getFullYear(), cursor.getMonth(), day))} onClick={() => onChange(key)}>{day}</button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingPage() {
  const [draft, setDraft] = useOutletContext<FlowContext>();
  const [params, setParams] = useSearchParams();
  const requestedMode = params.get('mode');
  const navigate = useNavigate();
  const [packages, setPackages] = useState<BookingPackage[]>([]);
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = packages.find((item) => item.id === draft.packageId);
  const timeIssue = selected?.durationMinutes && draft.slotDate && draft.slotTime ? getTimeIssue(draft.slotDate, draft.slotTime, selected.durationMinutes, draft.mode) : null;
  const timeIssueMessage = timeIssue === 'past' ? 'Choisissez une heure à venir.' : timeIssue === 'outside-hours' ? 'Cette heure est en dehors des horaires proposés.' : timeIssue === 'occupied' ? 'Ce créneau est déjà occupé.' : timeIssue ? 'Cette journée n’est pas disponible pour ce mode de participation.' : null;
  const update = (patch: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...patch }));
  useEffect(() => {
    if (requestedMode === 'remote' || requestedMode === 'in-person') setDraft((previous) => previous.mode === requestedMode ? previous : { ...previous, mode: requestedMode, slotDate: '', slotTime: '', step: 0 });
  }, [requestedMode, setDraft]);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    bookingRepository.getPackages(draft.mode).then(
      (items) => { if (active) { setPackages(items); setStatus('ready'); } },
      () => { if (active) setStatus('error'); },
    );
    return () => { active = false; };
  }, [draft.mode, attempt]);
  useEffect(() => {
    let active = true;
    contentRepository.getHome().then((content) => { if (active) setNavigation(content.navigation); });
    return () => { active = false; };
  }, []);
  useEffect(() => { heading.current?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }); }, [draft.step]);
  const field = (key: keyof Details, label: string, type = 'text', autoComplete?: string) => (
    <label className="booking-field" key={key}>{label}
      <input required pattern=".*\S.*" type={type} autoComplete={autoComplete} value={draft.details[key]} maxLength={200} onChange={(event) => update({ details: { ...draft.details, [key]: event.target.value } })} />
    </label>
  );
  return (
    <div className="booking-page">
      <a className="skip-link" href="#booking-main">Aller au contenu</a>
      <Header navigation={navigation} onBook={() => navigate('/reservation')} />
      <main id="booking-main" className="container" tabIndex={-1}>
        <nav aria-label="Étapes de préparation">
          <ol className="booking-progress">{steps.map((label, index) => <li key={label} aria-current={draft.step === index ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
        </nav>
        <div className="booking-heading">
          <p className="eyebrow">OCD LIVE · VOTRE PROCHAINE SESSION</p>
          <h1 ref={heading} tabIndex={-1}>{['Le bon format. Pour vous.', 'Prenez le temps qu’il vous faut.', 'Faisons connaissance.', 'Tout est à votre image ?', 'Votre sélection est prête.'][draft.step]}</h1>
          <p>{draft.step === 0 ? 'Comparez les formats et choisissez celui qui correspond à votre ambition.' : 'Votre projet, étape par étape.'}</p>
        </div>
        <div className="booking-toolbar">
          <label>Participation <select value={draft.mode} onChange={(event) => { const mode = event.target.value as BookingMode; update({ mode, slotDate: '', slotTime: '', step: 0 }); setParams({ mode }, { replace: true }); }}><option value="in-person">En présentiel</option><option value="remote">À distance</option></select></label>
          {selected && <p><strong>{selected.name}</strong> · {selected.durationLabel} · {packagePrice(selected)}</p>}
        </div>
        {status === 'loading' ? <p role="status">Chargement des formules…</p> : status === 'error' ? (
          <div role="alert"><p>Les formules n’ont pas pu être chargées.</p><Button onClick={() => setAttempt((value) => value + 1)}>Réessayer</Button></div>
        ) : (<>
          {draft.step === 0 && (<>
            <section aria-label="Choisir une formule" className="package-grid">
              {packages.map((item) => (
                <article key={item.id} className={`package-card package-${item.tier}`} data-selected={draft.packageId === item.id}>
                  <p className="package-category">{item.tier === 'premium' ? 'VISIBILITÉ · SUR MESURE' : item.tier === 'value' ? 'PRENDRE LE TEMPS' : item.tier === 'standard' ? 'LE FORMAT ESSENTIEL' : 'À VOTRE RYTHME'}</p>
                  <h2>{item.name}</h2>
                  <p className="package-price">{packagePrice(item)}</p>
                  <p className="package-duration">{item.durationLabel}</p>
                  <p>{item.description}</p>
                  <h3>Les avantages</h3>
                  <ul>{item.benefits.map((benefit) => <li key={benefit}><Check size={16} aria-hidden="true" />{benefit}</li>)}</ul>
                  <h3>Prestations incluses</h3>
                  <ul>{item.inclusions.map((inclusion) => <li key={inclusion}>{inclusion}</li>)}</ul>
                  <p className="package-conditions">{item.conditions.join(' ')}</p>
                  <Button variant={item.tier === 'premium' ? 'light' : 'outline'} aria-pressed={draft.packageId === item.id} onClick={() => update({ packageId: item.id, slotDate: draft.packageId === item.id ? draft.slotDate : '', slotTime: draft.packageId === item.id ? draft.slotTime : '', step: 1 })}>{draft.packageId === item.id ? 'Continuer avec cette formule' : `Choisir ${item.name}`}<ArrowRight size={16} aria-hidden="true" /></Button>
                </article>
              ))}
            </section>
            <section className="package-comparison" aria-labelledby="comparison-heading">
              <h2 id="comparison-heading">L’essentiel, en un regard.</h2>
              <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Comparaison des six formules">
                <table>
                  <caption>Durées, tarifs et organisation des formules OCD Live</caption>
                  <thead><tr><th scope="col">Formule</th>{packages.map((item) => <th scope="col" key={item.id}>{item.name}</th>)}</tr></thead>
                  <tbody>
                    {([['Durée', (item: BookingPackage) => item.durationLabel], ['Tarif', packagePrice], ['Contenu', (item: BookingPackage) => item.inclusions.join(' · ')], ['Conditions', (item: BookingPackage) => item.conditions.join(' ')]] as const).map(([label, render]) => (
                      <tr key={label}><th scope="row">{label}</th>{packages.map((item) => <td key={item.id}>{render(item)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>)}
          {draft.step > 0 && !selected && <div role="alert"><p>Choisissez une formule pour poursuivre.</p><Button onClick={() => update({ step: 0 })}>Voir les formules</Button></div>}
          {draft.step === 1 && selected && (
            <section className="booking-panel">
              <h2>{selected.durationMinutes ? 'Choisissez votre jour et votre heure.' : 'Une organisation à définir ensemble'}</h2>
              {selected.durationMinutes ? (<>
                <p className="schedule-intro">Horaires de Lomé · Africa/Lome. Choisissez librement votre heure de début ; votre formule couvre {selected.durationLabel}.</p>
                <div className="schedule-grid">
                  <BookingCalendar value={draft.slotDate} mode={draft.mode} onChange={(slotDate) => update({ slotDate })} />
                  <div className="schedule-side">
                    <label className="booking-field">Heure de début souhaitée
                      <input required type="time" step={60} value={draft.slotTime} aria-invalid={Boolean(timeIssueMessage)} aria-describedby={timeIssueMessage ? 'slot-time-error' : undefined} onChange={(event) => update({ slotTime: event.target.value })} />
                    </label>
                    {timeIssueMessage && <p id="slot-time-error" className="form-error" role="alert">{timeIssueMessage}</p>}
                    {draft.slotDate && draft.slotTime ? (
                      <div className="schedule-recap" role="status"><strong>Votre créneau souhaité</strong><span>{slotLabel(draft, selected)}</span></div>
                    ) : (
                      <p className="schedule-recap schedule-recap-muted">Choisissez un jour dans le calendrier, puis indiquez l’heure qui vous convient.</p>
                    )}
                  </div>
                </div>
              </>) : (
                <p>{selected.durationLabel}. {selected.conditions.join(' ')} Aucun créneau n’est sélectionné à cette étape.</p>
              )}
              <div className="booking-actions">
                <Button variant="outline" onClick={() => update({ step: 0 })}>Changer de formule</Button>
                <Button disabled={Boolean(selected.durationMinutes) && (!draft.slotDate || !draft.slotTime || Boolean(timeIssue) || getDayIssue(draft.slotDate, draft.mode) !== null)} onClick={() => update({ step: 2 })}>Continuer<ArrowRight size={16} aria-hidden="true" /></Button>
              </div>
            </section>
          )}
          {draft.step === 2 && selected && (
            <form className="booking-panel" onSubmit={(event) => { event.preventDefault(); update({ step: 3 }); }}>
              <h2>Vous et votre activité</h2>
              <div className="booking-fields">
                {field('name', 'Nom complet', 'text', 'name')}
                {field('email', 'Adresse e-mail', 'email', 'email')}
                {field('phone', 'Téléphone', 'tel', 'tel')}
                {field('business', 'Nom de votre activité', 'text', 'organization')}
                {field('sector', 'Secteur d’activité')}
                {field('city', 'Ville et pays', 'text', 'address-level2')}
                {draft.mode === 'remote' ? (
                  <>{field('location', 'Lieu de connexion', 'text', 'street-address')}{field('connection', 'Équipement et connexion internet disponibles')}</>
                ) : (
                  <p className="booking-guidance">Votre session se déroule dans les locaux OCD Live au Togo. Prévoyez les produits et supports utiles à votre présentation.</p>
                )}
              </div>
              <div className="booking-actions">
                <Button type="button" variant="outline" onClick={() => update({ step: 1 })}>Retour au calendrier</Button>
                <Button type="submit">Voir mon récapitulatif</Button>
              </div>
            </form>
          )}
          {draft.step >= 3 && selected && (
            <section className="booking-panel">
              <h2>{draft.step === 4 ? 'Les repères de votre projet' : 'Votre sélection'}</h2>
              {draft.step === 4 && <p role="status">Vous avez préparé votre projet de session. Conservez ces informations pour vos échanges avec OCD Live. {selected.price.amount === null ? 'Le tarif et les prestations restent à convenir.' : 'Le créneau reste à convenir avec OCD Live.'}</p>}
              <dl className="booking-summary">
                <div><dt>Formule</dt><dd>{selected.name} · {selected.durationLabel}</dd></div>
                <div><dt>Tarif</dt><dd>{packagePrice(selected)}</dd></div>
                <div><dt>Participation</dt><dd>{modeLabel(draft.mode)}</dd></div>
                <div><dt>Créneau souhaité</dt><dd>{slotLabel(draft, selected) || 'Calendrier à convenir'}</dd></div>
                {(['name', 'email', 'phone', 'business', 'sector', 'city', ...(draft.mode === 'remote' ? ['location', 'connection'] : [])] as (keyof Details)[]).map((key) => (
                  <div key={key}><dt>{{ name: 'Nom', email: 'E-mail', phone: 'Téléphone', business: 'Activité', sector: 'Secteur', city: 'Ville et pays', location: 'Lieu de connexion', connection: 'Équipement et connexion' }[key]}</dt><dd>{draft.details[key]}</dd></div>
                ))}
              </dl>
              <p className="package-conditions">{selected.conditions.join(' ')}</p>
              <div className="booking-actions">
                <Button variant="outline" onClick={() => update({ step: 2 })}><ArrowLeft size={16} aria-hidden="true" />Modifier mes informations</Button>
                {draft.step === 3 ? <Button onClick={() => update({ step: 4 })}>Terminer ma sélection<Check size={16} aria-hidden="true" /></Button> : <Link className="button button-dark" to="/">Revenir à l’accueil</Link>}
              </div>
              <Button variant="ghost" onClick={() => update({ step: 0 })}>Changer de formule</Button>
            </section>
          )}
        </>)}
      </main>
      <footer className="container booking-footer">OCD Live · Votre activité, au premier plan.</footer>
    </div>
  );
}
