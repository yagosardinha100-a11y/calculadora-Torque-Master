import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useData } from '../data/DataProvider';
import type { Collaborator, Role } from '../domain/types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { PageHeader } from '../components/PageHeader';

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
    <div className="mx-auto h-full max-w-4xl space-y-4 overflow-y-auto p-3 sm:p-4">
      <PageHeader
        title="Colaboradores"
        subtitle={`${filtered.length} na lista`}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> Novo
          </Button>
        }
      />

      <div className="animate-rise" style={{ animationDelay: '40ms' }}>
        <input
          type="text"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full max-w-xs rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-text)] focus:ring-1 focus:ring-[var(--app-accent)] focus:outline-none"
        />
      </div>

      {showForm && (
        <div className="app-surface animate-rise rounded-2xl p-4 sm:p-5">
          <h2 className="mb-3 font-display text-[15px] font-semibold text-[var(--app-text)]">
            {editId ? 'Editar colaborador' : 'Novo colaborador'}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <Select
              label="Função"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              options={ROLE_OPTIONS}
            />
            <Select
              label="Turma"
              value={form.turmaId}
              onChange={(e) => setForm((f) => ({ ...f, turmaId: e.target.value }))}
              options={turmaOptions}
            />
            <Input
              label="Data embarque inicial"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="active-check"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="size-4 accent-[var(--app-accent)]"
              />
              <label htmlFor="active-check" className="text-[13px] text-[var(--app-text)]">
                Ativo
              </label>
            </div>
          </div>
          {error && <p className="mt-2 text-[12px] text-[var(--app-danger)]">{error}</p>}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} disabled={saving}>
              <X size={13} /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check size={13} /> {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}

      <div className="app-surface animate-rise overflow-hidden rounded-2xl" style={{ animationDelay: '80ms' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--app-surface-muted)]">
              {['Nome', 'Função', 'Turma', 'Embarque', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="border-b border-[var(--app-border)] px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-[var(--app-text-muted)] uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const turmaName = turmas.find((t) => t.id === c.turmaId)?.name ?? '—';
              return (
                <tr key={c.id} className="border-b border-[var(--app-border)] transition-colors hover:bg-[var(--app-surface-muted)]">
                  <td className="px-3 py-2.5 font-semibold text-[var(--app-text)]">{c.name}</td>
                  <td className="px-3 py-2.5 text-[var(--app-text-muted)]">{c.role}</td>
                  <td className="px-3 py-2.5 text-[var(--app-text-muted)]">{turmaName}</td>
                  <td className="px-3 py-2.5 text-[var(--app-text-muted)]">{c.startDate ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className="rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: c.active ? 'var(--app-accent-soft)' : 'rgba(148,163,184,0.15)',
                        color: c.active ? 'var(--status-escala)' : 'var(--app-text-faint)',
                      }}
                    >
                      {c.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="cursor-pointer rounded-lg p-1.5 text-[var(--app-text-muted)] transition hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-accent)]"
                        onClick={() => openEdit(c)}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-lg p-1.5 text-[var(--app-danger)] transition hover:bg-rose-500/10"
                        onClick={() => handleDelete(c.id, c.name)}
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-[var(--app-text-faint)]">
                  Nenhum colaborador encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
