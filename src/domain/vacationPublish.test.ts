import { describe, expect, it } from 'vitest';
import {
  buildVacationScheduleEvents,
  findVacationPublishConflicts,
  requireVacationAnchor,
} from './vacationPublish';
import type { Collaborator, ScheduleEvent, VacationPlan } from './types';

const planBase: VacationPlan = {
  id: 'v1',
  collaboratorId: 'c1',
  startDate: '2026-08-15',
  endDate: '2026-09-13',
  status: 'draft',
  createdAt: '2026-01-01',
  coverages: [],
  vacationType: 'FULL',
};

describe('vacationPublish', () => {
  it('builds Férias event for FULL plan', () => {
    const events = buildVacationScheduleEvents(planBase, 'Ana');
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('Férias');
    expect(events[0].startDate).toBe('2026-08-15');
    expect(events[0].vacationPlanId).toBe('v1');
  });

  it('SELL_ALL creates no absence event', () => {
    const events = buildVacationScheduleEvents(
      { ...planBase, vacationType: 'SELL_ALL' },
      'Ana',
    );
    expect(events).toHaveLength(0);
  });

  it('includes coverage Dobra events', () => {
    const events = buildVacationScheduleEvents(
      {
        ...planBase,
        coverages: [
          {
            id: 'cov1',
            collaboratorId: 'c2',
            startDate: '2026-08-15',
            endDate: '2026-08-21',
          },
        ],
      },
      'Ana',
    );
    expect(events).toHaveLength(2);
    expect(events[1].status).toBe('Dobra');
    expect(events[1].collaboratorId).toBe('c2');
  });

  it('detects conflict with unrelated events', () => {
    const proposed = buildVacationScheduleEvents(planBase, 'Ana');
    const existing: ScheduleEvent[] = [
      {
        id: 'e1',
        collaboratorId: 'c1',
        startDate: '2026-08-20',
        endDate: '2026-08-22',
        status: 'Treinamento',
      },
    ];
    const conflicts = findVacationPublishConflicts(planBase, proposed, existing);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('ignores events from the same vacation plan', () => {
    const proposed = buildVacationScheduleEvents(planBase, 'Ana');
    const existing: ScheduleEvent[] = [
      {
        id: 'event-vacation-v1',
        collaboratorId: 'c1',
        startDate: '2026-08-15',
        endDate: '2026-09-13',
        status: 'Férias',
        vacationPlanId: 'v1',
      },
    ];
    expect(findVacationPublishConflicts(planBase, proposed, existing)).toHaveLength(0);
  });

  it('requireVacationAnchor', () => {
    const colab: Collaborator = {
      id: 'c1',
      name: 'Ana',
      role: 'Mecânico',
      turmaId: 't1',
      active: true,
    };
    expect(requireVacationAnchor(colab)).toMatch(/data/);
    expect(requireVacationAnchor({ ...colab, startDate: '2026-08-01' })).toBeNull();
    expect(requireVacationAnchor(colab, '2026-08-01')).toBeNull();
  });
});
