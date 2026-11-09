import type { ComponentProps } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Plus } from 'lucide-react';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem(props: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className="accordion-item" {...props} />;
}

export function AccordionTrigger({ children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger className="accordion-trigger" {...props}>
        <span>{children}</span><Plus size={20} aria-hidden="true" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent(props: ComponentProps<typeof AccordionPrimitive.Content>) {
  return <AccordionPrimitive.Content className="accordion-content" {...props} />;
}
