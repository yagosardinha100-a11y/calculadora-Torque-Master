import type { VacationPlan, ScheduleEvent } from '../types';
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

export async function saveVacationPlan(
  data: Omit<VacationPlan, 'status' | 'createdAt'> & { status?: 'draft' | 'confirmed'; id?: string }
): Promise<string> {
  const planId = data.id || crypto.randomUUID();
  const existingVacations = await getVacationsFromFirestore();
  const existing = existingVacations.find(v => v.id === planId);
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
  const plan = existingVacations.find(v => v.id === planId);
  if (!plan) return;

  const updatedPlan = { ...plan, status: 'confirmed' as const, updatedAt: new Date().toISOString() };
  await updateVacationInFirestore(planId, { status: 'confirmed' });
  await publishVacationEventsToSchedule(updatedPlan);
}

export async function unconfirmVacation(planId: string): Promise<void> {
  const existingVacations = await getVacationsFromFirestore();
  const plan = existingVacations.find(v => v.id === planId);
  if (!plan) return;

  await updateVacationInFirestore(planId, { status: 'draft' });
  await removeVacationEventsFromSchedule(planId);
}

export async function deleteVacationPlan(planId: string): Promise<void> {
  await removeVacationEventsFromSchedule(planId);
  await deleteVacationFromFirestore(planId);
}

async function removeVacationEventsFromSchedule(planId: string): Promise<void> {
  const allEvents = await getEventsFromFirestore();
  const events = allEvents.filter(e => e.vacationPlanId === planId);
  for (const e of events) {
    await deleteEventFromFirestore(e.id);
  }
}

async function publishVacationEventsToSchedule(plan: VacationPlan): Promise<void> {
  await removeVacationEventsFromSchedule(plan.id);

  const colabs = await getCollaboratorsFromFirestore();
  const vacationer = colabs.find(c => c.id === plan.collaboratorId);
  const vacationerName = vacationer ? vacationer.name : 'Colaborador';
  const nowIso = new Date().toISOString();

  const newEvents: ScheduleEvent[] = [
    {
      id: `event-vacation-${plan.id}`,
      collaboratorId: plan.collaboratorId,
      startDate: plan.startDate,
      endDate: plan.endDate,
      status: 'Férias',
      note: plan.note ? `Férias: ${plan.note}` : 'Férias Programadas',
      vacationPlanId: plan.id,
      updatedAt: nowIso,
    },
  ];

  plan.coverages.forEach((cov, idx) => {
    if (cov.collaboratorId && cov.startDate && cov.endDate) {
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

  for (const evt of newEvents) {
    await createEventInFirestore(evt);
  }
}
