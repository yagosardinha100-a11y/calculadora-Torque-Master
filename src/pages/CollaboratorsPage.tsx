import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useData } from '../data/DataProvider';
import type { Collaborator, Role } from '../domain/types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

const ROLES: Role[] = [
  'Supervisor',
  'Chefe Mecânica',
  'Mecânico',
  'Assistente Mecânico',
  'Coordenador',
  'Outros',
];

const ROLE_OPTIONS = ROLES.map(r => ({ value: r, label: r }));

interface FormState {
  name: string;
  role: Role;
  turmaId: string;
  startDate: string;
  active: boolean;
}

const emptyForm = (): FormState => ({
  name: '',
  role: 'Mecânico',
  turmaId: '',
  startDate: '',
  active: true,
});

export default function CollaboratorsPage() {
  const { collaborators, turmas, addCollaborator, updateCollaborator, deleteCollaborator } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const turmaOptions = [
    { value: '', label: 'Sem turma' },
    ...turmas.map(t => ({ value: t.id, label: t.name })),
  ];

  const filtered = collaborators
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  };

  const openEdit = (c: Collaborator) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      role: c.role,
      turmaId: c.turmaId ?? '',
      startDate: c.startDate ?? '',
      active: c.active,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nome obrigatório.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await updateCollaborator(editId, {
          name: form.name.trim(),
          role: form.role,
          turmaId: form.turmaId,
          startDate: form.startDate || undefined,
          active: form.active,
        });
      } else {
        await addCollaborator({
          name: form.name.trim(),
          role: form.role,
          turmaId: form.turmaId,
          startDate: form.startDate || undefined,
          active: form.active,
        });
      }
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir ${name}? Todos os eventos vinculados serão removidos.`)) return;
    try {
      await deleteCollaborator(id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--app-text)' }}>
            Colaboradores
          </h1>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> Novo
          </Button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-1"
          style={{
            background: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
            ['--tw-ring-color' as string]: 'var(--app-accent)',
          }}
        />

        {/* Form */}
        {showForm && (
          <div
            className="rounded-lg border p-4 flex flex-col gap-3"
            style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
              {editId ? 'Editar Colaborador' : 'Novo Colaborador'}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <Select
                label="Função"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                options={ROLE_OPTIONS}
              />
              <Select
                label="Turma"
                value={form.turmaId}
                onChange={e => setForm(f => ({ ...f, turmaId: e.target.value }))}
                options={turmaOptions}
              />
              <Input
                label="Data Embarque Inicial"
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="active-check"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                />
                <label htmlFor="active-check" className="text-sm" style={{ color: 'var(--app-text)' }}>Ativo</label>
              </div>
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--app-danger)' }}>{error}</p>}
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} disabled={saving}>
                <X size={13} /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check size={13} /> {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--app-surface-muted)' }}>
                {['Nome', 'Função', 'Turma', 'Embarque', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--app-text-muted)', borderBottom: '1px solid var(--app-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const turmaName = turmas.find(t => t.id === c.turmaId)?.name ?? '—';
                return (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-[var(--app-surface-muted)]"
                    style={{ borderBottom: '1px solid var(--app-border)' }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--app-text)' }}>{c.name}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--app-text-muted)' }}>{c.role}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--app-text-muted)' }}>{turmaName}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--app-text-muted)' }}>{c.startDate ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: c.active ? 'rgba(13,148,136,0.15)' : 'rgba(148,163,184,0.15)',
                          color: c.active ? 'var(--status-escala)' : 'var(--app-text-faint)',
                        }}
                      >
                        {c.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          className="p-1 rounded hover:opacity-70 transition-opacity"
                          onClick={() => openEdit(c)}
                          title="Editar"
                        >
                          <Pencil size={13} style={{ color: 'var(--app-text-muted)' }} />
                        </button>
                        <button
                          className="p-1 rounded hover:opacity-70 transition-opacity"
                          onClick={() => handleDelete(c.id, c.name)}
                          title="Excluir"
                        >
                          <Trash2 size={13} style={{ color: 'var(--app-danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--app-text-faint)' }}>
                    Nenhum colaborador encontrado.
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
