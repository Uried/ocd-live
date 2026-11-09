import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva('button', {
  variants: {
    variant: {
      default: 'button-dark',
      accent: 'button-accent',
      outline: 'button-outline',
      light: 'button-light',
      ghost: 'button-ghost',
    },
    size: { default: '', small: 'button-small', icon: 'button-icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant, size }), className)} type={asChild ? undefined : (type ?? 'button')} {...props} />;
}
