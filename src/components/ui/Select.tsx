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
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium" style={{ color: 'var(--app-text-muted)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2',
            error ? 'border-[var(--app-danger)]' : 'border-[var(--app-border)]',
            className
          )}
          style={{
            background: 'var(--app-surface)',
            color: 'var(--app-text)',
            ['--tw-ring-color' as string]: 'var(--app-accent)',
          }}
          {...props}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs" style={{ color: 'var(--app-danger)' }}>{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
export default Select;
