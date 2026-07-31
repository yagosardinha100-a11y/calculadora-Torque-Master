import type { Collaborator, Turma } from './types';
import { getDaysDiff } from './scheduleEngine';

const ROLE_ORDER: Record<string, number> = {
  Supervisor: 1,
  'Chefe Mecânica': 2,
  Coordenador: 3,
  Mecânico: 4,
  'Assistente Mecânico': 5,
  Outros: 6,
};

/**
 * Sort by role hierarchy, then pair opposite 14×14 shifts within each role.
 */
export function sortCollaborators(
  collaborators: Collaborator[],
  turmas: Turma[],
): Collaborator[] {
  const uniqueByNameMap = new Map<string, Collaborator>();
  for (const c of collaborators) {
    const key = c.name.trim().toUpperCase().replace(/\s+/g, ' ');
    const existing = uniqueByNameMap.get(key);
    if (!existing) {
      uniqueByNameMap.set(key, c);
    } else {
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const cTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
      if (cTime > existingTime) uniqueByNameMap.set(key, c);
    }
  }

  const list = Array.from(uniqueByNameMap.values());

  const shiftKey = (c: Collaborator): number => {
    const turma = turmas.find((t) => t.id === c.turmaId);
    const base = c.startDate || turma?.baseDate;
    if (!base) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const diff = getDaysDiff(today, base);
    return ((diff % 28) + 28) % 28 < 14 ? 0 : 1;
  };

  return list.sort((a, b) => {
    const ra = ROLE_ORDER[a.role] ?? 99;
    const rb = ROLE_ORDER[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    const sa = shiftKey(a);
    const sb = shiftKey(b);
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}
