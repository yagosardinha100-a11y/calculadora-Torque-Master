/**
 * Publicação unificada de férias → eventos da escala.
 */

import type { Collaborator, ScheduleEvent, VacationPlan } from './types';
import { datesOverlap, findEventConflicts } from './scheduleEngine';

export function buildVacationScheduleEvents(
  plan: VacationPlan,
  vacationerName: string,
): ScheduleEvent[] {
  const nowIso = new Date().toISOString();
  const newEvents: ScheduleEvent[] = [];

  if (plan.vacationType !== 'SELL_ALL') {
    let absenceStart = plan.startDate;
    if (plan.vacationType === 'SELL_10' && plan.boardingEnd) {
      const next = new Date(plan.boardingEnd + 'T12:00:00');
      next.setDate(next.getDate() + 1);
      absenceStart = next.toISOString().slice(0, 10);
    }

    if (absenceStart <= plan.endDate) {
      newEvents.push({
        id: `event-vacation-${plan.id}`,
        collaboratorId: plan.collaboratorId,
        startDate: absenceStart,
        endDate: plan.endDate,
        status: 'Férias',
        note: plan.note ? `Férias: ${plan.note}` : 'Férias Programadas',
        vacationPlanId: plan.id,
        updatedAt: nowIso,
      });
    }
  }

  plan.coverages.forEach((cov, idx) => {
    if (cov.collaboratorId && cov.startDate && cov.endDate && cov.startDate <= cov.endDate) {
      newEvents.push({
        id: `event-cov-${plan.id}-${idx}`,
        collaboratorId: cov.collaboratorId,
        startDate: cov.startDate,
        endDate: cov.endDate,
        status: 'Dobra',
        motive: `Cobertura de Férias de ${vacationerName}`,
        note: cov.note || `Dobra para Cobertura de Férias (${vacationerName})`,
        vacationPlanId: plan.id,
        updatedAt: nowIso,
      });
    }
  });

  return newEvents;
}

export interface VacationPublishConflict {
  message: string;
  event?: ScheduleEvent;
}

/**
 * Detecta conflitos com eventos que NÃO pertencem a este plano de férias.
 */
export function findVacationPublishConflicts(
  plan: VacationPlan,
  proposed: ScheduleEvent[],
  existingEvents: ScheduleEvent[],
): VacationPublishConflict[] {
  const others = existingEvents.filter((e) => e.vacationPlanId !== plan.id);
  const conflicts: VacationPublishConflict[] = [];

  for (const candidate of proposed) {
    const found = findEventConflicts(candidate, others);
    for (const c of found) {
      conflicts.push({
        event: c.event,
        message: `${candidate.status} (${candidate.startDate}→${candidate.endDate}): ${c.message}`,
      });
    }
  }

  // Coberturas sobrepostas entre si
  for (let i = 0; i < proposed.length; i++) {
    for (let j = i + 1; j < proposed.length; j++) {
      const a = proposed[i];
      const b = proposed[j];
      if (
        a.collaboratorId === b.collaboratorId &&
        datesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)
      ) {
        conflicts.push({
          message: `Coberturas sobrepostas para o mesmo colaborador (${a.startDate}→${a.endDate} e ${b.startDate}→${b.endDate}).`,
        });
      }
    }
  }

  return conflicts;
}

export function requireVacationAnchor(
  collaborator: Collaborator | undefined,
  turmaBaseDate?: string,
): string | null {
  if (!collaborator) return 'Colaborador não encontrado.';
  if (!collaborator.startDate && !turmaBaseDate) {
    return 'Defina a data de embarque do colaborador ou a data base da turma antes de programar férias.';
  }
  return null;
}
