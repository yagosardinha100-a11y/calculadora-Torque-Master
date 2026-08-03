import { useState, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { format, parseISO, differenceInCalendarDays, isBefore } from 'date-fns';
import { GraduationCap, Plus, Trash2, Search, AlertTriangle, CheckCircle2, Clock, Filter } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { cn } from '../lib/utils';
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
  const { collaborators, trainings, loading, addTraining, deleteTraining } = useData();
  const { canEdit } = useAuth();

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
    <PageShell wide>
      <PageHeader
        title="Treinamentos"
        description="Certificações offshore, NRs e controle de validade."
        icon={<GraduationCap className="size-5" />}
        actions={
          canEdit ? (
            <Button onClick={() => setShowAddModal(true)} className="w-full gap-2 sm:w-auto">
              <Plus className="size-4" />
              Cadastrar Certificado
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div
          className={cn(
            'cursor-pointer rounded-2xl transition-all',
            statusFilter === 'valid' && 'ring-2 ring-teal-500',
          )}
          onClick={() => setStatusFilter(statusFilter === 'valid' ? 'all' : 'valid')}
        >
          <MetricCard
            label="Certificados Válidos"
            value={
              <span className="text-teal-700 dark:text-teal-300">{validCount} em dia</span>
            }
            icon={<CheckCircle2 className="size-5 text-teal-600 dark:text-teal-400" />}
          />
        </div>

        <div
          className={cn(
            'cursor-pointer rounded-2xl transition-all',
            statusFilter === 'expiring' && 'ring-2 ring-amber-500',
          )}
          onClick={() => setStatusFilter(statusFilter === 'expiring' ? 'all' : 'expiring')}
        >
          <MetricCard
            label="A Vencer (em 45 dias)"
            value={
              <span className="text-amber-700 dark:text-amber-300">{expiringCount} urgentes</span>
            }
            icon={<Clock className="size-5 text-amber-600 dark:text-amber-400" />}
          />
        </div>

        <div
          className={cn(
            'cursor-pointer rounded-2xl transition-all',
            statusFilter === 'expired' && 'ring-2 ring-rose-500',
          )}
          onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
        >
          <MetricCard
            label="Certificados Vencidos"
            value={
              <span className="text-rose-700 dark:text-rose-300">{expiredCount} vencidos</span>
            }
            icon={<AlertTriangle className="size-5 text-rose-600 dark:text-rose-400" />}
          />
        </div>
      </div>

      <SectionSurface>
        <div className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--app-text-faint)]" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por colaborador ou curso..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Filter className="size-4 shrink-0 text-[var(--app-text-faint)]" />
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
      </SectionSurface>

      <SectionSurface>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <TableHead>
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Curso / Treinamento</th>
                <th className="px-4 py-3">Data Emissão</th>
                <th className="px-4 py-3">Data Validade</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </TableHead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {filteredTrainings.length === 0 ? (
                <EmptyTableRow
                  colSpan={6}
                  title="Nenhum certificado cadastrado com os filtros aplicados."
                  hint='Clique em "Cadastrar Certificado" para adicionar registros de CBSP, HUET ou NRs.'
                />
              ) : (
                filteredTrainings.map(tr => {
                  const colab = collaborators.find(c => c.id === tr.collaboratorId);
                  const st = getTrainingStatus(tr.expiryDate);

                  return (
                    <tr key={tr.id} className="hover:bg-[var(--app-surface-muted)]">
                      <td className="px-4 py-3 font-semibold text-[var(--app-text)]">
                        {colab?.name || 'Não Encontrado'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--app-accent)]">
                        {tr.courseName}
                        {tr.certificateNumber && (
                          <span className="mt-0.5 block font-mono text-[10px] text-[var(--app-text-faint)]">
                            Nº {tr.certificateNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--app-text-muted)]">
                        {format(parseISO(tr.issueDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--app-text)]">
                        {format(parseISO(tr.expiryDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        {st === 'valid' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/15 px-2.5 py-1 text-[10px] font-semibold text-teal-800 dark:text-teal-300">
                            <CheckCircle2 className="size-3" /> Em Dia
                          </span>
                        )}
                        {st === 'expiring' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                            <Clock className="size-3" /> Renovação Próxima
                          </span>
                        )}
                        {st === 'expired' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-[10px] font-semibold text-rose-800 dark:text-rose-300">
                            <AlertTriangle className="size-3" /> Vencido
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(tr.id)}
                            className="text-[var(--app-danger)] hover:bg-rose-500/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-[var(--app-text-faint)]">—</span>
                        )}
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
          title="Cadastrar Certificação / Treinamento"
          icon={<GraduationCap className="size-5 text-[var(--app-accent)]" />}
          onClose={() => setShowAddModal(false)}
        >
          <form onSubmit={handleAddTraining} className="space-y-3.5">
            <div>
              <FieldLabel>Colaborador</FieldLabel>
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
              <FieldLabel>Treinamento / Curso</FieldLabel>
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
                <FieldLabel>Nome do Curso Customizado</FieldLabel>
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
                <FieldLabel>Data Emissão</FieldLabel>
                <Input
                  type="date"
                  value={formIssueDate}
                  onChange={e => setFormIssueDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel>Data Validade</FieldLabel>
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
              <FieldLabel hint="(opcional)">Número do Certificado</FieldLabel>
              <Input
                value={formCertNum}
                onChange={e => setFormCertNum(e.target.value)}
                placeholder="Ex: CERT-2026-9912"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] pt-3">
              <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Certificado</Button>
            </div>
          </form>
        </ModalShell>
      ) : null}

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
    </PageShell>
  );
}
