import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Pill-shaped segmented control on the raised surface. Border defines
      // the edge — no shadow.
      'inline-flex h-8 items-center justify-center rounded-pill border border-[var(--border)]',
      'bg-[var(--bg-panel)] p-[3px] text-[var(--text-muted)]',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
      'rounded-pill px-3 h-[24px] text-[12px] font-medium tracking-tight',
      'transition-colors duration-base ease-soft-spring',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]',
      'disabled:pointer-events-none disabled:opacity-40',
      // Active: raised surface with emphasis border — the brand identity
      // marker ("this tab is alive") without overusing the emerald color.
      'data-[state=active]:bg-[var(--bg-panel-raised)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border data-[state=active]:border-[var(--border-strong)]',
      'data-[state=inactive]:hover:text-[var(--text-primary)]',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-3 focus-visible:outline-none',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
