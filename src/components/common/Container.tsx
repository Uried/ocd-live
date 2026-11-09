import type { ComponentProps } from 'react';
import { cn } from '../../utils/cn';

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('container', className)} {...props} />;
}
