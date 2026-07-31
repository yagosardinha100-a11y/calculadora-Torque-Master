import type { Turma } from '../types';
import { getTurmasFromFirestore } from '../services/teams';

export const DEFAULT_TURMAS: Turma[] = [
  { id: 'turma-a', name: 'Turma A', baseDate: '2026-08-01' },
  { id: 'turma-b', name: 'Turma B', baseDate: '2026-08-06' },
  { id: 'turma-c', name: 'Turma C', baseDate: '2026-08-07' },
  { id: 'turma-d', name: 'Turma D', baseDate: '2026-08-14' },
];

const DAY_ABBRS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const FULL_DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

/**
 * Returns the day of week abbreviation (DOM, SEG, TER, QUA, QUI, SEX, SÁB) for a date string YYYY-MM-DD
 */
export function getDayNameFromDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d.getTime())) return '';
  return DAY_ABBRS[d.getDay()];
}

/**
 * Returns full day name (e.g., Terça-feira) for a date string YYYY-MM-DD
 */
export function getFullDayNameFromDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d.getTime())) return '';
  return FULL_DAYS[d.getDay()];
}

/**
 * Returns default Turma ID (turma-a, turma-b, etc.) if needed
 */
export async function getDefaultTurmaId(): Promise<string> {
  const turmas = await getTurmasFromFirestore();
  if (turmas && turmas.length > 0) return turmas[0].id;
  return 'turma-a';
}

/**
 * Extracts letter 'A' | 'B' | 'C' | 'D' from any string representation of a turma name or ID
 */
export function extractTurmaLetter(str?: string): 'A' | 'B' | 'C' | 'D' | null {
  if (!str) return null;
  const s = String(str).trim().toUpperCase();
  if (s === 'A' || s === 'B' || s === 'C' || s === 'D') return s as 'A' | 'B' | 'C' | 'D';

  const match = s.match(/(?:TURMA[-_\s]*)?([A-D])\b/i);
  if (match) {
    return match[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
  }
  return null;
}

/**
 * Robustly maps any collaborator to one of the 4 standard turmas ('A', 'B', 'C', or 'D')
 */
export function getTurmaLetterForCollaborator(colab: { turmaId?: string }, turmasList: Turma[]): 'A' | 'B' | 'C' | 'D' {
  const colabTurmaId = String(colab.turmaId || '').trim();

  // 1. Try to find matching Turma object in turmasList by ID
  const foundTurma = turmasList.find(t => String(t.id).trim() === colabTurmaId);
  if (foundTurma) {
    const letterFromName = extractTurmaLetter(foundTurma.name);
    if (letterFromName) return letterFromName;
    const letterFromId = extractTurmaLetter(foundTurma.id);
    if (letterFromId) return letterFromId;
  }

  // 2. Try direct extraction on colab.turmaId string itself
  const letterFromColabId = extractTurmaLetter(colabTurmaId);
  if (letterFromColabId) return letterFromColabId;

  // 3. Fallback for numeric IDs (1 -> A, 2 -> B, 3 -> C, 4 -> D)
  if (colabTurmaId === '1') return 'A';
  if (colabTurmaId === '2') return 'B';
  if (colabTurmaId === '3') return 'C';
  if (colabTurmaId === '4') return 'D';

  return 'A'; // Safe default fallback
}



