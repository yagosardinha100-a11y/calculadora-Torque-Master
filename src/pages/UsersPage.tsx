import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ShieldCheck, Plus, Trash2, UserCog, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  EmptyTableRow,
  FieldLabel,
  PageHeader,
  PageShell,
  SectionSurface,
  TableHead,
} from '../components/ui/PageChrome';
import { BOOTSTRAP_EDITORS, useAuth } from '../context/AuthContext';
import type { AccessRole, Authorization } from '../types';
import {
  listAuthorizations,
  removeAuthorization,
  setAuthorization,
} from '../services/users';

export default function UsersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Authorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AccessRole>('viewer');
  const [saving, setSaving] = useState(false);
  const [emailToRemove, setEmailToRemove] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAuthorizations());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const bootstrapSet = useMemo(
    () => new Set(BOOTSTRAP_EDITORS.map((e) => e.toLowerCase())),
    [],
  );

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    setSaving(true);
    try {
      await setAuthorization(email, newRole, { createdBy: user?.email });
      setNewEmail('');
      setNewRole('viewer');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRole = async (email: string, role: AccessRole) => {
    try {
      await setAuthorization(email, role, { createdBy: user?.email });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar papel.');
    }
  };

  const handleRemove = async () => {
    if (!emailToRemove) return;
    try {
      await removeAuthorization(emailToRemove);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover usuário.');
    } finally {
      setEmailToRemove(null);
    }
  };

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        title="Usuários e permissões"
        description="Controle quem pode editar (Editor) e quem apenas consulta (Visualizador)."
        icon={<UserCog className="size-5" />}
      />

      <SectionSurface
        title="Conceder acesso"
        subtitle="Adicione o e-mail Google da pessoa e escolha o papel"
      >
        <div className="p-4 sm:p-6">
          <form
            onSubmit={handleAdd}
            className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:gap-4"
          >
            <div className="flex-1">
              <FieldLabel>E-mail (conta Google)</FieldLabel>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="pessoa@gmail.com"
                required
              />
            </div>
            <div className="sm:w-48">
              <FieldLabel>Papel</FieldLabel>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AccessRole)}
              >
                <option value="viewer">Visualizador (só consulta)</option>
                <option value="editor">Editor (edita)</option>
              </Select>
            </div>
            <Button
              type="submit"
              className="w-full shrink-0 gap-2 sm:w-auto"
              disabled={saving}
            >
              <Plus className="size-4" />
              Conceder
            </Button>
          </form>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
              Acessos concedidos
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => void reload()}
              disabled={loading}
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--app-border)]">
            <table className="w-full text-left text-sm">
              <TableHead>
                <tr>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Papel</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </TableHead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {BOOTSTRAP_EDITORS.map((email) => (
                  <tr key={`bootstrap-${email}`} className="bg-[var(--app-surface-muted)]/40">
                    <td className="px-4 py-3 font-semibold text-[var(--app-text)]">
                      {email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--app-accent)]">
                        <ShieldCheck className="size-3.5" />
                        Editor (fixo)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--app-text-muted)]">
                      protegido
                    </td>
                  </tr>
                ))}

                {rows.filter((r) => !bootstrapSet.has(r.email.toLowerCase())).length === 0 &&
                !loading ? (
                  <EmptyTableRow
                    colSpan={3}
                    title="Nenhum acesso adicional concedido ainda."
                  />
                ) : (
                  rows
                    .filter((r) => !bootstrapSet.has(r.email.toLowerCase()))
                    .map((row) => (
                      <tr key={row.email} className="hover:bg-[var(--app-surface-muted)]">
                        <td className="px-4 py-3 font-medium text-[var(--app-text)]">
                          {row.email}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={row.role}
                            className="h-9 w-40"
                            onChange={(e) =>
                              handleChangeRole(row.email, e.target.value as AccessRole)
                            }
                          >
                            <option value="viewer">Visualizador</option>
                            <option value="editor">Editor</option>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--app-danger)] hover:bg-rose-500/10"
                            onClick={() => setEmailToRemove(row.email)}
                            aria-label={`Remover acesso de ${row.email}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-[var(--app-text-muted)]">
            <strong>Editor</strong> pode ver e editar tudo. <strong>Visualizador</strong>{' '}
            só consulta (não altera nada). O controle é validado no servidor
            (Firestore), então não é possível burlar pelo navegador.
          </p>
        </div>
      </SectionSurface>

      <ConfirmModal
        isOpen={!!emailToRemove}
        title="Remover acesso"
        message={`Remover o acesso de ${emailToRemove}? A pessoa perderá o acesso ao sistema.`}
        confirmText="Sim, remover"
        onClose={() => setEmailToRemove(null)}
        onConfirm={handleRemove}
      />
    </PageShell>
  );
}
