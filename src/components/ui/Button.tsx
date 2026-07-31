import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:  'text-white',
  secondary:'border',
  ghost:    '',
  danger:   'text-white',
};

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', style, ...props }, ref) => {
    const styleMap: React.CSSProperties =
      variant === 'primary'
        ? { background: 'var(--app-accent)', '--tw-ring-color': 'var(--app-accent)' } as React.CSSProperties
        : variant === 'danger'
        ? { background: 'var(--app-danger)', '--tw-ring-color': 'var(--app-danger)' } as React.CSSProperties
        : variant === 'secondary'
        ? { borderColor: 'var(--app-border)', color: 'var(--app-text)', background: 'var(--app-surface)' }
        : { color: 'var(--app-text)' };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        style={{ ...styleMap, ...style }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
export default Button;
