import { useState, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { format } from 'date-fns';
import { Trash2, Plus } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const { turmas, addTurma, deleteTurma } = useData();
  const [newTurmaName, setNewTurmaName] = useState('');
  const [newTurmaDate, setNewTurmaDate] = useState('');
  const [deleteTurmaId, setDeleteTurmaId] = useState<string | null>(null);

  const handleAddTurma = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTurmaName || !newTurmaDate) return;

    await addTurma({
      name: newTurmaName,
      baseDate: newTurmaDate,
    });

    setNewTurmaName('');
    setNewTurmaDate('');
  };

  const handleDelete = async (id: string) => {
    await deleteTurma(id);
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6 font-sans">
      {/* Header */}
      <div className={cn(
        "p-4 sm:p-6 rounded-xl border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors duration-200",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div>
          <h1 className={cn("text-lg sm:text-xl font-bold", isLight ? "text-slate-900" : "text-white")}>Configurações de Turmas e Embarques</h1>
          <p className={cn("text-xs mt-1", isLight ? "text-slate-500" : "text-slate-400")}>
            Cadastro de turmas e definição das datas base para cálculo automático do ciclo de embarque 14x14.
          </p>
        </div>
      </div>

      {/* Operational Section: Turmas & Base Dates */}
      <div className={cn("border rounded-xl shadow-xs overflow-hidden transition-colors duration-200", isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800")}>
        <div className={cn("p-4 sm:p-5 border-b", isLight ? "border-slate-100 bg-slate-50/50" : "border-slate-800 bg-slate-950/50")}>
          <h2 className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-slate-800" : "text-slate-200")}>Turmas e Datas Base de Embarque</h2>
          <p className={cn("text-xs mt-0.5", isLight ? "text-slate-500" : "text-slate-400")}>
            Define o ponto de partida do ciclo 14x14 para cada turma de embarque da equipe.
          </p>
        </div>
        
        <div className="p-4 sm:p-6">
          <form onSubmit={handleAddTurma} className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end mb-6">
            <div className="flex-1">
              <label className={cn("block text-xs font-semibold mb-1", isLight ? "text-slate-700" : "text-slate-300")}>Nome da Turma</label>
              <Input 
                value={newTurmaName} 
                onChange={e => setNewTurmaName(e.target.value)} 
                placeholder="Ex: TER, QUI, SEX..." 
                required 
              />
            </div>
            <div className="flex-1">
              <label className={cn("block text-xs font-semibold mb-1", isLight ? "text-slate-700" : "text-slate-300")}>Data Base de Embarque</label>
              <Input 
                type="date" 
                value={newTurmaDate} 
                onChange={e => setNewTurmaDate(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 w-full sm:w-auto justify-center cursor-pointer">
              <Plus className="h-4 w-4" />
              Adicionar Turma
            </Button>
          </form>

          <div className={cn("border rounded-md overflow-hidden", isLight ? "border-slate-200" : "border-slate-800")}>
            <table className="w-full text-sm text-left">
              <thead className={cn("border-b", isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-950 border-slate-800 text-slate-300")}>
                <tr>
                  <th className="px-4 py-3 font-medium">Turma</th>
                  <th className="px-4 py-3 font-medium">Data Base de Embarque</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isLight ? "divide-slate-200" : "divide-slate-800")}>
                {turmas?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={cn("px-4 py-8 text-center", isLight ? "text-slate-500" : "text-slate-400")}>
                      Nenhuma turma cadastrada.
                    </td>
                  </tr>
                ) : (
                  turmas?.map(turma => (
                    <tr key={turma.id} className={isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/50"}>
                      <td className={cn("px-4 py-3 font-semibold", isLight ? "text-slate-900" : "text-white")}>{turma.name}</td>
                      <td className={cn("px-4 py-3 font-medium", isLight ? "text-slate-600" : "text-slate-300")}>
                        {format(new Date(turma.baseDate + 'T12:00:00'), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                          onClick={() => setDeleteTurmaId(turma.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTurmaId}
        title="Excluir Turma"
        message="Tem certeza que deseja excluir esta turma?"
        confirmText="Sim, Excluir"
        onClose={() => setDeleteTurmaId(null)}
        onConfirm={async () => {
          if (deleteTurmaId) {
            await handleDelete(deleteTurmaId);
          }
        }}
      />
    </div>
  );
}




