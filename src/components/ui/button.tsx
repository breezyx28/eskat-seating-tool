import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
  Button system — Supabase-inspired (see DESIGN.md §4).

  - primary  → solid-dark pill (9999px) for main CTAs only: Export, Generate, Save-in-dialog.
  - brand    → emerald-tinted pill for the single in-app identity CTA. Reserved for
               "Export as React Component" and the restore-session dialog's confirm.
  - secondary → muted dark pill (9999px) used as the neutral companion to a primary.
  - outline  → 6px radius bordered button for sidebar / tertiary actions.
  - soft     → 6px radius low-contrast filled button for tool rows (e.g. shape picker).
  - ghost    → transparent hover-tinted button for icon-only actions in the toolbar.
  - destructive → 6px radius warm-tomato button for irreversible actions.
  - link     → inline text link; emerald, underline on hover.

  Press tactility: every variant gets a 1px downward translate on :active so the
  interaction feels physical without depending on framer-motion.
*/
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'text-sm font-medium',
    'transition-[background-color,border-color,color,opacity,transform] duration-base ease-soft-spring',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-panel)]',
    'disabled:pointer-events-none disabled:opacity-40',
    'active:translate-y-[1px]',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        // default === primary: keeps back-compat with existing <Button> usages
        default: [
          'rounded-pill border border-[var(--text-primary)]',
          'bg-[#0f0f0f] text-[var(--text-primary)]',
          'hover:bg-[#1a1a1a]',
        ].join(' '),
        primary: [
          'rounded-pill border border-[var(--text-primary)]',
          'bg-[#0f0f0f] text-[var(--text-primary)]',
          'hover:bg-[#1a1a1a]',
        ].join(' '),
        brand: [
          'rounded-pill border border-[var(--accent-border)]',
          'bg-[var(--accent)] text-[#0f0f0f]',
          'hover:bg-[var(--accent-hover)]',
        ].join(' '),
        secondary: [
          'rounded-pill border border-[var(--border)]',
          'bg-[var(--bg-panel-raised)] text-[var(--text-primary)]',
          'hover:bg-[var(--bg-panel-hover)] hover:border-[var(--border-strong)]',
        ].join(' '),
        outline: [
          'rounded-sm border border-[var(--border)]',
          'bg-transparent text-[var(--text-primary)]',
          'hover:bg-[var(--bg-panel-hover)] hover:border-[var(--border-strong)]',
        ].join(' '),
        soft: [
          'rounded-sm border border-transparent',
          'bg-[var(--bg-panel-raised)] text-[var(--text-primary)]',
          'hover:bg-[var(--bg-panel-hover)] hover:border-[var(--border)]',
        ].join(' '),
        ghost: [
          'rounded-sm border border-transparent',
          'bg-transparent text-[var(--text-secondary)]',
          'hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]',
        ].join(' '),
        destructive: [
          'rounded-sm border border-transparent',
          'bg-[var(--danger-soft)] text-[var(--danger)]',
          'hover:bg-[var(--danger)] hover:text-[var(--text-primary)]',
        ].join(' '),
        link: [
          'rounded-none border-0 bg-transparent p-0 h-auto',
          'text-[var(--accent-strong)] hover:text-[var(--accent)]',
          'underline-offset-4 hover:underline',
        ].join(' '),
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        xl: 'h-11 px-8',
        icon: 'h-8 w-8',
        'icon-sm': 'h-7 w-7',
      },
    },
    compoundVariants: [
      // Primary / default / brand / secondary want a slightly wider horizontal
      // padding to earn the pill silhouette — never below 24px total.
      { variant: 'default', size: 'default', class: 'px-6' },
      { variant: 'primary', size: 'default', class: 'px-6' },
      { variant: 'brand', size: 'default', class: 'px-6' },
      { variant: 'secondary', size: 'default', class: 'px-6' },
      { variant: 'default', size: 'sm', class: 'px-5' },
      { variant: 'primary', size: 'sm', class: 'px-5' },
      { variant: 'brand', size: 'sm', class: 'px-5' },
      { variant: 'secondary', size: 'sm', class: 'px-5' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
