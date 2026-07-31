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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[12px] font-semibold text-[var(--app-text-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-text)] transition placeholder:text-[var(--app-text-faint)] focus:ring-1 focus:ring-[var(--app-accent)] focus:outline-none',
            error && 'border-[var(--app-danger)]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-[12px] text-[var(--app-danger)]">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
export default Input;
