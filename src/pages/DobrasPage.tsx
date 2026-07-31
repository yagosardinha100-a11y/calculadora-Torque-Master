import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, X } from 'lucide-react';
import { useData } from '../data/DataProvider';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

function fmtDate(s: string) {
  try { return format(parseISO(s), 'dd/MM/yyyy', { locale: ptBR }); } catch { return s; }
}

export default function DobrasPage() {
  const { events, collaborators, addEvent, deleteEvent } = useData();
  const [showForm, setShowForm] = useState(false);
  const [collabId, setCollabId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const dobras = events
    .filter(e => e.status === 'Dobra')
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const colabOptions = [
    { value: '', label: 'Selecionar colaborador…' },
    ...collaborators.filter(c => c.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(c => ({ value: c.id, label: c.name })),
  ];

  const handleSave = async () => {
    if (!collabId) { setError('Selecione um colaborador.'); return; }
    if (!startDate || !endDate) { setError('Datas obrigatórias.'); return; }
    setSaving(true);
    setError('');
    try {
      await addEvent({ collaboratorId: collabId, startDate, endDate, status: 'Dobra', note });
      setShowForm(false);
      setCollabId(''); setStartDate(''); setEndDate(''); setNote('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta dobra?')) return;
    try { await deleteEvent(id); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  };

  return (
    <div className="h-full overflow-y-auto p-4" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--app-text)' }}>Dobras</h1>
          <Button size="sm" onClick={() => { setShowForm(v => !v); setError(''); }}>
            <Plus size={14} /> Nova Dobra
          </Button>
        </div>

        {showForm && (
          <div className="rounded-lg border p-4 flex flex-col gap-3" style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Select label="Colaborador" value={collabId} onChange={e => setCollabId(e.target.value)} options={colabOptions} />
              </div>
              <Input label="Data Início" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input label="Data Fim" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              <div className="col-span-2">
                <Input label="Motivo/Observação" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--app-danger)' }}>{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--app-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--app-surface-muted)' }}>
                {['Colaborador', 'Início', 'Fim', 'Observação', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--app-text-muted)', borderBottom: '1px solid var(--app-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dobras.map(e => {
                const colab = collaborators.find(c => c.id === e.collaboratorId);
                return (
                  <tr key={e.id} className="transition-colors hover:bg-[var(--app-surface-muted)]" style={{ borderBottom: '1px solid var(--app-border)' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--app-text)' }}>{colab?.name ?? e.collaboratorId}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>{fmtDate(e.startDate)}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>{fmtDate(e.endDate)}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>{e.note ?? e.motive ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="p-1 rounded hover:opacity-70" onClick={() => handleDelete(e.id)}>
                        <X size={13} style={{ color: 'var(--app-danger)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {dobras.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--app-text-faint)' }}>Nenhuma dobra cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
