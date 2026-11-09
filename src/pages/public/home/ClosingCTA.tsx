import { ArrowUpRight, AudioLines } from 'lucide-react';
import { Container } from '../../../components/common/Container';
import { Button } from '../../../components/ui/button';

export function ClosingCTA({ onBook }: { onBook: () => void }) {
  return <section className="closing-cta" aria-labelledby="cta-title"><Container><div className="cta-top"><p className="eyebrow">LE PROCHAIN LIVE POURRAIT ÊTRE LE VÔTRE.</p><AudioLines size={29} strokeWidth={1.5} aria-hidden="true" /></div><div className="cta-main"><h2 id="cta-title">On vous donne<br />la parole<span>.</span></h2><div><p>Votre activité a une histoire.<br />Faisons-lui une place à l’écran.</p><Button variant="accent" onClick={onBook}>Réserver un live <ArrowUpRight size={21} aria-hidden="true" /></Button><span className="cta-note">Au studio au Togo ou depuis votre commerce.</span></div></div></Container></section>;
}
