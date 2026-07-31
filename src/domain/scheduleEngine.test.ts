import { describe, expect, it } from 'vitest';
import {
  CYCLE_LENGTH,
  DAYS_ON,
  compareEvents,
  datesOverlap,
  findEventConflicts,
  getBaselineStatus,
  getDaysDiff,
  isValidDateRange,
  pickWinningEvent,
  resolveDayStatus,
} from './scheduleEngine';
import type { Collaborator, ScheduleEvent, Turma } from './types';

const turma: Turma = { id: 'turma-a', name: 'A', baseDate: '2026-08-01' };
const colab: Collaborator = {
  id: 'c1',
  name: 'Teste',
  role: 'Mecânico',
  turmaId: 'turma-a',
  active: true,
};

describe('scheduleEngine 14x14', () => {
  it('getDaysDiff is calendar-safe', () => {
    expect(getDaysDiff('2026-08-01', '2026-08-01')).toBe(0);
    expect(getDaysDiff('2026-08-15', '2026-08-01')).toBe(14);
    expect(getDaysDiff('2026-07-31', '2026-08-01')).toBe(-1);
  });

  it('baseline: first 14 days Escala, next 14 Folga', () => {
    expect(getBaselineStatus('2026-08-01', colab, turma)).toBe('Escala');
    expect(getBaselineStatus('2026-08-14', colab, turma)).toBe('Escala');
    expect(getBaselineStatus('2026-08-15', colab, turma)).toBe('Folga');
    expect(getBaselineStatus('2026-08-28', colab, turma)).toBe('Folga');
    expect(getBaselineStatus('2026-08-29', colab, turma)).toBe('Escala');
  });

  it('uses collaborator startDate over turma baseDate', () => {
    const c = { ...colab, startDate: '2026-08-05' };
    expect(getBaselineStatus('2026-08-05', c, turma)).toBe('Escala');
    expect(getBaselineStatus('2026-08-18', c, turma)).toBe('Escala');
    expect(getBaselineStatus('2026-08-19', c, turma)).toBe('Folga');
  });

  it('returns Folga when no anchor', () => {
    const c = { ...colab, startDate: undefined };
    expect(getBaselineStatus('2026-08-01', c, null)).toBe('Folga');
  });

  it('cycle constants', () => {
    expect(CYCLE_LENGTH).toBe(DAYS_ON + 14);
  });
});

describe('event priority', () => {
  const base = {
    collaboratorId: 'c1',
    startDate: '2026-08-10',
    endDate: '2026-08-12',
  };

  it('Dobra beats Férias', () => {
    const ferias: ScheduleEvent = {
      ...base,
      id: 'f',
      status: 'Férias',
      updatedAt: '2026-01-01',
    };
    const dobra: ScheduleEvent = {
      ...base,
      id: 'd',
      status: 'Dobra',
      updatedAt: '2026-01-01',
    };
    expect(pickWinningEvent([ferias, dobra], '2026-08-11')?.status).toBe('Dobra');
  });

  it('Férias beats No Show', () => {
    const noshow: ScheduleEvent = { ...base, id: 'n', status: 'No Show' };
    const ferias: ScheduleEvent = { ...base, id: 'f', status: 'Férias' };
    expect(pickWinningEvent([noshow, ferias], '2026-08-11')?.status).toBe('Férias');
  });

  it('newer updatedAt wins same priority', () => {
    const a: ScheduleEvent = {
      ...base,
      id: 'a',
      status: 'Dobra',
      updatedAt: '2026-01-01T10:00:00Z',
    };
    const b: ScheduleEvent = {
      ...base,
      id: 'b',
      status: 'Dobra',
      updatedAt: '2026-02-01T10:00:00Z',
    };
    expect(compareEvents(a, b)).toBeGreaterThan(0);
    expect(pickWinningEvent([a, b], '2026-08-11')?.id).toBe('b');
  });

  it('resolveDayStatus falls back to baseline', () => {
    const r = resolveDayStatus('2026-08-01', colab, turma, []);
    expect(r.status).toBe('Escala');
    expect(r.event).toBeUndefined();
  });
});

describe('overlap helpers', () => {
  it('datesOverlap', () => {
    expect(datesOverlap('2026-08-01', '2026-08-10', '2026-08-10', '2026-08-20')).toBe(true);
    expect(datesOverlap('2026-08-01', '2026-08-05', '2026-08-06', '2026-08-10')).toBe(false);
  });

  it('isValidDateRange', () => {
    expect(isValidDateRange('2026-08-01', '2026-08-01')).toBe(true);
    expect(isValidDateRange('2026-08-02', '2026-08-01')).toBe(false);
  });

  it('findEventConflicts detects overlap', () => {
    const existing: ScheduleEvent[] = [
      {
        id: 'e1',
        collaboratorId: 'c1',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        status: 'Dobra',
      },
    ];
    const conflicts = findEventConflicts(
      { collaboratorId: 'c1', startDate: '2026-08-05', endDate: '2026-08-07', status: 'Férias' },
      existing,
    );
    expect(conflicts).toHaveLength(1);
  });

  it('findEventConflicts ignores self id', () => {
    const existing: ScheduleEvent[] = [
      {
        id: 'e1',
        collaboratorId: 'c1',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        status: 'Dobra',
      },
    ];
    expect(
      findEventConflicts(
        {
          id: 'e1',
          collaboratorId: 'c1',
          startDate: '2026-08-01',
          endDate: '2026-08-05',
          status: 'Dobra',
        },
        existing,
      ),
    ).toHaveLength(0);
  });
});
