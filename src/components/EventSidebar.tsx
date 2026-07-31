import { useState, useEffect, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { X, Trash2, Save, Calendar, User, Info, AlertTriangle } from 'lucide-react';
import type { CellData } from '../hooks/useSchedule';
import type { Status } from '../types';
import { ConfirmModal } from './ui/ConfirmModal';

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
      await updateEvent(cell.event.id, {
        status,
        endDate,
        motive,
        note,
      });
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
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-800 transition-transform duration-300 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 text-cyan-300 flex items-center justify-center font-black">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Gerenciar Dia da Escala</h2>
              <p className="text-xs text-cyan-300 font-bold">{collaboratorName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary Card */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" /> Integrante
              </span>
              <span className="font-extrabold text-white">{collaboratorName}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs">
              <div>
                <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Data de Início</span>
                <span className="font-bold text-slate-200 mt-0.5 block">
                  {new Date(cell.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Status Atual</span>
                <span className="font-black text-cyan-300 mt-0.5 block">
                  {cell.event ? 'Sobrescrito (Evento)' : cell.status}
                </span>
              </div>
            </div>
          </div>

          <form id="event-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Novo Status Operacional</label>
              <Select value={status} onChange={e => setStatus(e.target.value as Status)} required>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Data Final da Alteração</label>
              <Input 
                type="date" 
                value={endDate} 
                min={cell.dateStr}
                onChange={e => setEndDate(e.target.value)} 
                required 
              />
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                O evento será aplicado da data inicial até esta data.
              </p>
            </div>

            {status === 'Dobra' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Motivo / Justificativa da Dobra</label>
                <Input 
                  value={motive} 
                  onChange={e => setMotive(e.target.value)} 
                  placeholder="Ex: Cobertura emergencial de férias" 
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Observações Adicionais</label>
              <textarea 
                className="flex w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[90px]"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Insira detalhes adicionais sobre esta alteração..."
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          {cell.event ? (
            <Button type="button" variant="danger" onClick={() => setShowConfirmDelete(true)} className="gap-2 text-xs">
              <Trash2 className="w-4 h-4" />
              Remover
            </Button>
          ) : (
            <div></div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-xs text-slate-400 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" form="event-form" className="gap-2 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white">
              <Save className="w-4 h-4" />
              Salvar Alteração
            </Button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Excluir Evento Operacional"
        message="Deseja remover este evento e restaurar o status automático da escala?"
        confirmText="Sim, Remover Evento"
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}

