import { useState, FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { X, Calendar, UserCheck, Sparkles } from 'lucide-react';
import type { Collaborator, Role } from '../types';
import { getFullDayNameFromDateStr, getDayNameFromDateStr, DEFAULT_TURMAS } from '../lib/turmaUtils';

interface EditCollaboratorModalProps {
  collaborator: Collaborator;
  onClose: () => void;
}

const ROLES: Role[] = [
  'Supervisor',
  'Chefe Mecânica',
  'Coordenador',
  'Mecânico',
  'Assistente Mecânico',
  'Outros'
];

export function EditCollaboratorModal({ collaborator, onClose }: EditCollaboratorModalProps) {
  const { turmas: contextTurmas, updateCollaborator } = useData();
  const turmas = (contextTurmas && contextTurmas.length > 0) ? contextTurmas : DEFAULT_TURMAS;
  const [name, setName] = useState(collaborator.name);
  const [role, setRole] = useState<Role>(collaborator.role);
  const [turmaId, setTurmaId] = useState(collaborator.turmaId);
  
  const currentTurma = turmas.find(t => t.id === turmaId);
  const effectiveStartDate = collaborator.startDate || currentTurma?.baseDate || '2026-08-01';
  const [startDate, setStartDate] = useState(effectiveStartDate);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    await updateCollaborator(collaborator.id, {
      name,
      role,
      turmaId: turmaId || 'turma-a',
      startDate: startDate || undefined,
    });
    onClose();
  };

  const dayOfWeekFull = getFullDayNameFromDateStr(startDate);
  const dayOfWeekAbbr = getDayNameFromDateStr(startDate);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base">Editar Colaborador & Embarque</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Função</label>
              <Select value={role} onChange={e => setRole(e.target.value as Role)}>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Turma (Letra)</label>
              <Select value={turmaId} onChange={e => setTurmaId(e.target.value)}>
                {turmas?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <label className="block text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Data do Próximo/Primeiro Embarque
            </label>
            <Input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-white border-blue-300 font-semibold text-slate-900"
              required
            />
            {dayOfWeekFull && (
              <div className="flex items-center gap-1.5 text-xs text-blue-900 font-bold bg-blue-100/70 p-2 rounded border border-blue-300/50">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Dia de Embarque: <strong>{dayOfWeekFull} ({dayOfWeekAbbr})</strong></span>
              </div>
            )}
            <p className="text-[11px] text-blue-800 leading-tight">
              O ciclo 14x14 (14 dias de embarque seguidos de 14 dias de folga) é calculado a partir desta data de embarque.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Salvar e Recalcular
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

