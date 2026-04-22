import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: [
            'group toast',
            'group-[.toaster]:bg-[var(--bg-panel-raised)]',
            'group-[.toaster]:text-[var(--text-primary)]',
            'group-[.toaster]:border-[var(--border-strong)]',
            'group-[.toaster]:rounded-md',
            'group-[.toaster]:shadow-none',
          ].join(' '),
          description: 'group-[.toast]:text-[var(--text-secondary)]',
          actionButton:
            'group-[.toast]:bg-[var(--accent)] group-[.toast]:text-[#0f0f0f] group-[.toast]:rounded-sm',
          cancelButton:
            'group-[.toast]:bg-[var(--bg-panel-hover)] group-[.toast]:text-[var(--text-secondary)] group-[.toast]:rounded-sm',
          success: 'group-[.toast]:border-[var(--accent-border)]',
          error: 'group-[.toast]:border-[rgba(229,72,77,0.32)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
