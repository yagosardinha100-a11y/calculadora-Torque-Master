import { parseISO, format } from 'date-fns';
import type { Collaborator, Turma, ScheduleEvent, VacationPlan, VacationType } from './types';
import { analyzeVacationCoverage } from './coverageEngine';

export interface Vacation30DayOption {
  vacationStart: string; // YYYY-MM-DD
  vacationEnd: string;   // YYYY-MM-DD
  returnDate: string;    // YYYY-MM-DD
  coverageStart: string; // YYYY-MM-DD (14 days when work is missed)
  coverageEnd: string;   // YYYY-MM-DD
  label: string;         // E.g. "26/08/2026 a 24/09/2026 (Retorno: 25/09/2026)"
  folgaPeriod: string;   // E.g. "Folga de 14/08 a 27/08"
}

export function getDaysDiff(targetDateStr: string, baseDateStr: string): number {
  const [y1, m1, d1] = targetDateStr.split('-').map(Number);
  const [y2, m2, d2] = baseDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

export function addDaysToStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().split('T')[0];
}

/**
 * Calculates upcoming 30-day vacation options for a collaborator based on their 14x14 shift rotation.
 * The rule is: Vacation starts on the last 2 days of their 14-day Folga period.
 */
export function getAlignedVacationOptions(
  collaborator: Collaborator,
  turma?: Turma,
  count = 6,
  referenceDateStr = new Date().toISOString().split('T')[0]
): Vacation30DayOption[] {
  const baseDateStr = collaborator.startDate || turma?.baseDate || '2026-08-01';
  const diffFromBase = getDaysDiff(referenceDateStr, baseDateStr);

  // Find the start of the cycle that contains or is near referenceDateStr
  // Each cycle is 28 days (14 Embarque + 14 Folga)
  let cycleIndex = Math.floor(diffFromBase / 28) - 1;

  const options: Vacation30DayOption[] = [];

  for (let i = 0; i < count + 3; i++) {
    const cycleStartOffset = (cycleIndex + i) * 28;
    const cycleStartDate = addDaysToStr(baseDateStr, cycleStartOffset);

    // Folga of this cycle runs from day 14 to day 27 (14 days)
    const folgaStart = addDaysToStr(cycleStartDate, 14);
    const folgaEnd = addDaysToStr(cycleStartDate, 27);

    // Vacation starts on the last 2 days of Folga (day 26 of the cycle)
    const vacationStart = addDaysToStr(cycleStartDate, 26);
    const vacationEnd = addDaysToStr(vacationStart, 29); // 30 days total (inclusive)
    const returnDate = addDaysToStr(vacationEnd, 1);

    // Coverage needed: during the collaborator's normal Embarque in the next cycle (days 28 to 41 of cycleStart)
    const coverageStart = addDaysToStr(cycleStartDate, 28);
    const coverageEnd = addDaysToStr(cycleStartDate, 41);

    // Only include options whose vacationEnd is >= referenceDateStr (current or future)
    if (vacationEnd >= referenceDateStr) {
      const [sy, sm, sd] = vacationStart.split('-').map(Number);
      const [ey, em, ed] = vacationEnd.split('-').map(Number);
      const [ry, rm, rd] = returnDate.split('-').map(Number);

      const fStartFormatted = format(parseISO(folgaStart), 'dd/MM');
      const fEndFormatted = format(parseISO(folgaEnd), 'dd/MM');
      const vStartFormatted = format(parseISO(vacationStart), 'dd/MM/yyyy');
      const vEndFormatted = format(parseISO(vacationEnd), 'dd/MM/yyyy');
      const rFormatted = format(parseISO(returnDate), 'dd/MM/yyyy');

      options.push({
        vacationStart,
        vacationEnd,
        returnDate,
        coverageStart,
        coverageEnd,
        label: `${vStartFormatted} a ${vEndFormatted} (Retorno: ${rFormatted})`,
        folgaPeriod: `Folga: ${fStartFormatted} a ${fEndFormatted}`,
      });
    }

    if (options.length >= count) break;
  }

  return options;
}

/**
 * Checks if a given vacation period (startDate to endDate) matches the 30-day 14x14 alignment rule.
 */
export function checkVacationAlignment(
  startDateStr: string,
  endDateStr: string,
  collaborator: Collaborator,
  turma?: Turma
): { isAligned: boolean; is30Days: boolean; reason: string; suggestedCoverage?: { start: string; end: string } } {
  if (!startDateStr || !endDateStr) {
    return { isAligned: false, is30Days: false, reason: '' };
  }

  const daysCount = getDaysDiff(endDateStr, startDateStr) + 1;
  const is30Days = daysCount === 30;

  const baseDateStr = collaborator.startDate || turma?.baseDate || '2026-08-01';
  const diffFromBase = getDaysDiff(startDateStr, baseDateStr);
  const cycleDay = ((diffFromBase % 28) + 28) % 28;

  // Cycle day 26 is the 2nd to last day of Folga (days 14-27 are Folga, 26 & 27 are last 2 days)
  const startsOnLast2DaysOfFolga = cycleDay === 26;

  if (is30Days && startsOnLast2DaysOfFolga) {
    const coverageStart = addDaysToStr(startDateStr, 2);
    const coverageEnd = addDaysToStr(startDateStr, 15);
    return {
      isAligned: true,
      is30Days: true,
      reason: 'Férias de 30 dias perfeitas! Inicia nos 2 últimos dias da folga e preserva 100% o ciclo 14x14 da turma (retorno no 1º dia de embarque).',
      suggestedCoverage: { start: coverageStart, end: coverageEnd },
    };
  }

  if (is30Days && !startsOnLast2DaysOfFolga) {
    const dayInFolga = cycleDay >= 14 ? cycleDay - 13 : 0;
    return {
      isAligned: false,
      is30Days: true,
      reason: startsOnLast2DaysOfFolga
        ? ''
        : cycleDay < 14
        ? `Atenção: A data selecionada cai durante o período de embarque/trabalho (Dia ${cycleDay + 1} de embarque). Para manter a escala, deve iniciar nos 2 últimos dias da folga.`
        : `Atenção: A data cai no dia ${dayInFolga} da folga. Para manter a escala alinhada, deve iniciar no 13º dia (penúltimo dia) da folga.`,
    };
  }

  return {
    isAligned: false,
    is30Days,
    reason: `Período selecionado possui ${daysCount} dias. Férias padrão de 30 dias iniciadas nos 2 últimos dias de folga garantem retorno no 1º dia de embarque.`,
  };
}

/**
 * Smartly checks and adjusts user-selected vacation start date for the 14x14 scale:
 * - If user picks an Embarque date (cycleDay 0..13): retrocedes 2 days before that Embarque start (cycleDay 26 - penúltimo dia de folga) and sets endDate = startDate + 29 days (30 days total ending on last day of folga).
 * - If user picks last day of folga (cycleDay 27): retrocedes 1 day to penúltimo dia de folga (cycleDay 26).
 * - If user picks any other date: keeps selected start date and sets endDate = startDate + 29 days.
 */
export function alignVacationDates(
  startDateStr: string,
  collaborator: Collaborator,
  turma?: Turma
): { startDate: string; endDate: string; adjusted: boolean; originalStart: string; adjustmentReason?: string } {
  if (!startDateStr) {
    return { startDate: '', endDate: '', adjusted: false, originalStart: startDateStr };
  }

  const baseDateStr = collaborator.startDate || turma?.baseDate || '2026-08-01';
  const diffStart = getDaysDiff(startDateStr, baseDateStr);
  const cycleDayStart = ((diffStart % 28) + 28) % 28;

  let offset = 0;
  let reason = '';

  const [sy, sm, sd] = startDateStr.split('-');
  const startBR = `${sd}/${sm}/${sy}`;

  if (cycleDayStart >= 0 && cycleDayStart <= 13) {
    // Selected date is during Embarque (or day 0 of Embarque)
    // Retrocede to cycleDay 26 (penúltimo dia de folga)
    offset = -cycleDayStart - 2;
    const adjustedStart = addDaysToStr(startDateStr, offset);
    const [ay, am, ad] = adjustedStart.split('-');
    const adjBR = `${ad}/${am}/${ay}`;
    reason = `Como ${startBR} é dia de embarque, o início foi ajustado para ${adjBR} (2 dias antes do embarque) para iniciar no penúltimo dia de folga, cobrir os 14 dias de embarque e encerrar no último dia de folga.`;
  } else if (cycleDayStart === 27) {
    // Last day of Folga -> adjust 1 day prior to cycleDay 26
    offset = -1;
    const adjustedStart = addDaysToStr(startDateStr, offset);
    const [ay, am, ad] = adjustedStart.split('-');
    const adjBR = `${ad}/${am}/${ay}`;
    reason = `Início ajustado de ${startBR} para ${adjBR} (penúltimo dia de folga) para completar 30 dias até o fim da folga seguinte.`;
  }

  const adjustedStart = addDaysToStr(startDateStr, offset);
  const adjustedEnd = addDaysToStr(adjustedStart, 29);
  const isChanged = offset !== 0;

  return {
    startDate: adjustedStart,
    endDate: adjustedEnd,
    adjusted: isChanged,
    originalStart: startDateStr,
    adjustmentReason: isChanged ? reason : undefined,
  };
}

export interface CandidateRecommendation {
  collaborator: Collaborator;
  isRecommended: boolean;
  score: number;
  reason: string;
  strategy: 'prolong' | 'anticipate' | 'extra';
  badgeLabel: string;
  prolongAnalysis: {
    canProlong: boolean;
    explanation: string;
  };
  anticipateAnalysis: {
    canAnticipate: boolean;
    explanation: string;
  };
  folgaDays: number;
  escalaDays: number;
  hasConflict: boolean;
  conflicts: string[];
  /** Dias reais sugeridos para a dobra (podem ser < 7 por defasagem). */
  coverageStart?: string;
  coverageEnd?: string;
  coveredDays?: number;
  lagDays?: number;
  remainingFolgaDays?: number;
}

export interface CoverageSlotSuggestion {
  slotNumber: 1 | 2;
  title: string;
  subtitle: string;
  strategyName: string;
  strategyCode: 'prolong' | 'anticipate';
  startDate: string; // YYYY-MM-DD (semana)
  endDate: string;   // YYYY-MM-DD (semana)
  daysCount: number; // 7 days
  recommendedCandidate: Collaborator | null;
  /** Janela real de dobra do recomendado (respeita ≤7 / folga≥7 / defasagem). */
  recommendedCoverageStart: string | null;
  recommendedCoverageEnd: string | null;
  recommendedReason: string | null;
  recommendedBadge: string | null;
  coveredDaysInWeek: number;
  lagDays: number;
  candidates: CandidateRecommendation[];
}

export interface CoverageCombinationView {
  score: number;
  daysAtTargetPob: number;
  totalMissedDays: number;
  uncoveredDays: number;
  summary: string;
  week1CollaboratorId: string | null;
  week1Start: string | null;
  week1End: string | null;
  week1Strategy: 'prolong' | 'anticipate' | null;
  week2CollaboratorId: string | null;
  week2Start: string | null;
  week2End: string | null;
  week2Strategy: 'prolong' | 'anticipate' | null;
}

export interface CoverageSuggestionsResult {
  slots: CoverageSlotSuggestion[];
  combinations: CoverageCombinationView[];
  bestSummary: string | null;
  targetPob: number;
  missedWorkStart: string;
  missedWorkEnd: string;
}

function getColabBaselineStatusOnDate(
  dateStr: string,
  colab: Collaborator,
  turmas: Turma[]
): 'Escala' | 'Folga' {
  const turma = turmas.find(t => t.id === colab.turmaId);
  const baseDateStr = colab.startDate || turma?.baseDate || '2026-08-01';
  const diff = getDaysDiff(dateStr, baseDateStr);
  const cycleDay = ((diff % 28) + 28) % 28;
  return cycleDay < 14 ? 'Escala' : 'Folga';
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

export function normalizeRoleKey(role: string): 'chefe' | 'supervisor' | 'mecanico' | 'assistente' | 'other' {
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

/**
 * Checks if substituteRole is allowed to cover vacationerRole based on official rules:
 * - Chefe de mecânica: cobre Chefe de mecânica e Supervisor de Mecânica
 * - Supervisor de mecânica: cobre apenas Supervisor de Mecânica
 * - Mecânico: cobre Mecânico e Chefe de Mecânica
 * - Assistente de Mecânica: cobre Assistente de Mecânica e Mecânico
 */
export function canRoleCover(substituteRole: string, vacationerRole: string): boolean {
  if (!substituteRole || !vacationerRole) return false;

  const subKey = normalizeRoleKey(substituteRole);
  const vacKey = normalizeRoleKey(vacationerRole);

  if (subKey === 'chefe') {
    return vacKey === 'chefe' || vacKey === 'supervisor';
  }

  if (subKey === 'supervisor') {
    return vacKey === 'supervisor';
  }

  if (subKey === 'mecanico') {
    return vacKey === 'mecanico' || vacKey === 'chefe';
  }

  if (subKey === 'assistente') {
    return vacKey === 'assistente' || vacKey === 'mecanico';
  }

  return subKey === vacKey;
}

/**
 * Calcula 1ª/2ª semana de cobertura com as regras da empresa:
 * prolong ≤7d, antecipação com folga restante ≥7d, 1 pessoa por semana,
 * defasagem entre embarques (ex. terça vs quinta) e melhor combinação para POB≈5.
 */
export function calculateCoverageSuggestions(
  vacationer: Collaborator,
  vacationStart: string,
  vacationEnd: string,
  allCollaborators: Collaborator[],
  allTurmas: Turma[],
  allEvents: ScheduleEvent[] = [],
  allVacations: VacationPlan[] = [],
  vacationType: VacationType = 'FULL',
): CoverageSuggestionsResult {
  const analysis = analyzeVacationCoverage(
    vacationer,
    vacationStart,
    vacationEnd,
    allCollaborators,
    allTurmas,
    allEvents,
    allVacations,
    vacationType,
  );

  const slots: CoverageSlotSuggestion[] = analysis.slots.map((slot) => {
    const recommendedId = slot.recommended?.collaborator.id ?? null;
    const candidates: CandidateRecommendation[] = slot.actions.map((action) => ({
      collaborator: action.collaborator,
      isRecommended: recommendedId === action.collaborator.id && !action.hasConflict,
      score: action.score,
      reason: action.reason,
      strategy: action.strategy,
      badgeLabel: action.badgeLabel,
      prolongAnalysis: {
        canProlong: action.strategy === 'prolong',
        explanation:
          action.strategy === 'prolong'
            ? action.reason
            : `Prolongamento avaliado; melhor opção neste caso: ${action.strategy}.`,
      },
      anticipateAnalysis: {
        canAnticipate: action.strategy === 'anticipate',
        explanation:
          action.strategy === 'anticipate'
            ? action.reason
            : `Antecipação avaliada; melhor opção neste caso: ${action.strategy}.`,
      },
      folgaDays: action.coveredDays,
      escalaDays: action.weekDays - action.coveredDays,
      hasConflict: action.hasConflict,
      conflicts: action.conflicts,
      coverageStart: action.startDate,
      coverageEnd: action.endDate,
      coveredDays: action.coveredDays,
      lagDays: action.lagDays,
      remainingFolgaDays: action.remainingFolgaDays,
    }));

    // Incluir candidatos sem ação válida (função incompatível / sem janela) no fim? Mantemos só ações válidas.
    return {
      slotNumber: slot.slotNumber,
      title: slot.title,
      subtitle: slot.subtitle,
      strategyName:
        slot.strategyHint === 'prolong'
          ? 'Prolongar embarque (+7d máx.)'
          : 'Antecipar embarque (−7d, folga ≥7d)',
      strategyCode: slot.strategyHint,
      startDate: slot.weekStart,
      endDate: slot.weekEnd,
      daysCount: slot.daysCount,
      recommendedCandidate: slot.recommended?.collaborator ?? null,
      recommendedCoverageStart: slot.recommended?.startDate ?? null,
      recommendedCoverageEnd: slot.recommended?.endDate ?? null,
      recommendedReason: slot.recommended?.reason ?? null,
      recommendedBadge: slot.recommended?.badgeLabel ?? null,
      coveredDaysInWeek: slot.recommended?.coveredDays ?? 0,
      lagDays: slot.recommended?.lagDays ?? 0,
      candidates,
    };
  });

  const combinations: CoverageCombinationView[] = analysis.combinations.map((c) => ({
    score: c.score,
    daysAtTargetPob: c.daysAtTargetPob,
    totalMissedDays: c.totalMissedDays,
    uncoveredDays: c.uncoveredDays,
    summary: c.summary,
    week1CollaboratorId: c.week1?.collaborator.id ?? null,
    week1Start: c.week1?.startDate ?? null,
    week1End: c.week1?.endDate ?? null,
    week1Strategy: c.week1?.strategy ?? null,
    week2CollaboratorId: c.week2?.collaborator.id ?? null,
    week2Start: c.week2?.startDate ?? null,
    week2End: c.week2?.endDate ?? null,
    week2Strategy: c.week2?.strategy ?? null,
  }));

  return {
    slots,
    combinations,
    bestSummary: analysis.best?.summary ?? null,
    targetPob: analysis.targetPob,
    missedWorkStart: analysis.missedWorkStart,
    missedWorkEnd: analysis.missedWorkEnd,
  };
}

/**
 * @deprecated Prefer calculateCoverageSuggestions — mantido para compatibilidade.
 */
export function calculateCoverageSlotsAndSuggestions(
  vacationer: Collaborator,
  vacationStart: string,
  vacationEnd: string,
  allCollaborators: Collaborator[],
  allTurmas: Turma[],
  allEvents: ScheduleEvent[] = [],
  allVacations: VacationPlan[] = [],
  vacationType: VacationType = 'FULL',
): CoverageSlotSuggestion[] {
  return calculateCoverageSuggestions(
    vacationer,
    vacationStart,
    vacationEnd,
    allCollaborators,
    allTurmas,
    allEvents,
    allVacations,
    vacationType,
  ).slots;
}

export interface DailyCoverageDetail {
  dateStr: string;
  dayOfWeek: string;
  formattedDate: string;
  baselineStatus: 'Escala' | 'Folga';
  conflictEvent?: string;
  isCoverable: boolean;
}

export interface CollaboratorCoverageScheduleAnalysis {
  collaborator: Collaborator;
  turma?: Turma;
  startDate: string;
  endDate: string;
  totalDays: number;
  coverableDaysCount: number;
  folgaDaysCount: number;
  escalaDaysCount: number;
  conflictDaysCount: number;
  coveragePercentage: number;
  summaryStatus: 'full' | 'partial' | 'blocked';
  summaryText: string;
  dailyDetails: DailyCoverageDetail[];
}

export function getCollaboratorCoverageScheduleDetails(
  colab: Collaborator,
  startDate: string,
  endDate: string,
  allTurmas: Turma[],
  allEvents: ScheduleEvent[] = [],
  allVacations: VacationPlan[] = []
): CollaboratorCoverageScheduleAnalysis | null {
  if (!colab || !startDate || !endDate) return null;

  const totalDays = getDaysDiff(endDate, startDate) + 1;
  if (totalDays <= 0) return null;

  const turma = allTurmas.find(t => t.id === colab.turmaId);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const dailyDetails: DailyCoverageDetail[] = [];
  let coverableDaysCount = 0;
  let folgaDaysCount = 0;
  let escalaDaysCount = 0;
  let conflictDaysCount = 0;

  for (let i = 0; i < totalDays; i++) {
    const dateStr = addDaysToStr(startDate, i);
    const [y, m, d] = dateStr.split('-').map(Number);
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = weekDays[utcDate.getUTCDay()];
    const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;

    const baselineStatus = getColabBaselineStatusOnDate(dateStr, colab, allTurmas);

    // Check for events/vacations on this specific day
    const dayConflicts: string[] = [];
    for (const ev of allEvents) {
      if (ev.collaboratorId === colab.id && ev.startDate <= dateStr && ev.endDate >= dateStr) {
        dayConflicts.push(`${ev.status}${ev.note ? `: ${ev.note}` : ''}`);
      }
    }
    for (const vac of allVacations) {
      if (vac.collaboratorId === colab.id && vac.startDate <= dateStr && vac.endDate >= dateStr) {
        dayConflicts.push('Férias');
      }
    }

    const hasConflict = dayConflicts.length > 0;
    const conflictNote = hasConflict ? dayConflicts.join('; ') : undefined;

    // Is this day coverable by the substitute?
    const isCoverable = baselineStatus === 'Folga' && !hasConflict;

    if (hasConflict) {
      conflictDaysCount++;
    } else if (baselineStatus === 'Folga') {
      folgaDaysCount++;
    } else {
      escalaDaysCount++;
    }

    if (isCoverable) {
      coverableDaysCount++;
    }

    dailyDetails.push({
      dateStr,
      dayOfWeek,
      formattedDate,
      baselineStatus,
      conflictEvent: conflictNote,
      isCoverable,
    });
  }

  const coveragePercentage = Math.round((coverableDaysCount / totalDays) * 100);
  let summaryStatus: 'full' | 'partial' | 'blocked' = 'full';
  let summaryText = '';

  if (coverableDaysCount === totalDays) {
    summaryStatus = 'full';
    summaryText = `Consegue cobrir 100% (${coverableDaysCount}/${totalDays} dias) totalmente em período de folga regular.`;
  } else if (coverableDaysCount > 0) {
    summaryStatus = 'partial';
    summaryText = `Consegue cobrir ${coverableDaysCount} de ${totalDays} dias (${coveragePercentage}%). Possui ${
      escalaDaysCount > 0 ? `${escalaDaysCount} dia(s) em escala regular de trabalho` : ''
    }${escalaDaysCount > 0 && conflictDaysCount > 0 ? ' e ' : ''}${
      conflictDaysCount > 0 ? `${conflictDaysCount} dia(s) com evento/afastamento` : ''
    }.`;
  } else {
    summaryStatus = 'blocked';
    summaryText = `Não tem disponibilidade de folga para cobertura neste período (0/${totalDays} dias). ${
      escalaDaysCount > 0 ? `Está em escala regular de trabalho na sua turma (${escalaDaysCount}d).` : ''
    } ${conflictDaysCount > 0 ? `Possui afastamento/evento cadastrado (${conflictDaysCount}d).` : ''}`;
  }

  return {
    collaborator: colab,
    turma,
    startDate,
    endDate,
    totalDays,
    coverableDaysCount,
    folgaDaysCount,
    escalaDaysCount,
    conflictDaysCount,
    coveragePercentage,
    summaryStatus,
    summaryText,
    dailyDetails,
  };
}





