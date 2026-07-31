import type { Collaborator, Turma } from '../types';

const ROLE_ORDER: Record<string, number> = {
  'Supervisor': 1,
  'Chefe Mecânica': 2,
  'Coordenador': 3,
  'Mecânico': 4,
  'Assistente Mecânico': 5,
  'Outros': 6,
};

function getDaysDiff(targetDateStr: string, baseDateStr: string): number {
  const [y1, m1, d1] = targetDateStr.split('-').map(Number);
  const [y2, m2, d2] = baseDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

/**
 * Sorts collaborators by:
 * 1. Role (Função) hierarchy (Supervisor -> Chefe Mecânica -> Mecânico -> Assistente Mecânico -> Outros)
 * 2. Within each role, groups/pairs people in opposite schedules (14x14 opposite shifts)
 */
export function sortCollaborators(collaborators: Collaborator[], turmas: Turma[]): Collaborator[] {
  // Deduplicate by normalized name on-the-fly for display safety
  const uniqueByNameMap = new Map<string, Collaborator>();
  for (const c of collaborators) {
    const key = c.name.trim().toUpperCase().replace(/\s+/g, ' ');
    const existing = uniqueByNameMap.get(key);
    if (!existing) {
      uniqueByNameMap.set(key, c);
    } else {
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const cTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
      if (cTime > existingTime) {
        uniqueByNameMap.set(key, c);
      }
    }
  }

  const uniqueCollaborators = Array.from(uniqueByNameMap.values());
  const turmaMap = new Map(turmas.map(t => [t.id, t]));
  const epochDate = '2026-08-01';

  return [...uniqueCollaborators].sort((a, b) => {
    // 1. Sort by Role hierarchy
    const roleRankA = ROLE_ORDER[a.role] ?? 99;
    const roleRankB = ROLE_ORDER[b.role] ?? 99;
    if (roleRankA !== roleRankB) {
      return roleRankA - roleRankB;
    }

    // 2. Calculate shift cycle phase for each collaborator
    const baseDateA = a.startDate || turmaMap.get(a.turmaId)?.baseDate || epochDate;
    const baseDateB = b.startDate || turmaMap.get(b.turmaId)?.baseDate || epochDate;

    const diffA = getDaysDiff(baseDateA, epochDate);
    const diffB = getDaysDiff(baseDateB, epochDate);

    // Normalize phase to 0..27 cycle
    const phaseA = ((diffA % 28) + 28) % 28;
    const phaseB = ((diffB % 28) + 28) % 28;

    // Shift pair group identifier (phase % 14) so that opposite shifts (0 vs 14) group together
    const pairGroupA = phaseA % 14;
    const pairGroupB = phaseB % 14;

    if (pairGroupA !== pairGroupB) {
      return pairGroupA - pairGroupB;
    }

    // Opposite rank: 0 for on-board (phase < 14), 1 for off-board/opposite (phase >= 14)
    const oppositeRankA = Math.floor(phaseA / 14);
    const oppositeRankB = Math.floor(phaseB / 14);

    if (oppositeRankA !== oppositeRankB) {
      return oppositeRankA - oppositeRankB;
    }

    // 3. Alphabetical by name if same role and same shift group/phase
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}
