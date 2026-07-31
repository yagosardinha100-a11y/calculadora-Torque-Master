import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
import { useData } from '../data/DataProvider';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

function fmtDate(s: string) {
  try { return format(parseISO(s), 'dd/MM/yyyy', { locale: ptBR }); } catch { return s; }
}

function expiryStatus(expiryDate: string): 'expired' | 'expiring' | 'valid' {
  const today = new Date();
  const exp = parseISO(expiryDate);
  const days = differenceInDays(exp, today);
  if (days < 0) return 'expired';
  if (days <= 90) return 'expiring';
  return 'valid';
}

const STATUS_BADGE: Record<ReturnType<typeof expiryStatus>, { label: string; color: string; bg: string }> = {
  expired:  { label: 'Vencido',  color: 'var(--app-danger)',        bg: 'rgba(200,30,74,0.12)' },
  expiring: { label: 'Vencendo', color: 'var(--status-dobra)',      bg: 'rgba(217,119,6,0.12)' },
  valid:    { label: 'Válido',   color: 'var(--status-escala)',     bg: 'rgba(13,148,136,0.12)' },
};

export default function TreinamentosPage() {
  const { trainings, collaborators, addTraining, deleteTraining } = useData();
  const [showForm, setShowForm] = useState(false);
  const [collabId, setCollabId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [note, setNote] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchName, setSearchName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const colabOptions = [
    { value: '', label: 'Selecionar colaborador…' },
    ...collaborators.filter(c => c.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(c => ({ value: c.id, label: c.name })),
  ];

  const statusFilterOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'expired', label: 'Vencidos' },
    { value: 'expiring', label: 'Vencendo' },
    { value: 'valid', label: 'Válidos' },
  ];

  const filtered = trainings
    .filter(t => {
      if (filterStatus) {
        const st = expiryStatus(t.expiryDate);
        if (st !== filterStatus) return false;
      }
      if (searchName) {
        const colab = collaborators.find(c => c.id === t.collaboratorId);
        if (!colab?.name.toLowerCase().includes(searchName.toLowerCase()) &&
            !t.courseName.toLowerCase().includes(searchName.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  const handleSave = async () => {
    if (!collabId) { setError('Selecione um colaborador.'); return; }
    if (!courseName.trim()) { setError('Nome do curso obrigatório.'); return; }
    if (!issueDate || !expiryDate) { setError('Datas obrigatórias.'); return; }
    setSaving(true);
    setError('');
    try {
      await addTraining({
        collaboratorId: collabId,
        courseName: courseName.trim(),
        issueDate,
        expiryDate,
        certificateNumber: certNumber || undefined,
        note: note || undefined,
      });
      setShowForm(false);
      setCollabId(''); setCourseName(''); setIssueDate(''); setExpiryDate(''); setCertNumber(''); setNote('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir treinamento?')) return;
    try { await deleteTraining(id); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };

  return (
    <div className="h-full overflow-y-auto p-4" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--app-text)' }}>Treinamentos</h1>
          <Button size="sm" onClick={() => { setShowForm(v => !v); setError(''); }}>
            <Plus size={14} /> Novo Registro
          </Button>
        </div>

        {showForm && (
          <div className="rounded-lg border p-4 flex flex-col gap-3" style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Select label="Colaborador" value={collabId} onChange={e => setCollabId(e.target.value)} options={colabOptions} />
              </div>
              <div className="col-span-2">
                <Input label="Curso / Certificação" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="ex: CBSP, HUET, NR-33…" />
              </div>
              <Input label="Data Emissão" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              <Input label="Data Vencimento" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
              <Input label="Nº Certificado" value={certNumber} onChange={e => setCertNumber(e.target.value)} placeholder="Opcional" />
              <Input label="Observação" value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" />
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--app-danger)' }}>{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Buscar colaborador ou curso…"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-xs focus:outline-none focus:ring-1"
            style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)', color: 'var(--app-text)', minWidth: 200, ['--tw-ring-color' as string]: 'var(--app-accent)' }}
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-xs focus:outline-none focus:ring-1"
            style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)', color: 'var(--app-text)', ['--tw-ring-color' as string]: 'var(--app-accent)' }}
          >
            {statusFilterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--app-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--app-surface-muted)' }}>
                {['Colaborador', 'Curso', 'Emissão', 'Vencimento', 'Status', 'Nº Cert.', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--app-text-muted)', borderBottom: '1px solid var(--app-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const colab = collaborators.find(c => c.id === t.collaboratorId);
                const st = expiryStatus(t.expiryDate);
                const badge = STATUS_BADGE[st];
                return (
                  <tr key={t.id} className="transition-colors hover:bg-[var(--app-surface-muted)]" style={{ borderBottom: '1px solid var(--app-border)' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--app-text)' }}>{colab?.name ?? t.collaboratorId}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text)' }}>{t.courseName}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>{fmtDate(t.issueDate)}</td>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: badge.color }}>{fmtDate(t.expiryDate)}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>{t.certificateNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="p-1 rounded hover:opacity-70" onClick={() => handleDelete(t.id)}>
                        <Trash2 size={13} style={{ color: 'var(--app-danger)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--app-text-faint)' }}>Nenhum treinamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
