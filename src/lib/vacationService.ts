/**
 * Camada legada — preferir mutações via DataContext.
 * Mantida para compatibilidade; usa o publisher unificado.
 */

import type { VacationPlan } from '../types';
import {
  createVacationInFirestore,
  updateVacationInFirestore,
  deleteVacationFromFirestore,
  getVacationsFromFirestore,
} from '../services/vacations';
import {
  createEventInFirestore,
  deleteEventFromFirestore,
  getEventsFromFirestore,
} from '../services/events';
import { getCollaboratorsFromFirestore } from '../services/collaborators';
import {
  buildVacationScheduleEvents,
  findVacationPublishConflicts,
} from './vacationPublish';

export async function saveVacationPlan(
  data: Omit<VacationPlan, 'status' | 'createdAt'> & {
    status?: 'draft' | 'confirmed';
    id?: string;
  },
): Promise<string> {
  const planId = data.id || crypto.randomUUID();
  const existingVacations = await getVacationsFromFirestore();
  const existing = existingVacations.find((v) => v.id === planId);
  const nowIso = new Date().toISOString();

  const plan: VacationPlan = {
    id: planId,
    collaboratorId: data.collaboratorId,
    startDate: data.startDate,
    endDate: data.endDate,
    note: data.note || '',
    coverages: data.coverages || [],
    status: data.status || existing?.status || 'draft',
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    vacationType: data.vacationType ?? existing?.vacationType,
    boardingStart: data.boardingStart ?? existing?.boardingStart,
    boardingEnd: data.boardingEnd ?? existing?.boardingEnd,
    soldDays: data.soldDays ?? existing?.soldDays,
    requiresCoverageTurn1: data.requiresCoverageTurn1 ?? existing?.requiresCoverageTurn1,
    requiresCoverageTurn2: data.requiresCoverageTurn2 ?? existing?.requiresCoverageTurn2,
  };

  if (existing) {
    await updateVacationInFirestore(plan.id, plan);
  } else {
    await createVacationInFirestore(plan);
  }

  if (plan.status === 'confirmed') {
    await publishVacationEventsToSchedule(plan);
  } else {
    await removeVacationEventsFromSchedule(plan.id);
  }

  return planId;
}

export async function confirmAndPublishVacation(planId: string): Promise<void> {
  const existingVacations = await getVacationsFromFirestore();
  const plan = existingVacations.find((v) => v.id === planId);
  if (!plan) return;

  const updatedPlan = {
    ...plan,
    status: 'confirmed' as const,
    updatedAt: new Date().toISOString(),
  };
  await publishVacationEventsToSchedule(updatedPlan);
  await updateVacationInFirestore(planId, { status: 'confirmed' });
}

export async function unconfirmVacation(planId: string): Promise<void> {
  await updateVacationInFirestore(planId, { status: 'draft' });
  await removeVacationEventsFromSchedule(planId);
}

export async function deleteVacationPlan(planId: string): Promise<void> {
  await removeVacationEventsFromSchedule(planId);
  await deleteVacationFromFirestore(planId);
}

async function removeVacationEventsFromSchedule(planId: string): Promise<void> {
  const allEvents = await getEventsFromFirestore();
  const events = allEvents.filter((e) => e.vacationPlanId === planId);
  for (const e of events) {
    await deleteEventFromFirestore(e.id);
  }
}

async function publishVacationEventsToSchedule(plan: VacationPlan): Promise<void> {
  const allEvents = await getEventsFromFirestore();
  const colabs = await getCollaboratorsFromFirestore();
  const vacationer = colabs.find((c) => c.id === plan.collaboratorId);
  const newEvents = buildVacationScheduleEvents(plan, vacationer?.name || 'Colaborador');

  const conflicts = findVacationPublishConflicts(plan, newEvents, allEvents);
  if (conflicts.length > 0) {
    throw new Error(
      `Não foi possível lançar as férias:\n${conflicts.map((c) => c.message).join('\n')}`,
    );
  }

  await removeVacationEventsFromSchedule(plan.id);

  for (const evt of newEvents) {
    await createEventInFirestore(evt);
  }
}
