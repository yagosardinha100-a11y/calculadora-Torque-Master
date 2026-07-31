import { useState, useEffect, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { X, Trash2, Save, Calendar, User, Info } from 'lucide-react';
import type { CellData } from '../hooks/useSchedule';
import type { Status } from '../types';
import { ConfirmModal } from './ui/ConfirmModal';
import { FieldLabel } from './ui/PageChrome';

const STATUS_OPTIONS: Status[] = [
  'Escala',
  'Dobra',
  'Folga',
  'Férias',
  'Treinamento',
  'Exame Médico',
  'No Show',
];

interface EventSidebarProps {
  cell: CellData | null;
  collaboratorName: string;
  onClose: () => void;
}

export function EventSidebar({ cell, collaboratorName, onClose }: EventSidebarProps) {
  const { addEvent, updateEvent, deleteEvent } = useData();
  const [status, setStatus] = useState<Status>('Dobra');
  const [endDate, setEndDate] = useState('');
  const [motive, setMotive] = useState('');
  const [note, setNote] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (cell) {
      if (cell.event) {
        setStatus(cell.event.status);
        setEndDate(cell.event.endDate);
        setMotive(cell.event.motive || '');
        setNote(cell.event.note || '');
      } else {
        setStatus('Dobra');
        setEndDate(cell.dateStr);
        setMotive('');
        setNote('');
      }
    }
  }, [cell]);

  if (!cell) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!endDate) return;

    if (cell.event) {
      await updateEvent(cell.event.id, { status, endDate, motive, note });
    } else {
      await addEvent({
        collaboratorId: cell.collaboratorId,
        startDate: cell.dateStr,
        endDate,
        status,
        motive,
        note,
      });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (cell?.event) {
      await deleteEvent(cell.event.id);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="fixed top-0 right-0 z-50 flex h-full w-full flex-col border-l border-[var(--app-border)] sm:w-[420px]"
        style={{ background: 'var(--app-surface)' }}
      >
        <div
          className="flex items-center justify-between border-b border-white/10 px-4 py-4 text-white"
          style={{ background: 'var(--app-header)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--app-nav-active)] text-white">
              <Calendar className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-[14px] font-semibold">Editar dia</h2>
              <p className="text-[12px] text-white/65">{collaboratorName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 font-medium text-[var(--app-text-muted)]">
                <User className="size-3.5 text-[var(--app-accent)]" />
                Integrante
              </span>
              <span className="font-semibold text-[var(--app-text)]">{collaboratorName}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-[var(--app-border)] pt-2 text-[12px]">
              <div>
                <span className="block text-[10px] font-semibold tracking-wider text-[var(--app-text-faint)] uppercase">
                  Início
                </span>
                <span className="mt-0.5 block font-semibold text-[var(--app-text)]">
                  {new Date(cell.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold tracking-wider text-[var(--app-text-faint)] uppercase">
                  Status atual
                </span>
                <span className="mt-0.5 block font-semibold text-[var(--app-accent)]">
                  {cell.event ? 'Evento manual' : cell.status}
                </span>
              </div>
            </div>
          </div>

          <form id="event-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <FieldLabel>Novo status</FieldLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value as Status)} required>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <FieldLabel>Data final</FieldLabel>
              <Input
                type="date"
                value={endDate}
                min={cell.dateStr}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--app-text-faint)]">
                <Info className="size-3 shrink-0 text-[var(--app-accent)]" />
                Aplicado da data inicial até esta data.
              </p>
            </div>

            {status === 'Dobra' ? (
              <div>
                <FieldLabel>Motivo da dobra</FieldLabel>
                <Input
                  value={motive}
                  onChange={(e) => setMotive(e.target.value)}
                  placeholder="Ex: Cobertura emergencial de férias"
                />
              </div>
            ) : null}

            <div>
              <FieldLabel>Observações</FieldLabel>
              <textarea
                className="min-h-[90px] w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] focus:border-[var(--app-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent-soft)]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Detalhes adicionais…"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
          {cell.event ? (
            <Button type="button" variant="danger" onClick={() => setShowConfirmDelete(true)} className="gap-2 text-xs">
              <Trash2 className="size-4" />
              Remover
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" form="event-form" className="gap-2 text-xs">
              <Save className="size-4" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Excluir evento"
        message="Deseja remover este evento e restaurar o status automático da escala?"
        confirmText="Sim, remover"
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
