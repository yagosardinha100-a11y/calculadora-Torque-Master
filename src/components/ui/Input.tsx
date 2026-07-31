import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium" style={{ color: 'var(--app-text-muted)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-md border px-3 py-1.5 text-sm transition-colors placeholder:text-[var(--app-text-faint)] focus:outline-none focus:ring-2',
            error ? 'border-[var(--app-danger)]' : 'border-[var(--app-border)]',
            className
          )}
          style={{
            background: 'var(--app-surface)',
            color: 'var(--app-text)',
            ['--tw-ring-color' as string]: 'var(--app-accent)',
          }}
          {...props}
        />
        {error && <p className="text-xs" style={{ color: 'var(--app-danger)' }}>{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
export default Input;
