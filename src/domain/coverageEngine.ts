/**
 * Motor de cobertura de férias (1ª e 2ª semana).
 *
 * Regras da empresa:
 * - Antecipação de embarque: o trabalhador não pode ficar com menos de 7 dias de folga.
 * - Prolongamento de embarque (dobra): no máximo +7 dias.
 * - Funções com base em dias diferentes (ex.: terça vs quinta) geram defasagem;
 *   a cobertura pode ser incompleta, mas cada semana tem no máximo 1 substituto.
 * - Objetivo: manter ~5 pessoas a bordo (POB alvo), escolhendo a melhor combinação.
 */

import type {
  Collaborator,
  ScheduleEvent,
  Turma,
  VacationPlan,
  VacationType,
} from './types';
import {
  getBaselineStatus,
  getDaysDiff,
  isOnboardStatus,
  resolveDayStatus,
} from './scheduleEngine';

function addDaysToStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().split('T')[0];
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

function normalizeRoleKey(role: string): 'chefe' | 'supervisor' | 'mecanico' | 'assistente' | 'other' {
  if (!role) return 'other';
  const norm = role
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (norm.includes('chefe')) return 'chefe';
  if (norm.includes('supervis')) return 'supervisor';
  if (norm.includes('assist')) return 'assistente';
  if (norm.includes('mecanic')) return 'mecanico';
  return 'other';
}

function canRoleCover(substituteRole: string, vacationerRole: string): boolean {
  if (!substituteRole || !vacationerRole) return false;
  const subKey = normalizeRoleKey(substituteRole);
  const vacKey = normalizeRoleKey(vacationerRole);
  if (subKey === 'chefe') return vacKey === 'chefe' || vacKey === 'supervisor';
  if (subKey === 'supervisor') return vacKey === 'supervisor';
  if (subKey === 'mecanico') return vacKey === 'mecanico' || vacKey === 'chefe';
  if (subKey === 'assistente') return vacKey === 'assistente' || vacKey === 'mecanico';
  return subKey === vacKey;
}

export const MAX_PROLONG_DAYS = 7;
export const MIN_FOLGA_AFTER_ANTICIPATE = 7;
export const TARGET_POB = 5;
export const WEEK_DAYS = 7;
export const MISSED_WORK_DAYS = 14;

export type CoverageStrategy = 'prolong' | 'anticipate';

export interface CoverageAction {
  collaborator: Collaborator;
  strategy: CoverageStrategy;
  /** Dias reais de dobra dentro da semana (podem ser < 7 por defasagem). */
  startDate: string;
  endDate: string;
  coveredDays: number;
  /** Dias da semana que ficam sem cobertura por defasagem/offset. */
  lagDays: number;
  weekDays: number;
  score: number;
  reason: string;
  badgeLabel: string;
  embarkWeekday: string;
  vacationerEmbarkWeekday: string;
  remainingFolgaDays: number;
  prolongDays: number;
  isSameRole: boolean;
  hasConflict: boolean;
  conflicts: string[];
}

export interface CoverageWeekSlot {
  slotNumber: 1 | 2;
  title: string;
  subtitle: string;
  strategyHint: CoverageStrategy;
  weekStart: string;
  weekEnd: string;
  daysCount: number;
  recommended: CoverageAction | null;
  actions: CoverageAction[];
}

export interface CoverageCombination {
  week1: CoverageAction | null;
  week2: CoverageAction | null;
  score: number;
  daysAtTargetPob: number;
  totalMissedDays: number;
  avgAbsPobDelta: number;
  uncoveredDays: number;
  summary: string;
  dailyPob: { date: string; pob: number; covered: boolean }[];
}

export interface CoverageAnalysis {
  missedWorkStart: string;
  missedWorkEnd: string;
  targetPob: number;
  slots: CoverageWeekSlot[];
  combinations: CoverageCombination[];
  best: CoverageCombination | null;
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

function weekdayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function datesOverlap(a0: string, a1: string, b0: string, b1: string): boolean {
  return a0 <= b1 && a1 >= b0;
}

function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  const n = getDaysDiff(end, start) + 1;
  for (let i = 0; i < n; i++) days.push(addDaysToStr(start, i));
  return days;
}

function getBaseDate(colab: Collaborator, turmas: Turma[]): string | undefined {
  const turma = turmas.find((t) => t.id === colab.turmaId);
  return colab.startDate || turma?.baseDate;
}

function getCycleDay(dateStr: string, colab: Collaborator, turmas: Turma[]): number | null {
  const base = getBaseDate(colab, turmas);
  if (!base) return null;
  const diff = getDaysDiff(dateStr, base);
  return ((diff % 28) + 28) % 28;
}

/** Próximo dia 0 de escala (embarque) em ou após dateStr. */
function nextEmbarkDate(fromDate: string, colab: Collaborator, turmas: Turma[]): string | null {
  const base = getBaseDate(colab, turmas);
  if (!base) return null;
  for (let i = 0; i < 28; i++) {
    const d = addDaysToStr(fromDate, i);
    if (getCycleDay(d, colab, turmas) === 0) return d;
  }
  return null;
}

/** Último dia de escala (cycleDay 13) em ou antes de dateStr. */
function lastEscalaEndOnOrBefore(
  fromDate: string,
  colab: Collaborator,
  turmas: Turma[],
): string | null {
  const base = getBaseDate(colab, turmas);
  if (!base) return null;
  for (let i = 0; i < 28; i++) {
    const d = addDaysToStr(fromDate, -i);
    if (getCycleDay(d, colab, turmas) === 13) return d;
  }
  return null;
}

function getCandidateConflicts(
  colabId: string,
  slotStart: string,
  slotEnd: string,
  allEvents: ScheduleEvent[],
  allVacations: VacationPlan[],
): string[] {
  const conflicts: string[] = [];
  for (const ev of allEvents) {
    if (
      ev.collaboratorId === colabId &&
      datesOverlap(ev.startDate, ev.endDate, slotStart, slotEnd)
    ) {
      conflicts.push(
        `${ev.status} (${formatDateBR(ev.startDate)} a ${formatDateBR(ev.endDate)}${
          ev.note ? `: ${ev.note}` : ''
        })`,
      );
    }
  }
  for (const vac of allVacations) {
    if (
      vac.collaboratorId === colabId &&
      datesOverlap(vac.startDate, vac.endDate, slotStart, slotEnd)
    ) {
      conflicts.push(`Férias (${formatDateBR(vac.startDate)} a ${formatDateBR(vac.endDate)})`);
    }
  }
  return conflicts;
}

function dayHasConflict(
  colabId: string,
  dateStr: string,
  allEvents: ScheduleEvent[],
  allVacations: VacationPlan[],
): boolean {
  for (const ev of allEvents) {
    if (ev.collaboratorId === colabId && ev.startDate <= dateStr && ev.endDate >= dateStr) {
      return true;
    }
  }
  for (const vac of allVacations) {
    if (vac.collaboratorId === colabId && vac.startDate <= dateStr && vac.endDate >= dateStr) {
      return true;
    }
  }
  return false;
}

/**
 * Prolongamento: estende o embarque em até +7 dias de folga contíguos
 * a partir do dia seguinte ao fim da escala.
 */
function buildProlongAction(
  colab: Collaborator,
  weekStart: string,
  weekEnd: string,
  vacationer: Collaborator,
  turmas: Turma[],
  allEvents: ScheduleEvent[],
  allVacations: VacationPlan[],
): CoverageAction | null {
  if (!canRoleCover(colab.role, vacationer.role)) return null;

  const escalaEnd = lastEscalaEndOnOrBefore(weekStart, colab, turmas);
  if (!escalaEnd) return null;

  // Prolong começa no dia seguinte ao fim da escala
  const prolongStart = addDaysToStr(escalaEnd, 1);
  const maxProlongEnd = addDaysToStr(escalaEnd, MAX_PROLONG_DAYS);

  // Só dias de Folga, sem conflito, até max 7, contíguos a partir de prolongStart
  const coverable: string[] = [];
  for (let i = 0; i < MAX_PROLONG_DAYS; i++) {
    const d = addDaysToStr(prolongStart, i);
    if (d > maxProlongEnd) break;
    const st = getBaselineStatus(d, colab, turmas.find((t) => t.id === colab.turmaId));
    if (st !== 'Folga') break;
    if (dayHasConflict(colab.id, d, allEvents, allVacations)) break;
    coverable.push(d);
  }

  // Interseção com a semana
  const inWeek = coverable.filter((d) => d >= weekStart && d <= weekEnd);
  if (inWeek.length === 0) return null;

  // Cobertura publicada = bloco contíguo na semana (do primeiro ao último dia útil na semana)
  // Preferimos o maior prefixo contíguo a partir do início da interseção alinhado ao prolong
  const startDate = inWeek[0];
  let endDate = startDate;
  for (const d of inWeek) {
    if (getDaysDiff(d, endDate) <= 1) endDate = d;
    else break;
  }
  const coveredDays = getDaysDiff(endDate, startDate) + 1;
  const weekDays = getDaysDiff(weekEnd, weekStart) + 1;
  const lagDays = weekDays - coveredDays;

  const conflicts = getCandidateConflicts(colab.id, startDate, endDate, allEvents, allVacations);
  const isSameRole = colab.role === vacationer.role;
  const prolongDays = coveredDays;
  const remainingFolgaDays = 14 - prolongDays; // folga do ciclo após a dobra

  let score = coveredDays * 12 + (isSameRole ? 15 : 0);
  if (coveredDays === weekDays) score += 40;
  else score += Math.max(0, 25 - lagDays * 8);
  if (lagDays > 0) score -= lagDays * 3;
  if (conflicts.length) score = -100;

  const vacEmbark = nextEmbarkDate(weekStart, vacationer, turmas);
  const colEmbark = nextEmbarkDate(weekStart, colab, turmas) || nextEmbarkDate(addDaysToStr(weekStart, -14), colab, turmas);

  const reason =
    lagDays > 0
      ? `Prolonga +${prolongDays}d (máx. ${MAX_PROLONG_DAYS}). Defasagem de ${lagDays} dia(s) vs semana do ausente (embarque ${weekdayName(colEmbark || prolongStart)} vs ${weekdayName(vacEmbark || weekStart)}).`
      : `Prolonga +${prolongDays}d a partir de ${formatDateBR(startDate)} (já a bordo até ${formatDateBR(escalaEnd)}). Respeita limite de ${MAX_PROLONG_DAYS} dias.`;

  return {
    collaborator: colab,
    strategy: 'prolong',
    startDate,
    endDate,
    coveredDays,
    lagDays,
    weekDays,
    score: conflicts.length ? -100 : score,
    reason,
    badgeLabel:
      coveredDays === weekDays
        ? `Prolonga +${prolongDays}d (semana completa)`
        : `Prolonga +${prolongDays}d (${lagDays}d de defasagem)`,
    embarkWeekday: weekdayName(colEmbark || prolongStart),
    vacationerEmbarkWeekday: weekdayName(vacEmbark || weekStart),
    remainingFolgaDays,
    prolongDays,
    isSameRole,
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Antecipação: embarga até 7 dias antes do próximo embarque,
 * preservando no mínimo 7 dias de folga (14 − antecipação ≥ 7).
 */
function buildAnticipateAction(
  colab: Collaborator,
  weekStart: string,
  weekEnd: string,
  vacationer: Collaborator,
  turmas: Turma[],
  allEvents: ScheduleEvent[],
  allVacations: VacationPlan[],
): CoverageAction | null {
  if (!canRoleCover(colab.role, vacationer.role)) return null;

  const embark = nextEmbarkDate(addDaysToStr(weekEnd, 1), colab, turmas);
  // Também tentar embarque dentro/perto da semana
  const embarkNear =
    nextEmbarkDate(weekStart, colab, turmas) ||
    nextEmbarkDate(addDaysToStr(weekStart, -7), colab, turmas);
  const nextEmbark = embarkNear && embarkNear > weekStart ? embarkNear : embark;
  if (!nextEmbark) return null;

  const maxAnticipate = 14 - MIN_FOLGA_AFTER_ANTICIPATE; // 7
  const earliest = addDaysToStr(nextEmbark, -maxAnticipate);

  const coverable: string[] = [];
  for (let i = maxAnticipate; i >= 1; i--) {
    const d = addDaysToStr(nextEmbark, -i);
    if (d < earliest) continue;
    const st = getBaselineStatus(d, colab, turmas.find((t) => t.id === colab.turmaId));
    if (st !== 'Folga') continue;
    if (dayHasConflict(colab.id, d, allEvents, allVacations)) continue;
    coverable.push(d);
  }
  coverable.sort();

  const inWeek = coverable.filter((d) => d >= weekStart && d <= weekEnd);
  if (inWeek.length === 0) return null;

  // Prefixo/sufixo contíguo alinhado ao embarque (dias imediatamente anteriores ao embark)
  const contiguous: string[] = [];
  for (let i = 1; i <= maxAnticipate; i++) {
    const d = addDaysToStr(nextEmbark, -i);
    if (d < weekStart || d > weekEnd) {
      if (d < weekStart) break;
      continue;
    }
    if (!coverable.includes(d)) break;
    contiguous.unshift(d);
  }
  if (contiguous.length === 0) {
    // fallback: maior bloco contíguo em inWeek
    let best: string[] = [];
    let cur: string[] = [];
    for (const d of inWeek) {
      if (cur.length === 0 || getDaysDiff(d, cur[cur.length - 1]) === 1) {
        cur.push(d);
      } else {
        if (cur.length > best.length) best = cur;
        cur = [d];
      }
    }
    if (cur.length > best.length) best = cur;
    if (best.length === 0) return null;
    contiguous.push(...best);
  }

  const startDate = contiguous[0];
  const endDate = contiguous[contiguous.length - 1];
  const coveredDays = contiguous.length;
  const weekDays = getDaysDiff(weekEnd, weekStart) + 1;
  const lagDays = weekDays - coveredDays;
  const anticipateDays = getDaysDiff(nextEmbark, startDate);
  const remainingFolgaDays = 14 - anticipateDays;

  if (remainingFolgaDays < MIN_FOLGA_AFTER_ANTICIPATE) return null;
  if (anticipateDays > MAX_PROLONG_DAYS) return null;

  const conflicts = getCandidateConflicts(colab.id, startDate, endDate, allEvents, allVacations);
  const isSameRole = colab.role === vacationer.role;

  let score = coveredDays * 12 + (isSameRole ? 15 : 0);
  if (coveredDays === weekDays) score += 40;
  else score += Math.max(0, 25 - lagDays * 8);
  if (lagDays > 0) score -= lagDays * 3;
  if (conflicts.length) score = -100;

  const vacEmbark = nextEmbarkDate(weekStart, vacationer, turmas);

  const reason =
    lagDays > 0
      ? `Antecipa −${anticipateDays}d (folga restante ${remainingFolgaDays}d ≥ ${MIN_FOLGA_AFTER_ANTICIPATE}). Defasagem de ${lagDays} dia(s) (embarque ${weekdayName(nextEmbark)} vs ${weekdayName(vacEmbark || weekStart)}).`
      : `Antecipa −${anticipateDays}d e embarca em ${formatDateBR(startDate)} (escala regular em ${formatDateBR(nextEmbark)}). Folga restante: ${remainingFolgaDays}d.`;

  return {
    collaborator: colab,
    strategy: 'anticipate',
    startDate,
    endDate,
    coveredDays,
    lagDays,
    weekDays,
    score: conflicts.length ? -100 : score,
    reason,
    badgeLabel:
      coveredDays === weekDays
        ? `Antecipa −${anticipateDays}d (semana completa)`
        : `Antecipa −${anticipateDays}d (${lagDays}d de defasagem)`,
    embarkWeekday: weekdayName(nextEmbark),
    vacationerEmbarkWeekday: weekdayName(vacEmbark || weekStart),
    remainingFolgaDays,
    prolongDays: anticipateDays,
    isSameRole,
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

function bestActionForCandidate(
  colab: Collaborator,
  weekStart: string,
  weekEnd: string,
  preferred: CoverageStrategy,
  vacationer: Collaborator,
  turmas: Turma[],
  allEvents: ScheduleEvent[],
  allVacations: VacationPlan[],
): CoverageAction | null {
  const prolong = buildProlongAction(
    colab,
    weekStart,
    weekEnd,
    vacationer,
    turmas,
    allEvents,
    allVacations,
  );
  const anticipate = buildAnticipateAction(
    colab,
    weekStart,
    weekEnd,
    vacationer,
    turmas,
    allEvents,
    allVacations,
  );

  const options = [prolong, anticipate].filter(Boolean) as CoverageAction[];
  if (options.length === 0) return null;

  options.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.coveredDays !== a.coveredDays) return b.coveredDays - a.coveredDays;
    // Prefer preferred strategy on tie
    if (a.strategy === preferred && b.strategy !== preferred) return -1;
    if (b.strategy === preferred && a.strategy !== preferred) return 1;
    return a.collaborator.name.localeCompare(b.collaborator.name, 'pt-BR');
  });

  return options[0];
}

function computeDailyPob(
  missedStart: string,
  missedEnd: string,
  vacationer: Collaborator,
  team: Collaborator[],
  turmas: Turma[],
  events: ScheduleEvent[],
  coverWeek1: CoverageAction | null,
  coverWeek2: CoverageAction | null,
): { date: string; pob: number; covered: boolean }[] {
  const covers = [coverWeek1, coverWeek2].filter(Boolean) as CoverageAction[];
  const result: { date: string; pob: number; covered: boolean }[] = [];

  for (const date of eachDay(missedStart, missedEnd)) {
    let pob = 0;
    let covered = false;

    for (const colab of team) {
      if (colab.id === vacationer.id) continue; // de férias / ausente
      const turma = turmas.find((t) => t.id === colab.turmaId);
      const { status } = resolveDayStatus(date, colab, turma, events);
      let onboard = isOnboardStatus(status);

      // Aplicar dobra de cobertura sugerida
      for (const cov of covers) {
        if (cov.collaborator.id === colab.id && date >= cov.startDate && date <= cov.endDate) {
          onboard = true;
          covered = true;
        }
      }

      if (onboard) pob++;
    }

    result.push({ date, pob, covered });
  }

  return result;
}

function scoreCombination(
  week1: CoverageAction | null,
  week2: CoverageAction | null,
  dailyPob: { date: string; pob: number; covered: boolean }[],
): { score: number; daysAtTargetPob: number; avgAbsPobDelta: number; uncoveredDays: number; summary: string } {
  const total = dailyPob.length || 1;
  const daysAtTargetPob = dailyPob.filter((d) => d.pob === TARGET_POB).length;
  const uncoveredDays = dailyPob.filter((d) => !d.covered).length;
  const avgAbsPobDelta =
    dailyPob.reduce((acc, d) => acc + Math.abs(d.pob - TARGET_POB), 0) / total;

  let score = daysAtTargetPob * 100;
  score -= avgAbsPobDelta * 40;
  score -= uncoveredDays * 18;

  if (week1) {
    score += week1.score * 0.5;
    score += week1.coveredDays * 5;
    if (week1.isSameRole) score += 8;
  } else {
    score -= 80;
  }

  if (week2) {
    score += week2.score * 0.5;
    score += week2.coveredDays * 5;
    if (week2.isSameRole) score += 8;
  }

  if (week1 && week2 && week1.collaborator.id === week2.collaborator.id) {
    score = -9999;
  }

  const w1 = week1
    ? `${week1.collaborator.name} (${week1.strategy === 'prolong' ? 'prolonga' : 'antecipa'} ${week1.coveredDays}d)`
    : 'sem cobertura';
  const w2 = week2
    ? `${week2.collaborator.name} (${week2.strategy === 'prolong' ? 'prolonga' : 'antecipa'} ${week2.coveredDays}d)`
    : 'sem cobertura';
  const summary = `1ª sem: ${w1} · 2ª sem: ${w2} · ${daysAtTargetPob}/${total} dias com POB=${TARGET_POB}`;

  return { score, daysAtTargetPob, avgAbsPobDelta, uncoveredDays, summary };
}

function resolveMissedWork(
  vacationer: Collaborator,
  vacationStart: string,
  vacationEnd: string,
  turmas: Turma[],
): { start: string; end: string } {
  const base = getBaseDate(vacationer, turmas) || '2026-08-01';
  const diffFromBase = getDaysDiff(vacationStart, base);
  const cycleDay = ((diffFromBase % 28) + 28) % 28;
  const daysCount = getDaysDiff(vacationEnd, vacationStart) + 1;

  // Férias alinhadas (30d no cycleDay 26): cobertura = 14 dias de embarque seguintes
  if (daysCount === 30 && cycleDay === 26) {
    return {
      start: addDaysToStr(vacationStart, 2),
      end: addDaysToStr(vacationStart, 15),
    };
  }

  return {
    start: vacationStart,
    end: addDaysToStr(vacationStart, MISSED_WORK_DAYS - 1),
  };
}

/**
 * Analisa a 1ª e 2ª semana de ausência e escolhe as melhores combinações
 * respeitando prolong ≤7, folga restante ≥7 na antecipação, 1 pessoa por semana e POB≈5.
 */
export function analyzeVacationCoverage(
  vacationer: Collaborator,
  vacationStart: string,
  vacationEnd: string,
  allCollaborators: Collaborator[],
  allTurmas: Turma[],
  allEvents: ScheduleEvent[] = [],
  allVacations: VacationPlan[] = [],
  vacationType: VacationType = 'FULL',
): CoverageAnalysis {
  if (!vacationStart || !vacationEnd || !vacationer || vacationType === 'SELL_ALL') {
    return {
      missedWorkStart: '',
      missedWorkEnd: '',
      targetPob: TARGET_POB,
      slots: [],
      combinations: [],
      best: null,
    };
  }

  const missed = resolveMissedWork(vacationer, vacationStart, vacationEnd, allTurmas);
  let week1Start = missed.start;
  let week1End = addDaysToStr(missed.start, WEEK_DAYS - 1);
  let week2Start = addDaysToStr(missed.start, WEEK_DAYS);
  let week2End = missed.end;

  // SELL_10: só a 2ª semana precisa de cobertura (1ª é prolongamento do próprio)
  const needWeek1 = vacationType === 'FULL';
  const needWeek2 = vacationType === 'FULL' || vacationType === 'SELL_10';

  if (vacationType === 'SELL_10') {
    week1Start = week2Start;
    week1End = week2End;
  }

  const team = allCollaborators.filter((c) => c.active !== false);
  const others = team.filter((c) => c.id !== vacationer.id);

  const buildWeekActions = (
    weekStart: string,
    weekEnd: string,
    preferred: CoverageStrategy,
  ): CoverageAction[] => {
    const actions: CoverageAction[] = [];
    for (const colab of others) {
      const action = bestActionForCandidate(
        colab,
        weekStart,
        weekEnd,
        preferred,
        vacationer,
        allTurmas,
        allEvents,
        allVacations,
      );
      if (action) actions.push(action);
    }
    return actions.sort(
      (a, b) =>
        b.score - a.score ||
        b.coveredDays - a.coveredDays ||
        a.collaborator.name.localeCompare(b.collaborator.name, 'pt-BR'),
    );
  };

  const week1Actions = needWeek1
    ? buildWeekActions(week1Start, week1End, 'prolong')
    : [];
  const week2Actions = needWeek2
    ? buildWeekActions(
        vacationType === 'SELL_10' ? week1Start : week2Start,
        vacationType === 'SELL_10' ? week1End : week2End,
        'anticipate',
      )
    : [];

  const validW1 = week1Actions.filter((a) => !a.hasConflict && a.score > 0);
  const validW2 = week2Actions.filter((a) => !a.hasConflict && a.score > 0);

  const combinations: CoverageCombination[] = [];

  const pushCombo = (w1: CoverageAction | null, w2: CoverageAction | null) => {
    if (w1 && w2 && w1.collaborator.id === w2.collaborator.id) return;
    const dailyPob = computeDailyPob(
      missed.start,
      missed.end,
      vacationer,
      team,
      allTurmas,
      allEvents,
      needWeek1 ? w1 : null,
      needWeek2 ? (vacationType === 'SELL_10' ? w1 || w2 : w2) : null,
    );
    const scored = scoreCombination(
      needWeek1 ? w1 : null,
      vacationType === 'SELL_10' ? w2 || w1 : w2,
      dailyPob,
    );
    combinations.push({
      week1: needWeek1 ? w1 : null,
      week2: vacationType === 'SELL_10' ? w2 || w1 : w2,
      score: scored.score,
      daysAtTargetPob: scored.daysAtTargetPob,
      totalMissedDays: dailyPob.length,
      avgAbsPobDelta: scored.avgAbsPobDelta,
      uncoveredDays: scored.uncoveredDays,
      summary: scored.summary,
      dailyPob,
    });
  };

  if (needWeek1 && needWeek2 && vacationType === 'FULL') {
    // Avalia amplo conjunto de candidatos para listar todas as combinações viáveis
    const top1 = validW1.slice(0, 20);
    const top2 = validW2.slice(0, 20);
    if (top1.length === 0 && top2.length === 0) {
      pushCombo(null, null);
    } else if (top1.length === 0) {
      for (const w2 of top2) pushCombo(null, w2);
    } else if (top2.length === 0) {
      for (const w1 of top1) pushCombo(w1, null);
    } else {
      for (const w1 of top1) {
        for (const w2 of top2) {
          pushCombo(w1, w2);
        }
      }
    }
  } else if (needWeek2 && vacationType === 'SELL_10') {
    for (const w2 of validW2.slice(0, 30)) pushCombo(null, w2);
    if (combinations.length === 0) pushCombo(null, null);
  }

  combinations.sort(
    (a, b) =>
      b.score - a.score ||
      b.daysAtTargetPob - a.daysAtTargetPob ||
      a.uncoveredDays - b.uncoveredDays,
  );

  const best = combinations[0] ?? null;

  // Marcar recomendados a partir da melhor combinação (1 pessoa por semana)
  const rec1 = best?.week1 ?? validW1[0] ?? null;
  const rec2 =
    best?.week2 && (!rec1 || best.week2.collaborator.id !== rec1.collaborator.id)
      ? best.week2
      : validW2.find((a) => !rec1 || a.collaborator.id !== rec1.collaborator.id) ?? null;

  const slots: CoverageWeekSlot[] = [];

  if (needWeek1 && vacationType === 'FULL') {
    slots.push({
      slotNumber: 1,
      title: '1ª semana de cobertura',
      subtitle: 'Preferência: prolongar embarque (+7d máx.)',
      strategyHint: 'prolong',
      weekStart: week1Start,
      weekEnd: week1End,
      daysCount: WEEK_DAYS,
      recommended: rec1,
      actions: week1Actions,
    });
  }

  if (needWeek2) {
    const wStart = vacationType === 'SELL_10' ? week1Start : week2Start;
    const wEnd = vacationType === 'SELL_10' ? week1End : week2End;
    slots.push({
      slotNumber: vacationType === 'SELL_10' ? 1 : 2,
      title: vacationType === 'SELL_10' ? 'Semana de cobertura' : '2ª semana de cobertura',
      subtitle: 'Preferência: antecipar embarque (−7d, folga ≥7d)',
      strategyHint: 'anticipate',
      weekStart: wStart,
      weekEnd: wEnd,
      daysCount: WEEK_DAYS,
      recommended: vacationType === 'SELL_10' ? rec2 || validW2[0] || null : rec2,
      actions: week2Actions,
    });
  }

  return {
    missedWorkStart: missed.start,
    missedWorkEnd: missed.end,
    targetPob: TARGET_POB,
    slots,
    combinations: combinations.slice(0, 40),
    best,
  };
}
