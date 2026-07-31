import { parseISO, addDays, format, differenceInCalendarDays } from 'date-fns';
import type { Collaborator, Turma, ScheduleEvent, VacationPlan, VacationCoverage, VacationType } from '../types';

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
}

export interface CoverageSlotSuggestion {
  slotNumber: 1 | 2;
  title: string;
  subtitle: string;
  strategyName: string;
  strategyCode: 'prolong' | 'anticipate';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  daysCount: number; // 7 days
  recommendedCandidate: Collaborator | null;
  candidates: CandidateRecommendation[];
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

function datesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 <= end2 && end1 >= start2;
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

function getCandidateConflicts(
  colabId: string,
  slotStart: string,
  slotEnd: string,
  allEvents: ScheduleEvent[] = [],
  allVacations: VacationPlan[] = []
): string[] {
  const conflicts: string[] = [];

  for (const ev of allEvents) {
    if (ev.collaboratorId === colabId && datesOverlap(ev.startDate, ev.endDate, slotStart, slotEnd)) {
      conflicts.push(`${ev.status} (${formatDateBR(ev.startDate)} a ${formatDateBR(ev.endDate)}${ev.note ? `: ${ev.note}` : ''})`);
    }
  }

  for (const vac of allVacations) {
    if (vac.collaboratorId === colabId && datesOverlap(vac.startDate, vac.endDate, slotStart, slotEnd)) {
      conflicts.push(`Férias (${formatDateBR(vac.startDate)} a ${formatDateBR(vac.endDate)})`);
    }
  }

  return conflicts;
}

/**
 * Calculates 2 coverage slots (7 days each) for a 14-day missed work period during vacation,
 * evaluating ALL candidates for both strategies (Prolongar stay / Desembarcar +7d e Antecipar arrival / Embarcar -7d)
 * and highlighting any event conflicts (Treinamento, Exame Médico, Atestado, etc.).
 */
export function calculateCoverageSlotsAndSuggestions(
  vacationer: Collaborator,
  vacationStart: string,
  vacationEnd: string,
  allCollaborators: Collaborator[],
  allTurmas: Turma[],
  allEvents: ScheduleEvent[] = [],
  allVacations: VacationPlan[] = [],
  vacationType: VacationType = 'FULL'
): CoverageSlotSuggestion[] {
  if (!vacationStart || !vacationEnd || !vacationer || vacationType === 'SELL_ALL') return [];

  // Determine the 14-day missed work period based on vacation alignment
  const vacationerTurma = allTurmas.find(t => t.id === vacationer.turmaId);
  const alignment = checkVacationAlignment(vacationStart, vacationEnd, vacationer, vacationerTurma);

  let missedWorkStart: string;
  let missedWorkEnd: string;

  if (alignment.isAligned && alignment.suggestedCoverage) {
    missedWorkStart = alignment.suggestedCoverage.start;
    missedWorkEnd = alignment.suggestedCoverage.end;
  } else {
    missedWorkStart = vacationStart;
    missedWorkEnd = addDaysToStr(vacationStart, 13);
  }

  // Split into 2 x 7-day slots
  const slot1Start = missedWorkStart;
  const slot1End = addDaysToStr(missedWorkStart, 6); // 7 days

  // Para SELL_10 (venda parcial), o embarque prolonga em mais 7 dias
  // A ausência a ser coberta inicia na verdade após esses primeiros 7 dias de prolongamento.
  // E o embarque oficial terminaria após o slot 1 (dia 7 a 14)
  const slot2Start = addDaysToStr(missedWorkStart, 7);
  const slot2End = missedWorkEnd; // 7 days (total 14)

  const activeOthers = allCollaborators.filter(c => c.active !== false && c.id !== vacationer.id);

  const evaluateCandidateForSlot = (
    colab: Collaborator,
    slotStart: string,
    slotEnd: string,
    preferredStrategy: 'prolong' | 'anticipate',
    excludedColabIds: string[] = []
  ): CandidateRecommendation => {

    const isRoleAllowed = canRoleCover(colab.role, vacationer.role);
    const isSameRole = colab.role === vacationer.role;

    const conflicts: string[] = [];

    // Check role eligibility
    if (!isRoleAllowed) {
      conflicts.push(`Incompatibilidade de Função: O cargo de ${colab.role} não possui permissão para cobrir ${vacationer.role}`);
    }

    // Check if candidate is already assigned to another slot in these vacations
    if (excludedColabIds.includes(colab.id)) {
      conflicts.push(`Já Atribuído: Este colaborador já foi recomendado para cobrir os outros 7 dias deste período`);
    }

    // Check schedule conflicts (Treinamento, Exame, Atestado, Férias)
    const eventConflicts = getCandidateConflicts(colab.id, slotStart, slotEnd, allEvents, allVacations);
    conflicts.push(...eventConflicts);

    // Calculate exact number of folga and escala days during this 7-day slot
    const slotDaysCount = getDaysDiff(slotEnd, slotStart) + 1;
    let folgaDays = 0;
    let escalaDays = 0;

    for (let i = 0; i < slotDaysCount; i++) {
      const d = addDaysToStr(slotStart, i);
      const st = getColabBaselineStatusOnDate(d, colab, allTurmas);
      if (st === 'Folga') folgaDays++;
      else escalaDays++;
    }

    // Hard blockers (Incompatible role, already assigned, event conflict, or 0 folga days)
    const isHardBlocked = !isRoleAllowed || excludedColabIds.includes(colab.id) || eventConflicts.length > 0 || folgaDays === 0;

    const is100PercentOff = folgaDays === slotDaysCount && escalaDays === 0;

    // Prolong Strategy Check:
    // Was on board on the day right before slotStart, and scheduled for folga on slotStart
    const dayBeforeSlot = addDaysToStr(slotStart, -1);
    const statusBefore = getColabBaselineStatusOnDate(dayBeforeSlot, colab, allTurmas);
    const statusOnStart = getColabBaselineStatusOnDate(slotStart, colab, allTurmas);

    const canProlong = statusBefore === 'Escala' && statusOnStart === 'Folga';
    const prolongExplanation = canProlong
      ? `Estará a bordo em ${formatDateBR(dayBeforeSlot)}. Pode prolongar +7 dias e desembarcar em ${formatDateBR(slotEnd)}.`
      : `Não está a bordo em ${formatDateBR(dayBeforeSlot)} (Sem emenda ao fim de escala).`;

    // Anticipate Strategy Check:
    // Is on folga on slotEnd, and scheduled for regular shift on dayAfterSlot
    const dayAfterSlot = addDaysToStr(slotEnd, 1);
    const statusOnEnd = getColabBaselineStatusOnDate(slotEnd, colab, allTurmas);
    const statusAfter = getColabBaselineStatusOnDate(dayAfterSlot, colab, allTurmas);

    const canAnticipate = statusOnEnd === 'Folga' && statusAfter === 'Escala';
    const anticipateExplanation = canAnticipate
      ? `Inicia escala em ${formatDateBR(dayAfterSlot)}. Pode antecipar em -7 dias e embarcar em ${formatDateBR(slotStart)}.`
      : `Não inicia escala em ${formatDateBR(dayAfterSlot)} (Sem emenda ao início de escala).`;

    let score = 0;
    let mainReason = '';
    let selectedStrategy: 'prolong' | 'anticipate' | 'extra' = preferredStrategy;
    let badgeLabel = '';

    if (isHardBlocked) {
      score = -100;
      if (!isRoleAllowed) {
        mainReason = `⚠️ FUNÇÃO INCOMPATÍVEL: O cargo de ${colab.role} não possui permissão para cobrir ${vacationer.role}.`;
        badgeLabel = 'Impedido (Cargo Incompatível)';
      } else if (excludedColabIds.includes(colab.id)) {
        mainReason = `⚠️ JÁ ATRIBUÍDO: Selecionado para o 1º turno de cobertura.`;
        badgeLabel = 'Impedido (Atribuído ao 1º Turno)';
      } else if (eventConflicts.length > 0) {
        mainReason = `⚠️ CONFLITO DE AGENDA: ${eventConflicts.join('; ')}`;
        badgeLabel = 'Impedido (Conflito de Agenda)';
      } else {
        mainReason = `⚠️ 100% EM ESCALA REGULAR: Estará em serviço a bordo durante todos os 7 dias do período.`;
        badgeLabel = 'Impedido (Sem Folga no Período)';
      }
    } else if (is100PercentOff) {
      // 100% Free in Folga during all 7 days of the slot with valid role and no conflicts!
      if (preferredStrategy === 'prolong' && canProlong) {
        score = isSameRole ? 100 : 92;
        selectedStrategy = 'prolong';
        mainReason = isSameRole
          ? `⭐ EXCELENTE (100% Livre 7/7d): Já estará a bordo até ${formatDateBR(dayBeforeSlot)} e prolonga +7 dias (Desembarca em ${formatDateBR(slotEnd)})`
          : `⭐ EXCELENTE (100% Livre 7/7d): Permissão de cargo (${colab.role} cobre ${vacationer.role}) & prolonga +7 dias (Desembarca em ${formatDateBR(slotEnd)})`;
        badgeLabel = 'Ideal: Prolonga +7d (Já a bordo)';
      } else if (preferredStrategy === 'anticipate' && canAnticipate) {
        score = isSameRole ? 100 : 92;
        selectedStrategy = 'anticipate';
        mainReason = isSameRole
          ? `⭐ EXCELENTE (100% Livre 7/7d): Inicia escala regular em ${formatDateBR(dayAfterSlot)} e antecipa -7 dias (Embarca em ${formatDateBR(slotStart)})`
          : `⭐ EXCELENTE (100% Livre 7/7d): Permissão de cargo (${colab.role} cobre ${vacationer.role}) & antecipa -7 dias (Embarca em ${formatDateBR(slotStart)})`;
        badgeLabel = 'Ideal: Antecipa -7d (Emenda com escala)';
      } else if (canProlong) {
        score = isSameRole ? 88 : 80;
        selectedStrategy = 'prolong';
        mainReason = `100% Livre (7/7d em Folga): Pode prolongar +7d (Desembarca em ${formatDateBR(slotEnd)} vindo da escala em ${formatDateBR(dayBeforeSlot)})`;
        badgeLabel = 'Válido: Prolonga +7d';
      } else if (canAnticipate) {
        score = isSameRole ? 88 : 80;
        selectedStrategy = 'anticipate';
        mainReason = `100% Livre (7/7d em Folga): Pode antecipar -7d (Embarca em ${formatDateBR(slotStart)} e emenda com escala em ${formatDateBR(dayAfterSlot)})`;
        badgeLabel = 'Válido: Antecipa -7d';
      } else {
        score = isSameRole ? 82 : 75;
        selectedStrategy = 'extra';
        mainReason = `100% Livre (7/7d em Folga Regular): Totalmente disponível em folga durante todo o período (${colab.role})`;
        badgeLabel = 'Disponível em Folga (7/7d)';
      }
    } else {
      // Partial coverage fallback (e.g. 1 to 6 days free in folga)
      score = (folgaDays * 10) + (isSameRole ? 5 : 0);
      selectedStrategy = 'extra';
      badgeLabel = `⚠️ Cobertura Parcial (${folgaDays}/7d em Folga)`;
      mainReason = `⚡ COBERTURA PARCIAL: Possui ${folgaDays} dia(s) de folga no período (${escalaDays}d em escala regular). Sugerido como a melhor opção disponível.`;
    }

    return {
      collaborator: colab,
      isRecommended: score > 0 && !isHardBlocked,
      score,
      reason: mainReason,
      strategy: selectedStrategy,
      badgeLabel,
      prolongAnalysis: {
        canProlong,
        explanation: prolongExplanation,
      },
      anticipateAnalysis: {
        canAnticipate,
        explanation: anticipateExplanation,
      },
      folgaDays,
      escalaDays,
      hasConflict: isHardBlocked,
      conflicts: isHardBlocked ? conflicts : [],
    };
  };

  // SLOT 1 EVALUATION (Evaluated independently for Turno 1)
  const slot1Candidates = activeOthers
    .map(colab => evaluateCandidateForSlot(colab, slot1Start, slot1End, 'prolong', []))
    .sort((a, b) => b.score - a.score || (b.folgaDays - a.folgaDays) || a.collaborator.name.localeCompare(b.collaborator.name));

  // SLOT 2 EVALUATION (Evaluated independently for Turno 2)
  const slot2Candidates = activeOthers
    .map(colab => evaluateCandidateForSlot(colab, slot2Start, slot2End, 'anticipate', []))
    .sort((a, b) => b.score - a.score || (b.folgaDays - a.folgaDays) || a.collaborator.name.localeCompare(b.collaborator.name));

  // Global Pair Optimization: Find the best pair of DISTINCT collaborators (c1 for Turno 1, c2 for Turno 2)
  let bestPair: { c1: typeof slot1Candidates[0] | null; c2: typeof slot2Candidates[0] | null; combinedScore: number } = {
    c1: null,
    c2: null,
    combinedScore: -Infinity,
  };

  for (const c1 of slot1Candidates) {
    for (const c2 of slot2Candidates) {
      if (c1.collaborator.id === c2.collaborator.id) continue;

      let pairScore = c1.score + c2.score;
      if (!c1.hasConflict) pairScore += 500;
      if (!c2.hasConflict) pairScore += 500;

      if (pairScore > bestPair.combinedScore) {
        bestPair = { c1, c2, combinedScore: pairScore };
      }
    }
  }

  // Fallbacks if team size is <= 1
  if (!bestPair.c1 && slot1Candidates.length > 0) {
    bestPair.c1 = slot1Candidates[0];
  }
  if (!bestPair.c2 && slot2Candidates.length > 0) {
    bestPair.c2 = slot2Candidates.find(c => c.collaborator.id !== bestPair.c1?.collaborator.id) || slot2Candidates[0];
  }

  const recommended1 = bestPair.c1 ? bestPair.c1.collaborator : null;
  const recommended2 = bestPair.c2 ? bestPair.c2.collaborator : null;

  // Mark isRecommended accurately for candidates in each slot
  const finalSlot1Candidates = slot1Candidates.map(c => ({
    ...c,
    isRecommended: recommended1 ? c.collaborator.id === recommended1.id && !c.hasConflict : c.isRecommended,
  }));

  const finalSlot2Candidates = slot2Candidates.map(c => ({
    ...c,
    isRecommended: recommended2 ? c.collaborator.id === recommended2.id && !c.hasConflict : c.isRecommended,
  }));

  const slot1Suggestion: CoverageSlotSuggestion = {
    slotNumber: 1,
    title: '1º Turno de Cobertura (7 dias)',
    subtitle: 'Prolongamento de Embarque (+7 dias)',
    strategyName: 'Desembarcar +7d depois (ou Antecipar)',
    strategyCode: 'prolong',
    startDate: slot1Start,
    endDate: slot1End,
    daysCount: 7,
    recommendedCandidate: recommended1,
    candidates: finalSlot1Candidates,
  };

  const slot2Suggestion: CoverageSlotSuggestion = {
    slotNumber: 2,
    title: '2º Turno de Cobertura (7 dias)',
    subtitle: 'Antecipação de Embarque (-7 dias)',
    strategyName: 'Embarcar -7d antes (ou Prolongar)',
    strategyCode: 'anticipate',
    startDate: slot2Start,
    endDate: slot2End,
    daysCount: 7,
    recommendedCandidate: recommended2,
    candidates: finalSlot2Candidates,
  };

  if (vacationType === 'SELL_10') {
    return [slot2Suggestion];
  }

  return [slot1Suggestion, slot2Suggestion];
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





