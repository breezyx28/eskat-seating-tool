import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Geist',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'Geist Mono',
          'JetBrains Mono',
          'Source Code Pro',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      colors: {
        border: 'hsl(var(--border-hsl))',
        input: 'hsl(var(--border-hsl))',
        ring: 'hsl(var(--accent-hsl))',
        background: 'hsl(var(--bg-app-hsl))',
        foreground: 'hsl(var(--text-primary-hsl))',
        primary: {
          DEFAULT: 'hsl(var(--accent-hsl))',
          foreground: '#0f0f0f',
        },
        secondary: {
          DEFAULT: 'hsl(var(--bg-panel-hover-hsl))',
          foreground: 'hsl(var(--text-primary-hsl))',
        },
        destructive: {
          DEFAULT: 'hsl(358 75% 59%)',
          foreground: 'hsl(var(--text-primary-hsl))',
        },
        muted: {
          DEFAULT: 'hsl(var(--bg-panel-hover-hsl))',
          foreground: 'hsl(var(--text-secondary-hsl))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent-hsl))',
          foreground: '#0f0f0f',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          strong: 'var(--accent-strong)',
        },
        popover: {
          DEFAULT: 'var(--bg-panel-raised)',
          foreground: 'hsl(var(--text-primary-hsl))',
        },
        card: {
          DEFAULT: 'var(--bg-panel-raised)',
          foreground: 'hsl(var(--text-primary-hsl))',
        },
        panel: {
          DEFAULT: 'var(--bg-panel)',
          raised: 'var(--bg-panel-raised)',
          hover: 'var(--bg-panel-hover)',
          active: 'var(--bg-panel-active)',
        },
        line: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
          emphasis: 'var(--border-emphasis)',
        },
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      transitionTimingFunction: {
        'soft-spring': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '150ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 150ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
