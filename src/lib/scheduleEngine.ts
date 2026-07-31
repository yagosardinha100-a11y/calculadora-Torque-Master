/**
 * Motor de escala 14×14 + resolução de status por dia.
 * Extraído para testes e uso compartilhado (hook + férias).
 */

import type { Collaborator, ScheduleEvent, Status, Turma } from '../types';

export const CYCLE_LENGTH = 28;
export const DAYS_ON = 14;
export const DAYS_OFF = 14;

/** Prioridade: maior vence. Baseline (sem evento) = 0. */
export const STATUS_PRIORITY: Record<Status, number> = {
  Folga: 0,
  Escala: 1,
  'No Show': 2,
  'Exame Médico': 3,
  Treinamento: 4,
  Férias: 5,
  Dobra: 6,
};

export function getDaysDiff(targetDateStr: string, baseDateStr: string): number {
  const [y1, m1, d1] = targetDateStr.split('-').map(Number);
  const [y2, m2, d2] = baseDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

export function getBaselineStatus(
  dateStr: string,
  colab: Collaborator,
  turma?: Turma | null,
): Status {
  const baseDateStr = colab.startDate || turma?.baseDate;
  if (!baseDateStr) return 'Folga';

  const diff = getDaysDiff(dateStr, baseDateStr);
  const cycleDay = ((diff % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  return cycleDay < DAYS_ON ? 'Escala' : 'Folga';
}

export function eventCoversDate(event: ScheduleEvent, dateStr: string): boolean {
  return dateStr >= event.startDate && dateStr <= event.endDate;
}

export function compareEvents(a: ScheduleEvent, b: ScheduleEvent): number {
  const pDiff = STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status];
  if (pDiff !== 0) return pDiff;
  const aUpdated = a.updatedAt || '';
  const bUpdated = b.updatedAt || '';
  if (aUpdated !== bUpdated) return bUpdated > aUpdated ? 1 : -1;
  return b.id.localeCompare(a.id);
}

/** Escolhe o evento vencedor para um dia. */
export function pickWinningEvent(
  events: ScheduleEvent[],
  dateStr: string,
): ScheduleEvent | undefined {
  const covering = events.filter((e) => eventCoversDate(e, dateStr));
  if (covering.length === 0) return undefined;
  return [...covering].sort(compareEvents)[0];
}

export function resolveDayStatus(
  dateStr: string,
  colab: Collaborator,
  turma: Turma | null | undefined,
  events: ScheduleEvent[],
): { status: Status; event?: ScheduleEvent; baseline: Status } {
  const baseline = getBaselineStatus(dateStr, colab, turma);
  const event = pickWinningEvent(events, dateStr);
  return {
    baseline,
    event,
    status: event ? event.status : baseline,
  };
}

export function isOnboardStatus(status: Status): boolean {
  return status === 'Escala' || status === 'Dobra';
}

export function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function isValidDateRange(startDate: string, endDate: string): boolean {
  return Boolean(startDate && endDate && startDate <= endDate);
}

export interface EventConflict {
  event: ScheduleEvent;
  message: string;
}

/** Conflitos de overlap para um novo/editado evento (ignora o próprio id). */
export function findEventConflicts(
  candidate: Pick<ScheduleEvent, 'collaboratorId' | 'startDate' | 'endDate' | 'status'> & {
    id?: string;
  },
  existing: ScheduleEvent[],
): EventConflict[] {
  if (!isValidDateRange(candidate.startDate, candidate.endDate)) {
    return [
      {
        event: candidate as ScheduleEvent,
        message: 'Data inicial deve ser anterior ou igual à data final.',
      },
    ];
  }

  return existing
    .filter(
      (e) =>
        e.collaboratorId === candidate.collaboratorId &&
        e.id !== candidate.id &&
        datesOverlap(candidate.startDate, candidate.endDate, e.startDate, e.endDate),
    )
    .map((e) => ({
      event: e,
      message: `Sobreposição com ${e.status} (${e.startDate} → ${e.endDate}).`,
    }));
}
