import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useData } from '../data/DataProvider';
import type { Collaborator, ScheduleEvent, Status } from '../domain/types';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'Escala',       label: 'Escala' },
  { value: 'Dobra',        label: 'Dobra' },
  { value: 'Folga',        label: 'Folga' },
  { value: 'Férias',       label: 'Férias' },
  { value: 'Treinamento',  label: 'Treinamento' },
  { value: 'Exame Médico', label: 'Exame Médico' },
  { value: 'No Show',      label: 'No Show' },
];

interface EventSidebarProps {
  collaborator: Collaborator | null;
  date: string; // YYYY-MM-DD
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.25)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col shadow-xl"
        style={{ background: 'var(--app-surface)', borderLeft: '1px solid var(--app-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <div>
            <p className="text-xs font-semibold font-display" style={{ color: 'var(--app-text)' }}>
              {collaborator.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>{collaborator.role}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70">
            <X size={16} style={{ color: 'var(--app-text-muted)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
            {event ? 'Editar Evento' : 'Novo Evento'}
          </h3>

          <Select
            label="Status"
            value={status}
            onChange={e => setStatus(e.target.value as Status)}
            options={STATUS_OPTIONS}
          />

          <Input
            label="Data Início"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />

          <Input
            label="Data Fim"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />

          <Input
            label="Observação"
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Opcional"
          />

          {error && (
            <p className="rounded-md border px-3 py-2 text-xs" style={{ color: 'var(--app-danger)', borderColor: 'var(--app-danger)', background: 'rgba(200,30,74,0.06)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 border-t px-4 py-3"
          style={{ borderColor: 'var(--app-border)' }}
        >
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
      </div>
    </>
  );
}
