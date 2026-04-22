import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center h-5 group',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        'relative h-[3px] w-full grow overflow-hidden rounded-full',
        'bg-[var(--bg-panel-active)]'
      )}
    >
      <SliderPrimitive.Range className="absolute h-full bg-[var(--text-secondary)] group-hover:bg-[var(--text-primary)] transition-colors" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'block h-4 w-4 rounded-full',
        'bg-[var(--text-primary)] border border-[var(--border-strong)]',
        'transition-[transform,border-color] duration-base ease-soft-spring',
        'hover:border-[var(--accent)] hover:scale-110',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-panel)]',
        'disabled:pointer-events-none disabled:opacity-50'
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
