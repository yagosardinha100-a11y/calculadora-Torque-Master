import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-8 px-2.5 text-[12px]',
  md: 'h-9 px-3.5 text-[13px]',
  lg: 'h-11 px-5 text-[14px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', style, ...props }, ref) => {
    const variantClass =
      variant === 'primary'
        ? 'bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)]'
        : variant === 'danger'
          ? 'bg-[var(--app-danger)] text-white hover:opacity-90'
          : variant === 'secondary'
            ? 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]'
            : 'text-[var(--app-text-muted)] hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-text)]';

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          sizes[size],
          variantClass,
          className,
        )}
        style={style}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
export default Button;
