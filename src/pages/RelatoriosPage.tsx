import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { format } from 'date-fns';
import { BarChart3, Printer, Users, Palmtree, Sparkles, ShieldCheck, Layers } from 'lucide-react';
import {
  EmptyTableRow,
  MetricCard,
  PageHeader,
  PageShell,
  SectionSurface,
  TableHead,
} from '../components/ui/PageChrome';

export default function RelatoriosPage() {
  const { collaborators, events, vacations, turmas, trainings } = useData();
  const [selectedTurma, setSelectedTurma] = useState<string>('all');

  const filteredColabs = collaborators.filter(
    (c) => selectedTurma === 'all' || c.turmaId === selectedTurma,
  );

  const dobrasCount = events.filter((e) => e.status === 'Dobra').length;
  const confirmedVacationsCount = vacations.filter((v) => v.status === 'confirmed').length;
  const activeColabsCount = collaborators.filter((c) => c.active).length;

  return (
    <PageShell wide className="print:max-w-none print:p-0">
      <PageHeader
        title="Relatórios"
        description="Resumo operacional da equipe, dobras, férias e certificações."
        icon={<BarChart3 className="size-5" />}
        actions={
          <Button onClick={() => window.print()} className="w-full gap-2 print:hidden sm:w-auto">
            <Printer className="size-4" />
            Imprimir
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 print:grid-cols-4">
        <MetricCard label="Efetivo ativo" value={activeColabsCount} hint="No catálogo" icon={<Users className="size-5" />} />
        <MetricCard label="Turmas" value={turmas.length} hint="Embarque" icon={<Layers className="size-5" />} />
        <MetricCard label="Dobras" value={dobrasCount} hint="Cadastradas" icon={<Sparkles className="size-5" />} />
        <MetricCard
          label="Férias"
          value={confirmedVacationsCount}
          hint="Confirmadas"
          icon={<Palmtree className="size-5" />}
        />
      </div>

      <SectionSurface className="print:hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[12px] font-semibold text-[var(--app-text)]">Filtrar por turma</span>
          <Select
            value={selectedTurma}
            onChange={(e) => setSelectedTurma(e.target.value)}
            className="w-full text-xs sm:w-48"
          >
            <option value="all">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                Turma {t.name}
              </option>
            ))}
          </Select>
        </div>
      </SectionSurface>

      <SectionSurface
        title="Por colaborador"
        subtitle={`Atualizado em ${format(new Date(), 'dd/MM/yyyy')}`}
        actions={<ShieldCheck className="size-4 text-[var(--app-accent)]" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <TableHead>
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Dobras</th>
                <th className="px-4 py-3 text-center">Férias</th>
                <th className="px-4 py-3 text-center">Certificados</th>
              </tr>
            </TableHead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {filteredColabs.length === 0 ? (
                <EmptyTableRow colSpan={7} title="Nenhum colaborador cadastrado." />
              ) : (
                filteredColabs.map((colab) => {
                  const turma = turmas.find((t) => t.id === colab.turmaId);
                  const colabDobras = events.filter(
                    (e) => e.collaboratorId === colab.id && e.status === 'Dobra',
                  ).length;
                  const colabVacations = vacations.filter((v) => v.collaboratorId === colab.id).length;
                  const colabTrainings = trainings.filter((t) => t.collaboratorId === colab.id).length;

                  return (
                    <tr key={colab.id} className="hover:bg-[var(--app-surface-muted)]">
                      <td className="px-4 py-3 font-semibold text-[var(--app-text)]">{colab.name}</td>
                      <td className="px-4 py-3 text-[var(--app-text-muted)]">{colab.role}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-[var(--app-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--app-accent)]">
                          {turma?.name || 'Sem turma'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {colab.active ? (
                          <span className="text-teal-700 dark:text-teal-300">Ativo</span>
                        ) : (
                          <span className="text-[var(--app-text-faint)]">Inativo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[var(--status-dobra)]">
                        {colabDobras}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[var(--status-ferias)]">
                        {colabVacations}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[var(--status-exame)]">
                        {colabTrainings}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionSurface>
    </PageShell>
  );
}
