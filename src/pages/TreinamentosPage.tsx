import { useState, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { format, parseISO, differenceInCalendarDays, isBefore } from 'date-fns';
import { GraduationCap, Plus, Trash2, Search, Award, AlertTriangle, CheckCircle2, Clock, Filter, X } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import type { TrainingRecord } from '../types';
import { GenericPageSkeleton } from '../components/ui/Skeleton';

const COMMON_COURSES = [
  'CBSP (Salvavatagem - Solas)',
  'HUET (Escape de Aeronave Submersa)',
  'NR-33 (Espaço Confinado)',
  'NR-35 (Trabalho em Altura)',
  'NR-13 (Caldeiras e Vasos de Pressão)',
  'NR-10 (Segurança em Instalações Elétricas)',
  'Rigging / Movimentação de Cargas',
  'Primeiros Socorros Offshore',
  'Outro Treinamento',
];

export default function TreinamentosPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const { collaborators, trainings, loading, addTraining, deleteTraining } = useData();

  if (loading) {
    return <GenericPageSkeleton />;
  }

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formColabId, setFormColabId] = useState('');
  const [formCourse, setFormCourse] = useState(COMMON_COURSES[0]);
  const [formCustomCourse, setFormCustomCourse] = useState('');
  const [formIssueDate, setFormIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formCertNum, setFormCertNum] = useState('');

  const handleAddTraining = async (e: FormEvent) => {
    e.preventDefault();
    if (!formColabId || !formIssueDate || !formExpiryDate) return;

    const courseName = formCourse === 'Outro Treinamento' ? (formCustomCourse || 'Treinamento Técnico') : formCourse;

    await addTraining({
      collaboratorId: formColabId,
      courseName,
      issueDate: formIssueDate,
      expiryDate: formExpiryDate,
      certificateNumber: formCertNum || undefined,
    });

    setShowAddModal(false);
    setFormCertNum('');
    setFormCustomCourse('');
  };

  const handleDelete = async (id: string) => {
    await deleteTraining(id);
    setDeleteId(null);
  };

  const today = new Date();

  const getTrainingStatus = (expiryDateStr: string): 'valid' | 'expiring' | 'expired' => {
    try {
      const exp = parseISO(expiryDateStr);
      if (isBefore(exp, today)) return 'expired';
      const daysLeft = differenceInCalendarDays(exp, today);
      if (daysLeft <= 45) return 'expiring';
      return 'valid';
    } catch {
      return 'valid';
    }
  };

  // Filter
  const filteredTrainings = trainings.filter(t => {
    const colab = collaborators.find(c => c.id === t.collaboratorId);
    const colabName = colab ? colab.name.toLowerCase() : '';
    const matchesSearch = colabName.includes(search.toLowerCase()) || t.courseName.toLowerCase().includes(search.toLowerCase());
    
    const status = getTrainingStatus(t.expiryDate);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const validCount = trainings.filter(t => getTrainingStatus(t.expiryDate) === 'valid').length;
  const expiringCount = trainings.filter(t => getTrainingStatus(t.expiryDate) === 'expiring').length;
  const expiredCount = trainings.filter(t => getTrainingStatus(t.expiryDate) === 'expired').length;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 font-sans">
      {/* Header Banner */}
      <div className={cn(
        "p-4 sm:p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className={cn("text-lg sm:text-xl font-bold tracking-tight", isLight ? "text-slate-900" : "text-white")}>
              Treinamentos & Certificações Offshore
            </h1>
            <p className={cn("text-xs mt-0.5", isLight ? "text-slate-500" : "text-slate-400")}>
              Controle de exames, CBSP, HUET, NRs obrigatórias e renovação de certificados da equipe.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs py-2.5 px-4 shadow-md shrink-0 w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Certificado
        </Button>
      </div>

      {/* Status Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className={cn(
          "p-4 rounded-xl border flex items-center gap-3.5 shadow-xs cursor-pointer transition-all",
          statusFilter === 'valid' ? 'ring-2 ring-emerald-500' : '',
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )} onClick={() => setStatusFilter(statusFilter === 'valid' ? 'all' : 'valid')}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className={cn("text-xs font-semibold block", isLight ? "text-slate-500" : "text-slate-400")}>Certificados Válidos</span>
            <span className={cn("text-lg font-black text-emerald-600 dark:text-emerald-400")}>{validCount} em dia</span>
          </div>
        </div>

        <div className={cn(
          "p-4 rounded-xl border flex items-center gap-3.5 shadow-xs cursor-pointer transition-all",
          statusFilter === 'expiring' ? 'ring-2 ring-amber-500' : '',
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )} onClick={() => setStatusFilter(statusFilter === 'expiring' ? 'all' : 'expiring')}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className={cn("text-xs font-semibold block", isLight ? "text-slate-500" : "text-slate-400")}>A Vencer (em 45 dias)</span>
            <span className={cn("text-lg font-black text-amber-600 dark:text-amber-400")}>{expiringCount} urgentes</span>
          </div>
        </div>

        <div className={cn(
          "p-4 rounded-xl border flex items-center gap-3.5 shadow-xs cursor-pointer transition-all",
          statusFilter === 'expired' ? 'ring-2 ring-red-500' : '',
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )} onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className={cn("text-xs font-semibold block", isLight ? "text-slate-500" : "text-slate-400")}>Certificados Vencidos</span>
            <span className={cn("text-lg font-black text-red-600 dark:text-red-400")}>{expiredCount} vencidos</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={cn(
        "p-4 rounded-xl border shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por colaborador ou curso..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs"
          >
            <option value="all">Todos os Status</option>
            <option value="valid">Válidos (Em Dia)</option>
            <option value="expiring">A Vencer (&le; 45 dias)</option>
            <option value="expired">Vencidos</option>
          </Select>
        </div>
      </div>

      {/* Trainings Table */}
      <div className={cn(
        "border rounded-xl shadow-xs overflow-hidden transition-colors duration-200",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className={cn(
              "border-b font-bold uppercase tracking-wider text-[11px]",
              isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950 border-slate-800 text-slate-400"
            )}>
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Curso / Treinamento</th>
                <th className="px-4 py-3">Data Emissão</th>
                <th className="px-4 py-3">Data Validade</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isLight ? "divide-slate-200" : "divide-slate-800")}>
              {filteredTrainings.length === 0 ? (
                <tr>
                  <td colSpan={6} className={cn("px-4 py-12 text-center", isLight ? "text-slate-500" : "text-slate-400")}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Award className="w-8 h-8 text-slate-400" />
                      <p className="font-semibold text-sm">Nenhum certificado cadastrado com os filtros aplicados.</p>
                      <p className="text-xs">Clique em "Cadastrar Certificado" para adicionar registros de CBSP, HUET ou NRs.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrainings.map(tr => {
                  const colab = collaborators.find(c => c.id === tr.collaboratorId);
                  const st = getTrainingStatus(tr.expiryDate);

                  return (
                    <tr key={tr.id} className={isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/50"}>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {colab?.name || 'Não Encontrado'}
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                        {tr.courseName}
                        {tr.certificateNumber && (
                          <span className="block text-[10px] font-mono text-slate-400">Nº {tr.certificateNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                        {format(parseISO(tr.issueDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                        {format(parseISO(tr.expiryDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        {st === 'valid' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Em Dia
                          </span>
                        )}
                        {st === 'expiring' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" /> Renovação Próxima
                          </span>
                        )}
                        {st === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                            <AlertTriangle className="w-3 h-3" /> Vencido
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(tr.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={cn(
            "w-full max-w-md rounded-2xl border p-5 shadow-2xl flex flex-col gap-4",
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"
          )}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm">Cadastrar Certificação / Treinamento</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTraining} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Colaborador</label>
                <Select
                  value={formColabId}
                  onChange={e => setFormColabId(e.target.value)}
                  required
                >
                  <option value="">Selecione o colaborador...</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Treinamento / Curso</label>
                <Select
                  value={formCourse}
                  onChange={e => setFormCourse(e.target.value)}
                  required
                >
                  {COMMON_COURSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>

              {formCourse === 'Outro Treinamento' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Nome do Curso Customizado</label>
                  <Input
                    value={formCustomCourse}
                    onChange={e => setFormCustomCourse(e.target.value)}
                    placeholder="Ex: Treinamento Especial em Turbo Compressores"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Data Emissão</label>
                  <Input
                    type="date"
                    value={formIssueDate}
                    onChange={e => setFormIssueDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Data Validade</label>
                  <Input
                    type="date"
                    value={formExpiryDate}
                    min={formIssueDate}
                    onChange={e => setFormExpiryDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Número do Certificado (Opcional)</label>
                <Input
                  value={formCertNum}
                  onChange={e => setFormCertNum(e.target.value)}
                  placeholder="Ex: CERT-2026-9912"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} className="text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                  Salvar Certificado
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Excluir Certificado"
        message="Tem certeza que deseja excluir este registro de treinamento?"
        confirmText="Sim, Excluir"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await handleDelete(deleteId);
        }}
      />
    </div>
  );
}
