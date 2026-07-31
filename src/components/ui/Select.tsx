import React from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[12px] font-semibold text-[var(--app-text-muted)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-10 w-full cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-text)] focus:ring-1 focus:ring-[var(--app-accent)] focus:outline-none',
            error && 'border-[var(--app-danger)]',
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[12px] text-[var(--app-danger)]">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
export default Select;
