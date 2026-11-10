import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Banknote, BadgeCheck, CalendarDays, CalendarRange, Clock, Coins, Compass, Gem, Handshake, Hourglass, MapPin, MessageCircleQuestion, MonitorSmartphone, Presentation, RotateCcw, ShoppingBag, Shuffle, Sparkles, Timer, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { bookingRepository, contentRepository } from '../../services/repositories';
import { advisorQuestions, packagePriceLabel, recommendPackage } from '../../services/advisor';
import type { AdvisorAnswers } from '../../services/advisor';
import type { BookingPackage } from '../../types/booking';
import type { NavigationItem } from '../../types/content';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/button';
import '../../styles/advisor.css';

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles, 'shopping-bag': ShoppingBag, presentation: Presentation, 'calendar-range': CalendarRange,
  compass: Compass, 'map-pin': MapPin, 'monitor-smartphone': MonitorSmartphone, shuffle: Shuffle, timer: Timer,
  clock: Clock, hourglass: Hourglass, 'calendar-days': CalendarDays, 'message-circle-question': MessageCircleQuestion,
  coins: Coins, wallet: Wallet, banknote: Banknote, gem: Gem, handshake: Handshake, 'badge-check': BadgeCheck,
};

const resultStep = advisorQuestions.length;

export function AdvisorPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<AdvisorAnswers>>({});
  const [packages, setPackages] = useState<BookingPackage[]>([]);
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.all([bookingRepository.getPackages('in-person'), bookingRepository.getPackages('remote')]).then(
      ([inPerson, remote]) => {
        if (!active) return;
        const unique = new Map<string, BookingPackage>();
        [...inPerson, ...remote].forEach((item) => unique.set(item.id, item));
        setPackages([...unique.values()]);
        setStatus('ready');
      },
      () => { if (active) setStatus('error'); },
    );
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    let active = true;
    contentRepository.getHome().then((content) => { if (active) setNavigation(content.navigation); });
    return () => { active = false; };
  }, []);
  useEffect(() => { heading.current?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }); }, [step]);

  const question = advisorQuestions[step];
  const complete = advisorQuestions.every((item) => answers[item.id]);
  const recommendation = useMemo(
    () => complete ? recommendPackage(answers as AdvisorAnswers, packages) : null,
    [answers, packages, complete],
  );
  const reset = () => { setAnswers({}); setStep(0); };
  const bookingParams = new URLSearchParams();
  if (recommendation?.mode) bookingParams.set('mode', recommendation.mode);
  if (recommendation) bookingParams.set('formule', recommendation.package.id);
  const catalogUrl = recommendation?.mode ? `/reservation?mode=${recommendation.mode}` : '/reservation';
  const modeText = recommendation ? (recommendation.mode === 'remote' ? 'À distance' : recommendation.mode === 'in-person' ? 'Au studio OCD Live' : 'Au studio ou à distance') : '';

  return (
    <div className="advisor-page">
      <a className="skip-link" href="#advisor-main">Aller au contenu</a>
      <Header navigation={navigation} onBook={() => navigate('/reservation')} />
      <main id="advisor-main" className="container" tabIndex={-1}>
        <div className="booking-heading advisor-heading">
          <p className="eyebrow">OCD LIVE · VOTRE CONSEILLER</p>
          <h1>Trouvons la formule qui vous ressemble.</h1>
          <p>Quatre questions, une recommandation claire — comme un échange avec notre équipe.</p>
        </div>
        {status === 'loading' ? <p role="status">Chargement des formules…</p> : status === 'error' ? (
          <div role="alert"><p>Les formules n’ont pas pu être chargées.</p><Button onClick={() => setAttempt((value) => value + 1)}>Réessayer</Button></div>
        ) : (
          <div className="advisor-panel">
            <ol className="advisor-progress" aria-label={step < resultStep ? `Question ${step + 1} sur ${resultStep}` : 'Recommandation'}>
              {advisorQuestions.map((item, index) => (
                <li key={item.id} data-done={index < step || step >= resultStep || undefined} aria-current={index === step ? 'step' : undefined} />
              ))}
            </ol>
            {question && step < resultStep ? (
              <div className="advisor-step" key={step}>
                <h2 id="advisor-question-title" ref={heading} tabIndex={-1} className="advisor-question">{question.title}</h2>
                <div className="advisor-options" role="radiogroup" aria-labelledby="advisor-question-title">
                  {question.options.map((option) => {
                    const Icon = ICONS[option.icon] ?? Compass;
                    return (
                      <label className="advisor-option" key={option.value}>
                        <input type="radio" name={question.id} value={option.value} checked={answers[question.id] === option.value} onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: option.value }))} />
                        <Icon size={21} aria-hidden="true" />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="advisor-actions">
                  <Button variant="ghost" onClick={reset}><RotateCcw size={16} aria-hidden="true" />Recommencer</Button>
                  <div className="advisor-actions-nav">
                    {step > 0 && <Button variant="outline" onClick={() => setStep((value) => value - 1)}><ArrowLeft size={16} aria-hidden="true" />Retour</Button>}
                    <Button variant="accent" disabled={!answers[question.id]} onClick={() => setStep((value) => value + 1)}>{step === resultStep - 1 ? 'Voir ma recommandation' : 'Continuer'}<ArrowRight size={16} aria-hidden="true" /></Button>
                  </div>
                </div>
              </div>
            ) : (
              <section className="advisor-step advisor-result" aria-labelledby="advisor-result-title">
                <div className="result-check"><BadgeCheck size={22} aria-hidden="true" /></div>
                {recommendation ? (<>
                  <p className="eyebrow advisor-result-eyebrow">{recommendation.fallback ? 'UN PROJET SUR MESURE' : 'NOTRE RECOMMANDATION'}</p>
                  <h2 id="advisor-result-title" ref={heading} tabIndex={-1}>{recommendation.package.name}</h2>
                  <p className="advisor-result-price">{packagePriceLabel(recommendation.package)}</p>
                  <ul className="advisor-result-facts">
                    <li><Clock size={16} aria-hidden="true" />{recommendation.package.durationLabel}</li>
                    <li>{recommendation.mode === 'remote' ? <MonitorSmartphone size={16} aria-hidden="true" /> : recommendation.mode === 'in-person' ? <MapPin size={16} aria-hidden="true" /> : <Shuffle size={16} aria-hidden="true" />}{modeText}</li>
                  </ul>
                  <p className="advisor-result-reason">{recommendation.reason}</p>
                  <div className="advisor-actions">
                    <Button variant="ghost" onClick={reset}><RotateCcw size={16} aria-hidden="true" />Recommencer</Button>
                    <div className="advisor-actions-nav">
                      <Link className="button button-outline" to={catalogUrl}>Voir toutes les formules</Link>
                      <Link className="button button-accent" to={`/reservation?${bookingParams.toString()}`}>Choisir cette formule<ArrowRight size={16} aria-hidden="true" /></Link>
                    </div>
                  </div>
                </>) : (<>
                  <p className="eyebrow advisor-result-eyebrow">UN PROJET SUR MESURE</p>
                  <h2 id="advisor-result-title" ref={heading} tabIndex={-1}>Votre projet mérite un échange.</h2>
                  <p className="advisor-result-reason">Vos réponses décrivent un besoin particulier. Le plus simple est de parcourir les formules, puis d’en parler avec l’équipe OCD Live.</p>
                  <div className="advisor-actions">
                    <Button variant="ghost" onClick={reset}><RotateCcw size={16} aria-hidden="true" />Recommencer</Button>
                    <div className="advisor-actions-nav">
                      <Link className="button button-outline" to={catalogUrl}>Voir toutes les formules</Link>
                    </div>
                  </div>
                </>)}
              </section>
            )}
          </div>
        )}
      </main>
      <footer className="container booking-footer">OCD Live · Votre activité, au premier plan.</footer>
    </div>
  );
}
