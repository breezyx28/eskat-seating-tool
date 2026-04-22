import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
  Two label flavors:

  - default: small sentence-case ("Rotation") used for inline controls
  - mono:    uppercase Geist Mono with the +0.12em tracking from DESIGN.md §3,
             used as the "developer console" group marker on sidebar panels
*/
const labelVariants = cva(
  'leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      tone: {
        default: 'text-xs font-medium text-[var(--text-secondary)]',
        mono: 'mono-label',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  }
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, tone, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants({ tone }), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
