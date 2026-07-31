import { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useData } from '../data/DataProvider';
import type { VacationPlan, VacationType, VacationCoverage } from '../domain/types';
import {
  getAlignedVacationOptions,
  alignVacationDates,
  calculateCoverageSuggestions,
  checkVacationAlignment,
  formatDateBR,
  addDaysToStr,
  requireVacationAnchor,
  type CoverageSuggestionsResult,
  type CoverageCombinationView,
} from '../domain';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

const TYPE_OPTIONS: { value: VacationType; label: string }[] = [
  { value: 'FULL', label: 'Integral (30 dias)' },
  { value: 'SELL_10', label: 'Venda parcial (10 dias)' },
  { value: 'SELL_ALL', label: 'Venda total' },
];

interface Props {
  plan: VacationPlan | null;
  onClose: () => void;
}

function coveragesFromCombination(
  combo: CoverageCombinationView,
  slots: CoverageSuggestionsResult['slots'],
): VacationCoverage[] {
  const out: VacationCoverage[] = [];
  if (combo.week1CollaboratorId && combo.week1Start && combo.week1End) {
    out.push({
      id: crypto.randomUUID(),
      collaboratorId: combo.week1CollaboratorId,
      startDate: combo.week1Start,
      endDate: combo.week1End,
      note: `1ª semana · ${combo.week1Strategy === 'prolong' ? 'prolonga' : 'antecipa'}`,
    });
  } else if (slots[0]?.recommendedCandidate && slots[0].recommendedCoverageStart) {
    out.push({
      id: crypto.randomUUID(),
      collaboratorId: slots[0].recommendedCandidate.id,
      startDate: slots[0].recommendedCoverageStart,
      endDate: slots[0].recommendedCoverageEnd || slots[0].endDate,
      note: '1ª semana',
    });
  }

  if (combo.week2CollaboratorId && combo.week2Start && combo.week2End) {
    out.push({
      id: crypto.randomUUID(),
      collaboratorId: combo.week2CollaboratorId,
      startDate: combo.week2Start,
      endDate: combo.week2End,
      note: `2ª semana · ${combo.week2Strategy === 'prolong' ? 'prolonga' : 'antecipa'}`,
    });
  } else if (slots.length > 1 && slots[1].recommendedCandidate && slots[1].recommendedCoverageStart) {
    out.push({
      id: crypto.randomUUID(),
      collaboratorId: slots[1].recommendedCandidate.id,
      startDate: slots[1].recommendedCoverageStart,
      endDate: slots[1].recommendedCoverageEnd || slots[1].endDate,
      note: '2ª semana',
    });
  }

  return out.filter((c) => c.collaboratorId);
}

function buildCoveragesFromResult(result: CoverageSuggestionsResult): VacationCoverage[] {
  if (result.combinations[0]) {
    return coveragesFromCombination(result.combinations[0], result.slots);
  }

  return result.slots
    .map((slot) => {
      const id = slot.recommendedCandidate?.id || slot.candidates[0]?.collaborator.id || '';
      if (!id) return null;
      return {
        id: crypto.randomUUID(),
        collaboratorId: id,
        startDate: slot.recommendedCoverageStart || slot.startDate,
        endDate: slot.recommendedCoverageEnd || slot.endDate,
        note: slot.title,
      } as VacationCoverage;
    })
    .filter((c): c is VacationCoverage => Boolean(c));
}

export default function VacationForm({ plan, onClose }: Props) {
  const { collaborators, turmas, events, vacations, saveVacationPlan } = useData();

  const [collabId, setCollabId] = useState(plan?.collaboratorId ?? '');
  const [vacationType, setVacationType] = useState<VacationType>(plan?.vacationType ?? 'FULL');
  const [startDate, setStartDate] = useState(plan?.startDate ?? '');
  const [endDate, setEndDate] = useState(plan?.endDate ?? '');
  const [note, setNote] = useState(plan?.note ?? '');
  const [coverages, setCoverages] = useState<VacationCoverage[]>(plan?.coverages ?? []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [alignMsg, setAlignMsg] = useState('');
  const [autoFillDone, setAutoFillDone] = useState(Boolean(plan));

  const activeColabs = useMemo(
    () =>
      collaborators
        .filter((c) => c.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [collaborators],
  );

  const colab = activeColabs.find((c) => c.id === collabId);
  const turma = colab ? turmas.find((t) => t.id === colab.turmaId) : undefined;

  const anchorError = collabId
    ? requireVacationAnchor(colab, turma?.baseDate)
    : null;

  const alignedOptions = useMemo(() => {
    if (!colab || anchorError) return [];
    return getAlignedVacationOptions(colab, turma, 6);
  }, [colab, turma, anchorError]);

  const alignment = useMemo(() => {
    if (!colab || !startDate || !endDate) return null;
    return checkVacationAlignment(startDate, endDate, colab, turma);
  }, [colab, startDate, endDate, turma]);

  const coverageResult = useMemo(() => {
    if (!colab || !startDate || !endDate || vacationType === 'SELL_ALL' || anchorError) {
      return null;
    }
    return calculateCoverageSuggestions(
      colab,
      startDate,
      endDate,
      collaborators,
      turmas,
      events,
      vacations,
      vacationType,
    );
  }, [colab, startDate, endDate, vacationType, collaborators, turmas, events, vacations, anchorError]);

  const coverageSlots = coverageResult?.slots ?? [];

  useEffect(() => {
    if (plan || !collabId || autoFillDone || alignedOptions.length === 0) return;
    setStartDate(alignedOptions[0].vacationStart);
    setEndDate(alignedOptions[0].vacationEnd);
    setAlignMsg('');
    setAutoFillDone(true);
  }, [collabId, alignedOptions, plan, autoFillDone]);

  useEffect(() => {
    if (vacationType === 'SELL_ALL') {
      setCoverages([]);
      return;
    }
    if (!startDate || !endDate || !coverageResult || coverageResult.slots.length === 0) return;
    if (!plan || coverages.length === 0 || coverages.every((c) => !c.collaboratorId)) {
      setCoverages(buildCoveragesFromResult(coverageResult));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverageResult, vacationType, startDate, endDate]);

  const colabOptions = [
    { value: '', label: 'Selecionar colaborador…' },
    ...activeColabs.map((c) => ({ value: c.id, label: c.name })),
  ];

  const coverColabOptions = [
    { value: '', label: 'Substituto…' },
    ...activeColabs
      .filter((c) => c.id !== collabId)
      .map((c) => ({ value: c.id, label: `${c.name} (${c.role})` })),
  ];

  const nameOf = (id: string | null) =>
    id ? activeColabs.find((c) => c.id === id)?.name ?? id : '—';

  const handleCollabChange = (id: string) => {
    setCollabId(id);
    setStartDate('');
    setEndDate('');
    setCoverages([]);
    setAlignMsg('');
    setError('');
    setAutoFillDone(false);
  };

  const handleTypeChange = (type: VacationType) => {
    setVacationType(type);
    if (type === 'SELL_ALL') setCoverages([]);
  };

  const handleStartDateChange = (val: string) => {
    if (!colab || !val) {
      setStartDate(val);
      return;
    }
    const aligned = alignVacationDates(val, colab, turma);
    setStartDate(aligned.startDate);
    setEndDate(aligned.endDate);
    setAlignMsg(aligned.adjusted && aligned.adjustmentReason ? aligned.adjustmentReason : '');
  };

  const handlePickOption = (opt: { vacationStart: string; vacationEnd: string }) => {
    setStartDate(opt.vacationStart);
    setEndDate(opt.vacationEnd);
    setAlignMsg('');
    setCoverages([]);
  };

  const applySmartCoverages = () => {
    if (coverageResult) setCoverages(buildCoveragesFromResult(coverageResult));
  };

  const applyCombination = (combo: CoverageCombinationView) => {
    if (!coverageResult) return;
    setCoverages(coveragesFromCombination(combo, coverageResult.slots));
  };

  const handleCoverageChange = (idx: number, field: keyof VacationCoverage, value: string) => {
    setCoverages((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addCoverage = () => {
    setCoverages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), collaboratorId: '', startDate: startDate || '', endDate: endDate || '' },
    ]);
  };

  const removeCoverage = (idx: number) => {
    setCoverages((prev) => prev.filter((_, i) => i !== idx));
  };

  const persist = async (status: 'draft' | 'confirmed') => {
    if (!collabId) {
      setError('Selecione um colaborador.');
      return;
    }
    if (anchorError) {
      setError(anchorError);
      return;
    }
    if (!startDate || !endDate) {
      setError('Informe as datas de início e fim.');
      return;
    }
    if (startDate > endDate) {
      setError('Data inicial deve ser anterior ou igual à data final.');
      return;
    }

    const validCoverages =
      vacationType === 'SELL_ALL'
        ? []
        : coverages.filter((c) => c.collaboratorId && c.startDate && c.endDate);

    // Duas pessoas não podem cobrir a mesma semana (mesmas datas + overlap total)
    if (validCoverages.length >= 2) {
      const [a, b] = validCoverages;
      if (a.collaboratorId === b.collaboratorId) {
        setError('Dois turnos não podem ser cobertos pela mesma pessoa. Escolha substitutos distintos.');
        return;
      }
    }

    if (vacationType === 'FULL' && status === 'confirmed' && validCoverages.length === 0) {
      setError('Adicione ao menos uma cobertura antes de confirmar férias integrais.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await saveVacationPlan({
        id: plan?.id,
        collaboratorId: collabId,
        startDate,
        endDate,
        vacationType,
        note,
        coverages: validCoverages,
        status,
        boardingStart: vacationType === 'SELL_10' ? addDaysToStr(startDate, 2) : undefined,
        boardingEnd: vacationType === 'SELL_10' ? addDaysToStr(startDate, 8) : undefined,
        soldDays: vacationType === 'SELL_10' ? 10 : vacationType === 'SELL_ALL' ? 30 : 0,
        requiresCoverageTurn1: vacationType === 'FULL',
        requiresCoverageTurn2: vacationType === 'FULL' || vacationType === 'SELL_10',
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" onClick={onClose} />

      <div className="animate-rise relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ background: 'var(--app-header)', color: 'var(--app-header-text)' }}
        >
          <div>
            <h2 className="font-display text-[16px] font-semibold">
              {plan ? 'Editar férias' : 'Nova programação de férias'}
            </h2>
            <p className="mt-0.5 text-[12px] text-white/55">Alinhado ao ciclo 14×14 da turma</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-[var(--app-surface-muted)] p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Colaborador"
              value={collabId}
              onChange={(e) => handleCollabChange(e.target.value)}
              options={colabOptions}
            />
            <Select
              label="Tipo de férias"
              value={vacationType}
              onChange={(e) => handleTypeChange(e.target.value as VacationType)}
              options={TYPE_OPTIONS}
            />
          </div>

          {anchorError && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[12px] text-amber-800 dark:text-amber-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {anchorError}
            </div>
          )}

          {colab && alignedOptions.length > 0 && (
            <div>
              <p className="mb-2 text-[12px] font-semibold text-[var(--app-text-muted)]">
                Opções alinhadas (início no penúltimo dia de folga)
              </p>
              <div className="flex flex-wrap gap-2">
                {alignedOptions.slice(0, 5).map((opt) => {
                  const selected = startDate === opt.vacationStart;
                  return (
                    <button
                      key={opt.vacationStart}
                      type="button"
                      onClick={() => handlePickOption(opt)}
                      className="cursor-pointer rounded-xl border px-3 py-2 text-left transition"
                      style={{
                        borderColor: selected ? 'var(--app-accent)' : 'var(--app-border)',
                        background: selected ? 'var(--app-accent-soft)' : 'var(--app-surface)',
                      }}
                    >
                      <div className="text-[12px] font-semibold text-[var(--app-text)]">
                        {formatDateBR(opt.vacationStart)} → {formatDateBR(opt.vacationEnd)}
                      </div>
                      <div className="text-[11px] text-[var(--app-text-muted)]">{opt.folgaPeriod}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Data início"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              disabled={Boolean(anchorError)}
            />
            <Input
              label="Data fim"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={Boolean(anchorError)}
            />
          </div>

          {alignMsg && (
            <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
              {alignMsg}
            </p>
          )}

          {alignment && startDate && endDate && (
            <p
              className="rounded-xl border px-3 py-2 text-[12px]"
              style={{
                borderColor: alignment.isAligned ? 'var(--app-accent)' : 'var(--app-border)',
                background: alignment.isAligned ? 'var(--app-accent-soft)' : 'var(--app-surface)',
                color: 'var(--app-text)',
              }}
            >
              {alignment.reason ||
                (alignment.isAligned
                  ? 'Período alinhado ao ciclo 14×14.'
                  : 'Período fora do alinhamento ideal.')}
            </p>
          )}

          {vacationType === 'SELL_10' && startDate && (
            <p className="text-[12px] text-[var(--app-text-muted)]">
              Embarque prolongado: {formatDateBR(addDaysToStr(startDate, 2))} →{' '}
              {formatDateBR(addDaysToStr(startDate, 8))} · ausência de férias começa depois.
            </p>
          )}

          <Input
            label="Observação"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opcional"
          />

          {vacationType !== 'SELL_ALL' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-bold tracking-wide text-[var(--app-text)] uppercase">
                  Coberturas (dobras)
                </p>
                <div className="flex items-center gap-2">
                  {coverageSlots.length > 0 && (
                    <button
                      type="button"
                      onClick={applySmartCoverages}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--app-accent)] transition hover:bg-[var(--app-accent-soft)]"
                    >
                      <Sparkles className="size-3.5" />
                      Melhor combinação
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={addCoverage}
                    className="cursor-pointer text-[12px] font-semibold text-[var(--app-accent)] underline"
                  >
                    + Manual
                  </button>
                </div>
              </div>

              {coverageResult?.bestSummary && (
                <p className="rounded-xl border border-[var(--app-accent)]/35 bg-[var(--app-accent-soft)] px-3 py-2 text-[12px] text-[var(--app-text)]">
                  Meta POB {coverageResult.targetPob} a bordo · {coverageResult.bestSummary}
                </p>
              )}

              {coverageSlots.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {coverageSlots.map((slot) => (
                    <div
                      key={slot.slotNumber}
                      className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3"
                    >
                      <p className="text-[12px] font-semibold text-[var(--app-text)]">{slot.title}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">
                        Semana {formatDateBR(slot.startDate)} → {formatDateBR(slot.endDate)}
                      </p>
                      {slot.recommendedCandidate && (
                        <>
                          <p className="mt-1 text-[11px] font-medium text-[var(--status-escala)]">
                            {slot.recommendedCandidate.name}
                            {slot.recommendedBadge ? ` · ${slot.recommendedBadge}` : ''}
                          </p>
                          {slot.recommendedCoverageStart && (
                            <p className="text-[11px] text-[var(--app-text-muted)]">
                              Dobra {formatDateBR(slot.recommendedCoverageStart)} →{' '}
                              {formatDateBR(slot.recommendedCoverageEnd || '')}
                              {slot.lagDays > 0 ? ` · defasagem ${slot.lagDays}d` : ''}
                            </p>
                          )}
                          {slot.recommendedReason && (
                            <p className="mt-1 text-[10px] leading-snug text-[var(--app-text-muted)]">
                              {slot.recommendedReason}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {coverageResult && coverageResult.combinations.length > 1 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold tracking-wide text-[var(--app-text-muted)] uppercase">
                    Outras combinações
                  </p>
                  <div className="space-y-1.5">
                    {coverageResult.combinations.slice(0, 5).map((combo, idx) => (
                      <button
                        key={`${combo.week1CollaboratorId}-${combo.week2CollaboratorId}-${idx}`}
                        type="button"
                        onClick={() => applyCombination(combo)}
                        className="flex w-full cursor-pointer items-start justify-between gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-left transition hover:border-[var(--app-accent)] hover:bg-[var(--app-accent-soft)]"
                      >
                        <div>
                          <p className="text-[11px] font-semibold text-[var(--app-text)]">
                            {idx === 0 ? '★ Recomendada' : `Opção ${idx + 1}`}
                            {' · '}
                            {combo.daysAtTargetPob}/{combo.totalMissedDays} dias POB{' '}
                            {coverageResult.targetPob}
                          </p>
                          <p className="text-[10px] text-[var(--app-text-muted)]">
                            1ª: {nameOf(combo.week1CollaboratorId)}
                            {combo.week1Start
                              ? ` (${formatDateBR(combo.week1Start)}→${formatDateBR(combo.week1End || '')})`
                              : ''}
                            {' · '}
                            2ª: {nameOf(combo.week2CollaboratorId)}
                            {combo.week2Start
                              ? ` (${formatDateBR(combo.week2Start)}→${formatDateBR(combo.week2End || '')})`
                              : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-[var(--app-accent)]">
                          Aplicar
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {coverages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--app-border)] px-3 py-4 text-center text-[12px] text-[var(--app-text-muted)]">
                  Nenhuma cobertura. Use “Melhor combinação” ou adicione manualmente.
                </p>
              ) : (
                coverages.map((cov, i) => (
                  <div
                    key={cov.id}
                    className="grid grid-cols-1 items-end gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 sm:grid-cols-[1fr_120px_120px_auto]"
                  >
                    <Select
                      label={i === 0 ? 'Substituto' : undefined}
                      value={cov.collaboratorId}
                      onChange={(e) => handleCoverageChange(i, 'collaboratorId', e.target.value)}
                      options={coverColabOptions}
                    />
                    <Input
                      label={i === 0 ? 'Início' : undefined}
                      type="date"
                      value={cov.startDate}
                      onChange={(e) => handleCoverageChange(i, 'startDate', e.target.value)}
                    />
                    <Input
                      label={i === 0 ? 'Fim' : undefined}
                      type="date"
                      value={cov.endDate}
                      onChange={(e) => handleCoverageChange(i, 'endDate', e.target.value)}
                    />
                    <button
                      type="button"
                      className="mb-1 cursor-pointer rounded-lg p-2 text-[var(--app-danger)] hover:bg-rose-500/10"
                      onClick={() => removeCoverage(i)}
                      title="Remover"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {error && (
            <p className="whitespace-pre-wrap rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => persist('draft')} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar rascunho'}
          </Button>
          <Button size="sm" onClick={() => persist('confirmed')} disabled={saving}>
            <CheckCircle2 className="size-3.5" />
            {saving ? 'Publicando…' : 'Salvar e lançar na escala'}
          </Button>
        </div>
      </div>
    </div>
  );
}
