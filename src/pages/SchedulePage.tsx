import { useState } from 'react';
import { addMonths, subMonths, startOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import ScheduleGrid from '../components/ScheduleGrid';
import type { Role } from '../domain/types';

const MONTHS_OPTIONS = [1, 3, 6, 12] as const;
type MonthsCount = typeof MONTHS_OPTIONS[number];

const ROLES: Role[] = [
  'Supervisor',
  'Chefe Mecânica',
  'Mecânico',
  'Assistente Mecânico',
  'Coordenador',
  'Outros',
];

export default function SchedulePage() {
  const [startMonth, setStartMonth] = useState(() => startOfMonth(new Date()));
  const [monthsCount, setMonthsCount] = useState<MonthsCount>(3);
  const [searchName, setSearchName] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const monthLabel = format(startMonth, 'MMMM yyyy', { locale: ptBR });
  const capitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--app-bg)' }}>
      {/* Toolbar */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}
      >
        {/* Month navigation */}
        <button
          className="p-1 rounded hover:opacity-70 transition-opacity"
          onClick={() => setStartMonth(m => subMonths(m, 1))}
          style={{ color: 'var(--app-text)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold min-w-[130px] text-center" style={{ color: 'var(--app-text)' }}>
          {capitalized}
        </span>
        <button
          className="p-1 rounded hover:opacity-70 transition-opacity"
          onClick={() => setStartMonth(m => addMonths(m, 1))}
          style={{ color: 'var(--app-text)' }}
        >
          <ChevronRight size={16} />
        </button>

        {/* Months count */}
        <div className="flex items-center gap-1">
          {MONTHS_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setMonthsCount(n)}
              className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
              style={{
                background: monthsCount === n ? 'var(--app-accent)' : 'var(--app-surface-muted)',
                color: monthsCount === n ? '#fff' : 'var(--app-text-muted)',
                border: '1px solid var(--app-border)',
              }}
            >
              {n}M
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-4 w-px" style={{ background: 'var(--app-border)' }} />

        {/* Search */}
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2 pointer-events-none" style={{ color: 'var(--app-text-faint)' }} />
          <input
            type="text"
            placeholder="Buscar colaborador…"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="pl-7 pr-2 py-1 rounded-md border text-xs focus:outline-none focus:ring-1"
            style={{
              width: 170,
              background: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
              ['--tw-ring-color' as string]: 'var(--app-accent)',
            }}
          />
        </div>

        {/* Role filter */}
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1"
          style={{
            background: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
            ['--tw-ring-color' as string]: 'var(--app-accent)',
          }}
        >
          <option value="">Todas as funções</option>
          {ROLES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        <ScheduleGrid
          startMonth={startMonth}
          monthsCount={monthsCount}
          searchName={searchName}
          filterRole={filterRole}
        />
      </div>
    </div>
  );
}
