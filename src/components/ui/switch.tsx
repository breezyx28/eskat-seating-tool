import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      'peer inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full',
      'border border-[var(--border)]',
      'transition-colors duration-base ease-soft-spring',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      // Off: subtle dark track. On: emerald fill.
      'data-[state=unchecked]:bg-[var(--bg-panel-active)]',
      'data-[state=checked]:bg-[var(--accent)] data-[state=checked]:border-[var(--accent)]',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-3 w-3 rounded-full',
        'bg-[var(--text-primary)]',
        'transition-transform duration-base ease-soft-spring',
        'data-[state=checked]:translate-x-[15px] data-[state=checked]:bg-[#0f0f0f]',
        'data-[state=unchecked]:translate-x-[1px]'
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
