import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useData } from '../data/DataProvider';
import type { Collaborator, ScheduleEvent, Status } from '../domain/types';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'Escala', label: 'Escala' },
  { value: 'Dobra', label: 'Dobra' },
  { value: 'Folga', label: 'Folga' },
  { value: 'Férias', label: 'Férias' },
  { value: 'Treinamento', label: 'Treinamento' },
  { value: 'Exame Médico', label: 'Exame Médico / Atestado' },
  { value: 'No Show', label: 'No Show' },
];

interface EventSidebarProps {
  collaborator: Collaborator | null;
  date: string;
  event?: ScheduleEvent | null;
  onClose: () => void;
}

export default function EventSidebar({ collaborator, date, event, onClose }: EventSidebarProps) {
  const { addEvent, updateEvent, deleteEvent } = useData();
  const [startDate, setStartDate] = useState(event?.startDate ?? date);
  const [endDate, setEndDate] = useState(event?.endDate ?? date);
  const [status, setStatus] = useState<Status>(event?.status ?? 'Escala');
  const [note, setNote] = useState(event?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStartDate(event?.startDate ?? date);
    setEndDate(event?.endDate ?? date);
    setStatus(event?.status ?? 'Escala');
    setNote(event?.note ?? '');
    setError('');
  }, [event, date]);

  if (!collaborator) return null;

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (event) {
        await updateEvent(event.id, { startDate, endDate, status, note });
      } else {
        await addEvent({ collaboratorId: collaborator.id, startDate, endDate, status, note });
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!confirm('Excluir este evento?')) return;
    setSaving(true);
    try {
      await deleteEvent(event.id);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir evento.');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="animate-slide-in fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ background: 'var(--app-header)', color: 'var(--app-header-text)' }}
        >
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold truncate">{collaborator.name}</p>
            <p className="mt-0.5 text-[12px] text-white/60">{collaborator.role}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[var(--app-surface-muted)] p-5">
          <h3 className="text-[13px] font-bold tracking-wide text-[var(--app-text)] uppercase">
            {event ? 'Editar evento' : 'Novo evento'}
          </h3>

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            options={STATUS_OPTIONS}
          />
          <Input label="Data início" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="Data fim" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Input
            label="Observação"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opcional"
          />

          {error && (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4">
          {event && (
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={saving}>
              Excluir
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </aside>
    </>
  );
}
