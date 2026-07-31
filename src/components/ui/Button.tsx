import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center font-semibold transition-all select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          {
            'bg-[var(--app-accent)] text-white shadow-sm hover:bg-[var(--app-accent-hover)]':
              variant === 'primary',
            'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]':
              variant === 'secondary',
            'bg-[var(--app-danger)] text-white shadow-sm hover:opacity-90': variant === 'danger',
            'text-[var(--app-text-muted)] hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-text)]':
              variant === 'ghost',
            'border border-[var(--app-border-strong)] bg-transparent text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]':
              variant === 'outline',
            'h-8 rounded-lg px-3 text-xs': size === 'sm',
            'h-10 rounded-xl px-4 text-sm': size === 'md',
            'h-12 rounded-xl px-8 text-base': size === 'lg',
            'size-10 rounded-xl p-0': size === 'icon',
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
