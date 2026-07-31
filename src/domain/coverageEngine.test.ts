import { describe, expect, it } from 'vitest';
import {
  analyzeVacationCoverage,
  MAX_PROLONG_DAYS,
  MIN_FOLGA_AFTER_ANTICIPATE,
  TARGET_POB,
} from './coverageEngine';
import type { Collaborator, Turma } from './types';

const turmaA: Turma = { id: 'turma-a', name: 'Turma A', baseDate: '2026-08-04' }; // Terça
const turmaB: Turma = { id: 'turma-b', name: 'Turma B', baseDate: '2026-08-06' }; // Quinta (defasagem +2)

function colab(
  id: string,
  name: string,
  role: Collaborator['role'],
  turmaId: string,
  startDate?: string,
): Collaborator {
  return { id, name, role, turmaId, active: true, startDate };
}

describe('analyzeVacationCoverage', () => {
  const vacationer = colab('v1', 'João Ausente', 'Mecânico', 'turma-a');

  // Férias alinhadas: cycleDay 26 da turma A (base 2026-08-04)
  // cycle 0: embarque 04/08..17/08, folga 18/08..31/08 → day 26 = 30/08
  const vacationStart = '2026-08-30';
  const vacationEnd = '2026-09-28'; // 30 dias

  it('gera duas semanas e escolhe pessoas distintas', () => {
    const team: Collaborator[] = [
      vacationer,
      colab('c1', 'Pedro Prolong', 'Mecânico', 'turma-a'), // mesma turma: alinhado
      colab('c2', 'Ana Antecipa', 'Mecânico', 'turma-b'), // defasagem 2d
      colab('c3', 'Carlos Extra', 'Mecânico', 'turma-b'),
      colab('c4', 'Lia Chefe', 'Chefe Mecânica', 'turma-a'),
      colab('c5', 'Rui Assist', 'Assistente Mecânico', 'turma-a'),
    ];

    const result = analyzeVacationCoverage(
      vacationer,
      vacationStart,
      vacationEnd,
      team,
      [turmaA, turmaB],
      [],
      [],
      'FULL',
    );

    expect(result.slots).toHaveLength(2);
    expect(result.missedWorkStart).toBe('2026-09-01');
    expect(result.missedWorkEnd).toBe('2026-09-14');
    expect(result.targetPob).toBe(TARGET_POB);
    expect(result.best).not.toBeNull();

    if (result.best?.week1 && result.best?.week2) {
      expect(result.best.week1.collaborator.id).not.toBe(result.best.week2.collaborator.id);
      expect(result.best.week1.prolongDays).toBeLessThanOrEqual(MAX_PROLONG_DAYS);
      expect(result.best.week2.remainingFolgaDays).toBeGreaterThanOrEqual(MIN_FOLGA_AFTER_ANTICIPATE);
    }
  });

  it('respeita prolongamento máximo de 7 dias', () => {
    const cover = colab('c1', 'Pedro', 'Mecânico', 'turma-a');
    const result = analyzeVacationCoverage(
      vacationer,
      vacationStart,
      vacationEnd,
      [vacationer, cover, colab('c2', 'Outro', 'Mecânico', 'turma-b')],
      [turmaA, turmaB],
      [],
      [],
      'FULL',
    );

    for (const combo of result.combinations) {
      for (const action of [combo.week1, combo.week2]) {
        if (!action) continue;
        expect(action.prolongDays).toBeLessThanOrEqual(MAX_PROLONG_DAYS);
        expect(getDaysDiffSafe(action.startDate, action.endDate) + 1).toBeLessThanOrEqual(7);
      }
    }
  });

  it('antecipação mantém pelo menos 7 dias de folga', () => {
    const team = [
      vacationer,
      colab('c1', 'A', 'Mecânico', 'turma-a'),
      colab('c2', 'B', 'Mecânico', 'turma-b'),
    ];
    const result = analyzeVacationCoverage(
      vacationer,
      vacationStart,
      vacationEnd,
      team,
      [turmaA, turmaB],
      [],
      [],
      'FULL',
    );

    for (const combo of result.combinations) {
      for (const action of [combo.week1, combo.week2]) {
        if (!action || action.strategy !== 'anticipate') continue;
        expect(action.remainingFolgaDays).toBeGreaterThanOrEqual(MIN_FOLGA_AFTER_ANTICIPATE);
      }
    }
  });

  it('trata defasagem terça×quinta com cobertura parcial possível', () => {
    // Coverer com base +2 dias: overlap incompleto é aceitável
    const coverOffset = colab('c-off', 'Defasado', 'Mecânico', 'turma-b');
    const coverAligned = colab('c-aln', 'Alinhado', 'Mecânico', 'turma-a');

    const result = analyzeVacationCoverage(
      vacationer,
      vacationStart,
      vacationEnd,
      [vacationer, coverOffset, coverAligned],
      [turmaA, turmaB],
      [],
      [],
      'FULL',
    );

    expect(result.slots.length).toBe(2);
    const partial = result.slots
      .flatMap((s) => s.actions)
      .find((a) => a.lagDays > 0 && a.coveredDays > 0);
    // Com turmas defasadas, ao menos uma ação parcial deve existir
    expect(partial || result.best).toBeTruthy();
  });

  it('não permite a mesma pessoa nas duas semanas na melhor combinação', () => {
    const team = [
      vacationer,
      colab('c1', 'Só Um Bom', 'Mecânico', 'turma-a'),
      colab('c2', 'Segundo', 'Mecânico', 'turma-b'),
    ];
    const result = analyzeVacationCoverage(
      vacationer,
      vacationStart,
      vacationEnd,
      team,
      [turmaA, turmaB],
      [],
      [],
      'FULL',
    );

    if (result.best?.week1 && result.best?.week2) {
      expect(result.best.week1.collaborator.id).not.toBe(result.best.week2.collaborator.id);
    }
  });

  it('SELL_10 retorna apenas uma semana de cobertura', () => {
    const result = analyzeVacationCoverage(
      vacationer,
      vacationStart,
      vacationEnd,
      [
        vacationer,
        colab('c1', 'A', 'Mecânico', 'turma-a'),
        colab('c2', 'B', 'Mecânico', 'turma-b'),
      ],
      [turmaA, turmaB],
      [],
      [],
      'SELL_10',
    );
    expect(result.slots).toHaveLength(1);
  });

  it('SELL_ALL não exige cobertura', () => {
    const result = analyzeVacationCoverage(
      vacationer,
      vacationStart,
      vacationEnd,
      [vacationer],
      [turmaA],
      [],
      [],
      'SELL_ALL',
    );
    expect(result.slots).toHaveLength(0);
    expect(result.best).toBeNull();
  });
});

function getDaysDiffSafe(start: string, end: string): number {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  return Math.floor((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
