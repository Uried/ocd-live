import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { BookingMode } from '../../types/booking';
import { useHomeContent } from '../../hooks/useHomeContent';
import { PublicLayout } from '../../layouts/PublicLayout';
import { BookingDialog } from '../../components/common/BookingDialog';
import { Button } from '../../components/ui/button';
import { Hero } from './home/Hero';
import { Participation } from './home/Participation';
import { HowItWorks } from './home/HowItWorks';
import { Services } from './home/Services';
import { FAQ } from './home/FAQ';
import { ClosingCTA } from './home/ClosingCTA';

export function HomePage() {
  const { state, retry } = useHomeContent();
  const [booking, setBooking] = useState<{ open: boolean; mode: BookingMode | null }>({ open: false, mode: null });
  const bookingTrigger = useRef<HTMLElement | null>(null);
  const { hash } = useLocation();
  useEffect(() => {
    if (state.status === 'ready' && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  }, [hash, state.status]);
  const openBooking = (mode: BookingMode | null = null) => {
    bookingTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setBooking({ open: true, mode });
  };
  const returnFocus = () => {
    const target = bookingTrigger.current?.isConnected ? bookingTrigger.current : document.getElementById('mobile-menu-trigger');
    target?.focus({ preventScroll: true });
  };
  if (state.status === 'loading') return <main className="page-state" aria-busy="true"><span className="loading-mark" aria-hidden="true" /><p role="status">OCD Live · Préparation de votre expérience…</p></main>;
  if (state.status === 'error') return <main className="page-state"><h1>Une petite interruption.</h1><p role="alert">Le contenu n’a pas pu être chargé.</p><Button onClick={retry}>Réessayer</Button></main>;
  const { content } = state;
  return <><PublicLayout content={content} onBook={() => openBooking()}><Hero content={content.hero} onBook={openBooking} /><Participation modes={content.modes} onBook={openBooking} /><HowItWorks steps={content.steps} /><Services services={content.services} /><FAQ items={content.faq} /><ClosingCTA onBook={() => openBooking()} /></PublicLayout><BookingDialog open={booking.open} mode={booking.mode} onReturnFocus={returnFocus} onOpenChange={(open) => setBooking((previous) => ({ ...previous, open }))} /></>;
}
