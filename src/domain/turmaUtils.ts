import type { Turma } from './types';

export const DEFAULT_TURMAS: Turma[] = [
  { id: 'turma-a', name: 'Turma A', baseDate: '2026-08-01' },
  { id: 'turma-b', name: 'Turma B', baseDate: '2026-08-15' },
  { id: 'turma-c', name: 'Turma C', baseDate: '2026-08-01' },
  { id: 'turma-d', name: 'Turma D', baseDate: '2026-08-15' },
];

const DAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const;
const DAY_FULL = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

export function getDayNameFromDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function getFullDayNameFromDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAY_FULL[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function extractTurmaLetter(str?: string): 'A' | 'B' | 'C' | 'D' | null {
  if (!str) return null;
  const m = str.toUpperCase().match(/\b([ABCD])\b/);
  return m ? (m[1] as 'A' | 'B' | 'C' | 'D') : null;
}

export function getTurmaLetterForCollaborator(
  colab: { turmaId?: string },
  turmasList: Turma[],
): 'A' | 'B' | 'C' | 'D' {
  const turma = turmasList.find((t) => t.id === colab.turmaId);
  return extractTurmaLetter(turma?.name) || extractTurmaLetter(colab.turmaId) || 'A';
}
