import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useData } from '../data/DataProvider';
import type { Turma } from '../domain/types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface FormState {
  name: string;
  baseDate: string;
}

export default function SettingsPage() {
  const { turmas, addTurma, updateTurma, deleteTurma } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', baseDate: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', baseDate: '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (t: Turma) => {
    setEditId(t.id);
    setForm({ name: t.name, baseDate: t.baseDate });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nome obrigatório.'); return; }
    if (!form.baseDate) { setError('Data base obrigatória.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await updateTurma(editId, { name: form.name.trim(), baseDate: form.baseDate });
      } else {
        await addTurma({ name: form.name.trim(), baseDate: form.baseDate });
      }
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir turma "${name}"?`)) return;
    try { await deleteTurma(id); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  };

  return (
    <div className="h-full overflow-y-auto p-4" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--app-text)' }}>Turmas</h1>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> Nova Turma
          </Button>
        </div>

        {showForm && (
          <div className="rounded-lg border p-4 flex flex-col gap-3" style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
              {editId ? 'Editar Turma' : 'Nova Turma'}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nome"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ex: Turma A"
              />
              <Input
                label="Data Base (1º Embarque)"
                type="date"
                value={form.baseDate}
                onChange={e => setForm(f => ({ ...f, baseDate: e.target.value }))}
              />
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--app-danger)' }}>{error}</p>}
            <p className="text-xs" style={{ color: 'var(--app-text-faint)' }}>
              A data base define o primeiro dia de embarque do ciclo 14×14 desta turma.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} disabled={saving}>
                <X size={13} /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check size={13} /> {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--app-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--app-surface-muted)' }}>
                {['Nome', 'Data Base', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--app-text-muted)', borderBottom: '1px solid var(--app-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {turmas.map(t => (
                <tr key={t.id} className="transition-colors hover:bg-[var(--app-surface-muted)]" style={{ borderBottom: '1px solid var(--app-border)' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--app-text)' }}>{t.name}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>{t.baseDate}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button className="p-1 rounded hover:opacity-70" onClick={() => openEdit(t)}>
                        <Pencil size={13} style={{ color: 'var(--app-text-muted)' }} />
                      </button>
                      <button className="p-1 rounded hover:opacity-70" onClick={() => handleDelete(t.id, t.name)}>
                        <Trash2 size={13} style={{ color: 'var(--app-danger)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {turmas.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--app-text-faint)' }}>
                    Nenhuma turma cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
