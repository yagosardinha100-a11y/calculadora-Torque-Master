import { useState, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { Plus, Trash2, Calendar, Search, Users, Sparkles, Filter, ShieldCheck } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { Status } from '../types';
import { GenericPageSkeleton } from '../components/ui/Skeleton';
import {
  EmptyTableRow,
  FieldLabel,
  MetricCard,
  ModalShell,
  PageHeader,
  PageShell,
  SectionSurface,
  TableHead,
} from '../components/ui/PageChrome';

export default function DobrasPage() {
  const { collaborators, events: allEvents, turmas, loading, addEvent, deleteEvent } = useData();

  if (loading) return <GenericPageSkeleton />;

  const events = allEvents.filter((e) => e.status === 'Dobra');

  const [search, setSearch] = useState('');
  const [selectedColabId, setSelectedColabId] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formColabId, setFormColabId] = useState('');
  const [formStartDate, setFormStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formEndDate, setFormEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formMotive, setFormMotive] = useState('');
  const [formNote, setFormNote] = useState('');

  const handleAddDobra = async (e: FormEvent) => {
    e.preventDefault();
    if (!formColabId || !formStartDate || !formEndDate) return;

    try {
      await addEvent({
        collaboratorId: formColabId,
        startDate: formStartDate,
        endDate: formEndDate,
        status: 'Dobra' as Status,
        motive: formMotive || 'Dobra de cobertura',
        note: formNote,
      });

      setShowAddModal(false);
      setFormMotive('');
      setFormNote('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível lançar a dobra.');
    }
  };

  const filteredEvents = events.filter((evt) => {
    const colab = collaborators.find((c) => c.id === evt.collaboratorId);
    const colabName = colab ? colab.name.toLowerCase() : '';
    const matchesSearch =
      colabName.includes(search.toLowerCase()) ||
      (evt.motive || '').toLowerCase().includes(search.toLowerCase());
    const matchesColab = selectedColabId === 'all' || evt.collaboratorId === selectedColabId;
    return matchesSearch && matchesColab;
  });

  const totalDays = events.reduce((sum, evt) => {
    try {
      const days = differenceInCalendarDays(parseISO(evt.endDate), parseISO(evt.startDate)) + 1;
      return sum + (days > 0 ? days : 1);
    } catch {
      return sum + 1;
    }
  }, 0);

  return (
    <PageShell wide>
      <PageHeader
        title="Dobras"
        description="Coberturas, justificativas e dias extras embarcados."
        icon={<Sparkles className="size-5" />}
        actions={
          <Button onClick={() => setShowAddModal(true)} className="w-full gap-2 sm:w-auto">
            <Plus className="size-4" />
            Lançar dobra
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard label="Registros" value={`${events.length} dobras`} icon={<Calendar className="size-5" />} />
        <MetricCard label="Dias acumulados" value={`${totalDays} dias`} icon={<Users className="size-5" />} />
        <MetricCard
          label="Colaboradores"
          value={`${new Set(events.map((e) => e.collaboratorId)).size} ativos`}
          icon={<ShieldCheck className="size-5" />}
        />
      </div>

      <SectionSurface>
        <div className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--app-text-faint)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar colaborador ou motivo…"
              className="pl-9 text-xs"
            />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Filter className="size-4 shrink-0 text-[var(--app-text-faint)]" />
            <Select
              value={selectedColabId}
              onChange={(e) => setSelectedColabId(e.target.value)}
              className="text-xs"
            >
              <option value="all">Todos os colaboradores</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </SectionSurface>

      <SectionSurface>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <TableHead>
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Turma & função</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Duração</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </TableHead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {filteredEvents.length === 0 ? (
                <EmptyTableRow
                  colSpan={6}
                  title="Nenhuma dobra encontrada."
                  hint='Use "Lançar dobra" para cadastrar.'
                />
              ) : (
                filteredEvents.map((evt) => {
                  const colab = collaborators.find((c) => c.id === evt.collaboratorId);
                  const turma = turmas.find((t) => t.id === colab?.turmaId);
                  let days = 1;
                  try {
                    days =
                      differenceInCalendarDays(parseISO(evt.endDate), parseISO(evt.startDate)) + 1;
                  } catch {
                    days = 1;
                  }

                  return (
                    <tr key={evt.id} className="hover:bg-[var(--app-surface-muted)]">
                      <td className="px-4 py-3 font-semibold text-[var(--app-text)]">
                        {colab?.name || 'Não identificado'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--app-text-muted)]">
                        <span className="mr-1.5 inline-block rounded-md bg-[var(--app-accent-soft)] px-2 py-0.5 font-semibold text-[var(--app-accent)]">
                          {turma?.name || 's/T'}
                        </span>
                        {colab?.role || '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--app-text)]">
                        {format(parseISO(evt.startDate), 'dd/MM/yyyy')} →{' '}
                        {format(parseISO(evt.endDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--status-dobra)]">
                        {days} {days === 1 ? 'dia' : 'dias'}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-[var(--app-text-muted)]">
                        {evt.motive || 'Dobra de cobertura'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(evt.id)}
                          className="text-[var(--app-danger)] hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionSurface>

      {showAddModal ? (
        <ModalShell
          title="Lançar dobra"
          icon={<Sparkles className="size-5 text-[var(--status-dobra)]" />}
          onClose={() => setShowAddModal(false)}
        >
          <form onSubmit={handleAddDobra} className="space-y-3.5">
            <div>
              <FieldLabel>Colaborador</FieldLabel>
              <Select value={formColabId} onChange={(e) => setFormColabId(e.target.value)} required>
                <option value="">Selecione…</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role})
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Início</FieldLabel>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel>Fim</FieldLabel>
                <Input
                  type="date"
                  value={formEndDate}
                  min={formStartDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <FieldLabel>Motivo</FieldLabel>
              <Input
                value={formMotive}
                onChange={(e) => setFormMotive(e.target.value)}
                placeholder="Ex: Cobertura de férias"
              />
            </div>
            <div>
              <FieldLabel>Observação</FieldLabel>
              <textarea
                className="min-h-[70px] w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 text-xs text-[var(--app-text)] focus:border-[var(--app-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent-soft)]"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Informações adicionais…"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] pt-3">
              <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Remover dobra"
        message="Tem certeza que deseja excluir esta dobra registrada?"
        confirmText="Sim, excluir"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await deleteEvent(deleteId);
        }}
      />
    </PageShell>
  );
}
