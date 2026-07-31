import { useMemo } from 'react';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer } from 'lucide-react';
import { useData } from '../data/DataProvider';
import { resolveDayStatus, isOnboardStatus } from '../domain';
import Button from '../components/ui/Button';

export default function RelatoriosPage() {
  const { collaborators, turmas, events, vacations, trainings } = useData();

  const today = new Date();
  const monthStr = format(today, 'MMMM yyyy', { locale: ptBR });

  const activeColabs = collaborators.filter(c => c.active !== false);

  /* POB today */
  const todayStr = format(today, 'yyyy-MM-dd');
  const pobToday = useMemo(() => {
    return activeColabs.filter(colab => {
      const turma = turmas.find(t => t.id === colab.turmaId) ?? null;
      const colabEvents = events.filter(e => e.collaboratorId === colab.id);
      const { status } = resolveDayStatus(todayStr, colab, turma, colabEvents);
      return isOnboardStatus(status);
    }).length;
  }, [activeColabs, turmas, events, todayStr]);

  /* Current month stats */
  const monthDays = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });

  const monthStats = useMemo(() => {
    let totalEscala = 0, totalDobra = 0, totalFerias = 0;
    for (const colab of activeColabs) {
      const turma = turmas.find(t => t.id === colab.turmaId) ?? null;
      const colabEvents = events.filter(e => e.collaboratorId === colab.id);
      for (const d of monthDays) {
        const ds = format(d, 'yyyy-MM-dd');
        const { status } = resolveDayStatus(ds, colab, turma, colabEvents);
        if (status === 'Escala') totalEscala++;
        else if (status === 'Dobra') totalDobra++;
        else if (status === 'Férias') totalFerias++;
      }
    }
    return { totalEscala, totalDobra, totalFerias };
  }, [activeColabs, turmas, events, monthDays]);

  /* Trainings expiring in 90 days */
  const expiringTrainings = trainings.filter(t => {
    const days = differenceInDays(parseISO(t.expiryDate), today);
    return days >= 0 && days <= 90;
  });

  const expiredTrainings = trainings.filter(t => {
    return differenceInDays(parseISO(t.expiryDate), today) < 0;
  });

  /* Confirmed vacations */
  const confirmedVacations = vacations.filter(v => v.status === 'confirmed');
  const draftVacations = vacations.filter(v => v.status === 'draft');

  const CARD_STYLE: React.CSSProperties = {
    background: 'var(--app-surface)',
    border: '1px solid var(--app-border)',
    borderRadius: 10,
    padding: '16px 20px',
  };

  return (
    <div className="h-full overflow-y-auto p-4" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--app-text)' }}>Relatórios</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
              Atualizado em {format(today, "dd/MM/yyyy 'às' HH:mm")}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Colaboradores Ativos', value: activeColabs.length, color: 'var(--status-escala)' },
            { label: 'POB Hoje', value: pobToday, color: 'var(--status-dobra)' },
            { label: 'Férias Confirmadas', value: confirmedVacations.length, color: 'var(--status-ferias)' },
            { label: 'Certs. Vencendo', value: expiringTrainings.length, color: 'var(--status-exame)' },
          ].map(card => (
            <div key={card.label} style={CARD_STYLE}>
              <p className="text-2xl font-bold font-display" style={{ color: card.color }}>{card.value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>{card.label}</p>
            </div>
          ))}
        </div>

        {/* Month stats */}
        <div style={CARD_STYLE}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--app-text)' }}>
            Resumo — {monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--status-escala)' }}>{monthStats.totalEscala}</p>
              <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>Dias/Pessoa em Escala</p>
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--status-dobra)' }}>{monthStats.totalDobra}</p>
              <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>Dias/Pessoa em Dobra</p>
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--status-ferias)' }}>{monthStats.totalFerias}</p>
              <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>Dias/Pessoa em Férias</p>
            </div>
          </div>
        </div>

        {/* Vacation plans */}
        {(confirmedVacations.length > 0 || draftVacations.length > 0) && (
          <div style={CARD_STYLE}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--app-text)' }}>Programação de Férias</h2>
            <div className="flex flex-col gap-1">
              {[...confirmedVacations, ...draftVacations].map(v => {
                const colab = collaborators.find(c => c.id === v.collaboratorId);
                return (
                  <div key={v.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-xs" style={{ borderColor: 'var(--app-border)' }}>
                    <span style={{ color: 'var(--app-text)' }}>{colab?.name ?? v.collaboratorId}</span>
                    <span style={{ color: 'var(--app-text-muted)' }}>
                      {format(parseISO(v.startDate), 'dd/MM/yy')} → {format(parseISO(v.endDate), 'dd/MM/yy')}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: v.status === 'confirmed' ? 'rgba(2,132,199,0.15)' : 'rgba(148,163,184,0.15)',
                        color: v.status === 'confirmed' ? 'var(--status-ferias)' : 'var(--app-text-faint)',
                      }}
                    >
                      {v.status === 'confirmed' ? 'Confirmado' : 'Rascunho'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expiring certs */}
        {(expiringTrainings.length > 0 || expiredTrainings.length > 0) && (
          <div style={CARD_STYLE}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--app-text)' }}>
              Certificações — Atenção Necessária
            </h2>
            <div className="flex flex-col gap-1">
              {[...expiredTrainings, ...expiringTrainings].map(t => {
                const colab = collaborators.find(c => c.id === t.collaboratorId);
                const days = differenceInDays(parseISO(t.expiryDate), today);
                const isExp = days < 0;
                return (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-xs" style={{ borderColor: 'var(--app-border)' }}>
                    <span style={{ color: 'var(--app-text)' }}>{colab?.name ?? '?'} — {t.courseName}</span>
                    <span style={{ color: isExp ? 'var(--app-danger)' : 'var(--status-dobra)' }}>
                      {isExp ? `Venceu ${Math.abs(days)}d atrás` : `Vence em ${days}d`}
                    </span>
                    <span style={{ color: 'var(--app-text-muted)' }}>{format(parseISO(t.expiryDate), 'dd/MM/yyyy')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
