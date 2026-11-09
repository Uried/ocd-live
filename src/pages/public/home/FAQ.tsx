import type { HomeContent } from '../../../types/content';
import { Container } from '../../../components/common/Container';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';

export function FAQ({ items }: { items: HomeContent['faq'] }) {
  return <section id="faq" className="faq section-space" aria-labelledby="faq-title"><Container className="faq-grid"><div><p className="eyebrow">AVANT DE VOUS LANCER</p><h2 id="faq-title">Parlons-en<br />simplement.</h2><p className="faq-intro">Les réponses aux premières questions<br />que vous vous posez.</p></div><Accordion type="single" collapsible className="faq-list">{items.map((item) => <AccordionItem value={item.id} key={item.id}><AccordionTrigger>{item.question}</AccordionTrigger><AccordionContent><p>{item.answer}</p></AccordionContent></AccordionItem>)}</Accordion></Container></section>;
}
