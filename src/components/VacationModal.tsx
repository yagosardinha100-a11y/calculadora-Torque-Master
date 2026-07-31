import { useState, FormEvent, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { X, Palmtree, UserCheck, Plus, Trash2, CheckCircle2, Save, Calendar, AlertCircle, Sparkles, Check, Info, ShieldAlert, Zap } from 'lucide-react';
import type { VacationPlan, VacationCoverage, VacationType } from '../types';
import { getAlignedVacationOptions, checkVacationAlignment, calculateCoverageSlotsAndSuggestions, canRoleCover, addDaysToStr, alignVacationDates, getDaysDiff, formatDateBR } from '../lib/vacationUtils';

interface VacationModalProps {
  initialPlan?: VacationPlan | null;
  onClose: () => void;
}

export function VacationModal({ initialPlan, onClose }: VacationModalProps) {
  const {
    collaborators: rawCollaborators,
    turmas,
    events,
    vacations,
    saveVacationPlan,
    confirmVacationPlan,
  } = useData();

  const collaborators = rawCollaborators
    ? rawCollaborators.filter(c => c.active !== false).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const [collaboratorId, setCollaboratorId] = useState(initialPlan?.collaboratorId || '');
  const [startDate, setStartDate] = useState(initialPlan?.startDate || '');
  const [endDate, setEndDate] = useState(initialPlan?.endDate || '');
  const [note, setNote] = useState(initialPlan?.note || '');
  const [vacationType, setVacationType] = useState<VacationType>(initialPlan?.vacationType || 'FULL');
  const [autoAdjustNotice, setAutoAdjustNotice] = useState<{ original: string; adjusted: string; reason: string } | null>(null);
  const [coverages, setCoverages] = useState<VacationCoverage[]>(
    initialPlan?.coverages || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Set default collaborator if none selected and options available
  useEffect(() => {
    if (!collaboratorId && collaborators.length > 0) {
      setCollaboratorId(collaborators[0].id);
    }
  }, [collaborators, collaboratorId]);

  const selectedColab = collaborators?.find(c => c.id === collaboratorId);
  const selectedTurma = turmas?.find(t => t.id === selectedColab?.turmaId);

  const vacationOptions = selectedColab
    ? getAlignedVacationOptions(selectedColab, selectedTurma)
    : [];

  // Auto-set default aligned vacation dates if creating new plan and dates are empty
  useEffect(() => {
    if (!initialPlan && !startDate && vacationOptions.length > 0) {
      setStartDate(vacationOptions[0].vacationStart);
      setEndDate(vacationOptions[0].vacationEnd);
    }
  }, [initialPlan, startDate, vacationOptions]);

  const alignmentInfo = selectedColab && startDate && endDate
    ? checkVacationAlignment(startDate, endDate, selectedColab, selectedTurma)
    : null;

  const coverageSlots = selectedColab && startDate && endDate
    ? calculateCoverageSlotsAndSuggestions(
        selectedColab,
        startDate,
        endDate,
        collaborators || [],
        turmas || [],
        events || [],
        vacations || [],
        vacationType
      )
    : [];

  // Helper to sync coverage dates & candidates whenever coverageSlots change (calendar picking, option clicking, collaborator change)
  const syncCoveragesForSlots = (
    slots: typeof coverageSlots,
    currentCoverages: VacationCoverage[]
  ): VacationCoverage[] => {
    if (slots.length !== 2) return currentCoverages;

    const slot1 = slots[0];
    const slot2 = slots[1];

    const c1 = slot1.recommendedCandidate?.id || slot1.candidates[0]?.collaborator.id || '';
    let c2 = slot2.recommendedCandidate?.id || '';
    if (!c2 || c2 === c1) {
      c2 = slot2.candidates.find(cand => cand.collaborator.id !== c1)?.collaborator.id || '';
    }

    if (currentCoverages.length === 2) {
      const cov1Colab = slot1.candidates.some(cand => cand.collaborator.id === currentCoverages[0].collaboratorId && !cand.hasConflict)
        ? currentCoverages[0].collaboratorId
        : c1;

      const cov2Colab = slot2.candidates.some(cand => cand.collaborator.id === currentCoverages[1].collaboratorId && !cand.hasConflict && cand.collaborator.id !== cov1Colab)
        ? currentCoverages[1].collaboratorId
        : (c2 !== cov1Colab ? c2 : (slot2.candidates.find(cand => cand.collaborator.id !== cov1Colab)?.collaborator.id || c2));

      return [
        {
          id: currentCoverages[0].id || crypto.randomUUID(),
          collaboratorId: cov1Colab,
          startDate: slot1.startDate,
          endDate: slot1.endDate,
          note: currentCoverages[0].note || 'Cobertura 1º Turno (7d)',
        },
        {
          id: currentCoverages[1].id || crypto.randomUUID(),
          collaboratorId: cov2Colab,
          startDate: slot2.startDate,
          endDate: slot2.endDate,
          note: currentCoverages[1].note || 'Cobertura 2º Turno (7d)',
        },
      ];
    }

    return [
      {
        id: crypto.randomUUID(),
        collaboratorId: c1,
        startDate: slot1.startDate,
        endDate: slot1.endDate,
        note: 'Cobertura 1º Turno (7d)',
      },
      {
        id: crypto.randomUUID(),
        collaboratorId: c2,
        startDate: slot2.startDate,
        endDate: slot2.endDate,
        note: 'Cobertura 2º Turno (7d)',
      },
    ];
  };

  // Synchronize coverages whenever coverageSlots or vacationType update
  useEffect(() => {
    if (vacationType === 'SELL_ALL') {
      if (coverages.length > 0) {
        setCoverages([]);
      }
    } else if (vacationType === 'SELL_10') {
      if (coverageSlots.length === 1) {
        setCoverages(prev => {
          const slot = coverageSlots[0];
          if (
            prev.length === 1 &&
            prev[0].startDate === slot.startDate &&
            prev[0].endDate === slot.endDate
          ) {
            return prev;
          }
          let cId = slot.recommendedCandidate?.id || slot.candidates[0]?.collaborator.id || '';
          if (prev.length === 1 && prev[0].collaboratorId) {
            cId = prev[0].collaboratorId;
          }
          return [
            {
              id: prev[0]?.id || crypto.randomUUID(),
              collaboratorId: cId,
              startDate: slot.startDate,
              endDate: slot.endDate,
              note: prev[0]?.note || 'Cobertura 2º Turno (7d)',
            },
          ];
        });
      } else if (coverages.length > 1) {
        setCoverages([]);
      }
    } else if (vacationType === 'FULL') {
      if (coverageSlots.length === 2) {
        setCoverages(prev => {
          if (
            prev.length === 2 &&
            prev[0].startDate === coverageSlots[0].startDate &&
            prev[0].endDate === coverageSlots[0].endDate &&
            prev[1].startDate === coverageSlots[1].startDate &&
            prev[1].endDate === coverageSlots[1].endDate
          ) {
            return prev;
          }
          return syncCoveragesForSlots(coverageSlots, prev);
        });
      }
    }
  }, [coverageSlots, vacationType]);

  const handleVacationTypeChange = (newType: VacationType) => {
    setVacationType(newType);
    if (newType === 'SELL_ALL') {
      setCoverages([]);
    } else if (newType === 'SELL_10') {
      if (selectedColab && startDate && endDate) {
        const slots = calculateCoverageSlotsAndSuggestions(
          selectedColab,
          startDate,
          endDate,
          collaborators || [],
          turmas || [],
          events || [],
          vacations || [],
          'SELL_10'
        );
        if (slots.length === 1) {
          const slot2 = slots[0];
          const c2 = slot2.recommendedCandidate?.id || slot2.candidates[0]?.collaborator.id || '';
          setCoverages([
            {
              id: crypto.randomUUID(),
              collaboratorId: c2,
              startDate: slot2.startDate,
              endDate: slot2.endDate,
              note: 'Cobertura 2º Turno (7d)',
            },
          ]);
        } else {
          setCoverages([]);
        }
      }
    } else if (newType === 'FULL') {
      if (selectedColab && startDate && endDate) {
        const slots = calculateCoverageSlotsAndSuggestions(
          selectedColab,
          startDate,
          endDate,
          collaborators || [],
          turmas || [],
          events || [],
          vacations || [],
          'FULL'
        );
        if (slots.length === 2) {
          setCoverages(syncCoveragesForSlots(slots, []));
        }
      }
    }
  };

  const handleCollaboratorChange = (newColabId: string) => {
    setCollaboratorId(newColabId);
    const newColab = collaborators.find(c => c.id === newColabId);
    const newTurma = turmas?.find(t => t.id === newColab?.turmaId);
    if (newColab) {
      const opts = getAlignedVacationOptions(newColab, newTurma);
      if (opts.length > 0) {
        setStartDate(opts[0].vacationStart);
        setEndDate(opts[0].vacationEnd);
      }
    }
  };

  const handleStartDateChange = (newStart: string) => {
    if (!newStart) {
      setStartDate('');
      setAutoAdjustNotice(null);
      return;
    }

    const colab = collaborators.find(c => c.id === collaboratorId);
    const turma = turmas?.find(t => t.id === colab?.turmaId);

    if (colab) {
      const aligned = alignVacationDates(newStart, colab, turma);
      setStartDate(aligned.startDate);
      setEndDate(aligned.endDate);
      if (aligned.adjusted && aligned.adjustmentReason) {
        setAutoAdjustNotice({
          original: aligned.originalStart,
          adjusted: aligned.startDate,
          reason: aligned.adjustmentReason,
        });
      } else {
        setAutoAdjustNotice(null);
      }
    } else {
      setStartDate(newStart);
      setEndDate(addDaysToStr(newStart, 29));
      setAutoAdjustNotice(null);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    setAutoAdjustNotice(null);
  };

  const handleApplySmartSplit = () => {
    if (coverageSlots.length === 2) {
      const slot1 = coverageSlots[0];
      const slot2 = coverageSlots[1];

      const c1 = slot1.recommendedCandidate?.id || slot1.candidates[0]?.collaborator.id || '';
      let c2 = slot2.recommendedCandidate?.id || '';
      if (!c2 || c2 === c1) {
        c2 = slot2.candidates.find(cand => cand.collaborator.id !== c1)?.collaborator.id || '';
      }

      setCoverages([
        {
          id: crypto.randomUUID(),
          collaboratorId: c1,
          startDate: slot1.startDate,
          endDate: slot1.endDate,
          note: 'Cobertura 1º Turno (7d)',
        },
        {
          id: crypto.randomUUID(),
          collaboratorId: c2,
          startDate: slot2.startDate,
          endDate: slot2.endDate,
          note: 'Cobertura 2º Turno (7d)',
        },
      ]);
    } else if (coverageSlots.length === 1) {
      const slot2 = coverageSlots[0];
      const c2 = slot2.recommendedCandidate?.id || slot2.candidates[0]?.collaborator.id || '';

      setCoverages([
        {
          id: crypto.randomUUID(),
          collaboratorId: c2,
          startDate: slot2.startDate,
          endDate: slot2.endDate,
          note: 'Cobertura 2º Turno (7d)',
        },
      ]);
    }
  };

  const handleSelectOption = (opt: ReturnType<typeof getAlignedVacationOptions>[0]) => {
    setStartDate(opt.vacationStart);
    setEndDate(opt.vacationEnd);

    if (selectedColab) {
      const slots = calculateCoverageSlotsAndSuggestions(
        selectedColab,
        opt.vacationStart,
        opt.vacationEnd,
        collaborators || [],
        turmas || [],
        events || [],
        vacations || [],
        vacationType
      );

      if (slots.length === 2) {
        const c1 = slots[0].recommendedCandidate?.id || slots[0].candidates[0]?.collaborator.id || '';
        let c2 = slots[1].recommendedCandidate?.id || '';
        if (!c2 || c2 === c1) {
          c2 = slots[1].candidates.find(cand => cand.collaborator.id !== c1)?.collaborator.id || '';
        }

        setCoverages([
          {
            id: crypto.randomUUID(),
            collaboratorId: c1,
            startDate: slots[0].startDate,
            endDate: slots[0].endDate,
            note: 'Cobertura 1º Turno (7d)',
          },
          {
            id: crypto.randomUUID(),
            collaboratorId: c2,
            startDate: slots[1].startDate,
            endDate: slots[1].endDate,
            note: 'Cobertura 2º Turno (7d)',
          },
        ]);
      } else if (slots.length === 1) {
        const slot2 = slots[0];
        const c2 = slot2.recommendedCandidate?.id || slot2.candidates[0]?.collaborator.id || '';

        setCoverages([
          {
            id: crypto.randomUUID(),
            collaboratorId: c2,
            startDate: slot2.startDate,
            endDate: slot2.endDate,
            note: 'Cobertura 2º Turno (7d)',
          },
        ]);
      }
    }
  };

  const handleAddCoverage = () => {
    const availableColabs = collaborators?.filter(c => c.id !== collaboratorId) || [];
    const defaultColab = availableColabs.length > 0 ? availableColabs[0].id : '';

    const newCov: VacationCoverage = {
      id: crypto.randomUUID(),
      collaboratorId: defaultColab,
      startDate: startDate || '',
      endDate: endDate || '',
      note: '',
    };
    setCoverages([...coverages, newCov]);
  };

  const handleRemoveCoverage = (covId: string) => {
    setCoverages(coverages.filter(c => c.id !== covId));
  };

  const handleUpdateCoverage = (covId: string, field: keyof VacationCoverage, value: string) => {
    setCoverages(coverages.map(c => (c.id === covId ? { ...c, [field]: value } : c)));
  };

  const validate = (): boolean => {
    if (!collaboratorId) {
      setErrorMsg('Selecione o colaborador que sairá de férias.');
      return false;
    }
    if (!startDate || !endDate) {
      setErrorMsg('Informe o período (início e fim) das férias.');
      return false;
    }
    if (startDate > endDate) {
      setErrorMsg('A data de início das férias deve ser anterior ou igual à data de fim.');
      return false;
    }

    for (let i = 0; i < coverages.length; i++) {
      const cov = coverages[i];
      if (!cov.collaboratorId) {
        setErrorMsg(`Selecione o colaborador substituto na cobertura #${i + 1}.`);
        return false;
      }
      if (cov.collaboratorId === collaboratorId) {
        setErrorMsg(`O substituto da cobertura #${i + 1} não pode ser a própria pessoa em férias.`);
        return false;
      }

      const subColab = collaborators.find(c => c.id === cov.collaboratorId);
      if (selectedColab && subColab) {
        if (!canRoleCover(subColab.role, selectedColab.role)) {
          setErrorMsg(`O substituto ${subColab.name} (${subColab.role}) não possui permissão para cobrir o cargo de ${selectedColab.name} (${selectedColab.role}). Veja os critérios de cobertura.`);
          return false;
        }
      }

      if (!cov.startDate || !cov.endDate) {
        setErrorMsg(`Informe as datas de início e fim da cobertura #${i + 1}.`);
        return false;
      }
    }

    const selectedSubstitutes = coverages.map(c => c.collaboratorId).filter(Boolean);
    const uniqueSubstitutes = new Set(selectedSubstitutes);
    if (uniqueSubstitutes.size < selectedSubstitutes.length) {
      setErrorMsg('O mesmo colaborador não pode ser selecionado mais de uma vez para fazer a cobertura no mesmo período de férias.');
      return false;
    }

    setErrorMsg('');
    return true;
  };

  const handleSaveDraft = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await saveVacationPlan({
        id: initialPlan?.id,
        collaboratorId,
        startDate,
        endDate,
        note,
        coverages: vacationType === 'SELL_ALL' ? [] : coverages,
        status: 'draft',
        vacationType,
        boardingStart: vacationType === 'SELL_10' ? addDaysToStr(startDate, 2) : undefined,
        boardingEnd: vacationType === 'SELL_10' ? addDaysToStr(startDate, 8) : undefined,
        soldDays: vacationType === 'SELL_10' ? 10 : (vacationType === 'SELL_ALL' ? 30 : 0),
        requiresCoverageTurn1: vacationType === 'FULL',
        requiresCoverageTurn2: vacationType === 'FULL' || vacationType === 'SELL_10',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg('Erro ao salvar programação: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAndPublish = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const planId = await saveVacationPlan({
        id: initialPlan?.id,
        collaboratorId,
        startDate,
        endDate,
        note,
        coverages,
        status: 'confirmed',
      });
      await confirmVacationPlan(planId);
      onClose();
    } catch (err: any) {
      setErrorMsg('Erro ao lançar na escala: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-4 backdrop-blur-[2px]">
      <div
        className="app-surface w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-[var(--app-border)] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label={initialPlan ? 'Editar Programação de Férias' : 'Nova Programação de Férias'}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 text-white shrink-0"
          style={{ background: 'var(--app-header)' }}
        >
          <div className="flex items-center gap-3">
            <Palmtree className="w-5 h-5 text-[var(--app-accent)] shrink-0" />
            <div>
              <h3 className="font-display font-semibold text-[15px] text-white">
                {initialPlan ? 'Editar Programação de Férias' : 'Nova Programação de Férias'}
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Programe o período de férias e defina os substitutos de cobertura.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition-colors hover:text-white cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSaveDraft} className="p-6 overflow-y-auto space-y-6 text-sm flex-1 bg-[var(--app-surface-muted)]">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Colaborador & Período Principal */}
          <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-5 space-y-4 shadow-2xs">
            <h4 className="font-bold text-[var(--app-text)] text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[var(--app-border)]">
              <UserCheck className="w-4 h-4 text-[var(--app-accent)]" />
              1. Colaborador em Férias
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Colaborador
                </label>
                <Select
                  value={collaboratorId}
                  onChange={e => handleCollaboratorChange(e.target.value)}
                  required
                >
                  <option value="">-- Selecione o Colaborador --</option>
                  {collaborators.map(colab => (
                    <option key={colab.id} value={colab.id}>
                      {colab.name} ({colab.role})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Tipo de Férias */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold text-[var(--app-text-muted)]">
                  Tipo de Férias
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label
                    className={`flex flex-1 cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                      vacationType === 'FULL'
                        ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] ring-1 ring-[var(--app-accent)]'
                        : 'border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vacationType"
                      value="FULL"
                      checked={vacationType === 'FULL'}
                      onChange={() => handleVacationTypeChange('FULL')}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--app-accent)]"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm leading-tight font-semibold text-[var(--app-text)]">
                        Férias integrais (30 dias)
                      </span>
                    </div>
                  </label>
                  <label
                    className={`flex flex-1 cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                      vacationType === 'SELL_10'
                        ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/40'
                        : 'border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vacationType"
                      value="SELL_10"
                      checked={vacationType === 'SELL_10'}
                      onChange={() => handleVacationTypeChange('SELL_10')}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-amber-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm leading-tight font-semibold text-[var(--app-text)]">
                        Venda parcial (10 dias)
                      </span>
                    </div>
                  </label>
                  <label
                    className={`flex flex-1 cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                      vacationType === 'SELL_ALL'
                        ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/40'
                        : 'border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vacationType"
                      value="SELL_ALL"
                      checked={vacationType === 'SELL_ALL'}
                      onChange={() => handleVacationTypeChange('SELL_ALL')}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm leading-tight font-semibold text-[var(--app-text)]">
                        Venda total
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 30-Day Shift-Aligned Suggestions */}
              {vacationOptions.length > 0 && (
                <div className="md:col-span-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Sugestões de Férias 30d (Alinhadas à Escala 14x14):
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {vacationOptions.slice(0, 4).map((opt, i) => {
                      const isSelected = startDate === opt.vacationStart && endDate === opt.vacationEnd;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                              : 'bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          <span>{opt.label.split(' (')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--app-accent)]" />
                  Início das Férias
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--app-accent)]" />
                  Término das Férias
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => handleEndDateChange(e.target.value)}
                  required
                />
              </div>

              {/* Auto-Adjust Notice Banner when picking start date on calendar */}
              {autoAdjustNotice && (
                <div className="md:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{autoAdjustNotice.reason}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(autoAdjustNotice.original);
                      setEndDate(addDaysToStr(autoAdjustNotice.original, 29));
                      setAutoAdjustNotice(null);
                    }}
                    className="shrink-0 px-2.5 py-1 bg-[var(--app-surface)] hover:bg-[var(--app-accent-soft)] text-[var(--app-accent)] border border-[var(--app-border)] font-bold rounded text-[11px] transition-colors self-end sm:self-auto cursor-pointer"
                  >
                    Desfazer e usar {autoAdjustNotice.original.split('-').reverse().join('/')}
                  </button>
                </div>
              )}

              {/* Alignment Status Banner */}
              {alignmentInfo && (
                <div className="md:col-span-2">
                  {alignmentInfo.isAligned ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{alignmentInfo.reason}</span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{alignmentInfo.reason}</span>
                      </div>
                      {selectedColab && startDate && (
                        <button
                          type="button"
                          onClick={() => {
                            const aligned = alignVacationDates(startDate, selectedColab, selectedTurma);
                            setStartDate(aligned.startDate);
                            setEndDate(aligned.endDate);
                            if (aligned.adjusted && aligned.adjustmentReason) {
                              setAutoAdjustNotice({
                                original: aligned.originalStart,
                                adjusted: aligned.startDate,
                                reason: aligned.adjustmentReason,
                              });
                            }
                          }}
                          className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] transition-colors self-end sm:self-auto cursor-pointer"
                        >
                          Ajustar Início em 2 Dias
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Resumo Operacional */}
              {vacationType === 'SELL_10' && startDate && endDate && (
                <div className="md:col-span-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 font-medium shadow-sm">
                    <h5 className="font-bold text-amber-950 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      Resumo Operacional (Venda Parcial)
                    </h5>
                    <div className="flex flex-col gap-1.5 pl-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold w-36">Embarque inicial:</span>
                        <span>{formatDateBR(addDaysToStr(startDate, 2))} até {formatDateBR(addDaysToStr(startDate, 8))}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold w-36">Férias (Ausência):</span>
                        <span>{formatDateBR(addDaysToStr(startDate, 9))} até {formatDateBR(endDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <span className="font-bold w-36">Retorno automático:</span>
                        <span>{formatDateBR(addDaysToStr(endDate, 1))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {vacationType === 'SELL_ALL' && (
                <div className="md:col-span-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900 font-medium shadow-sm flex items-start gap-2.5">
                    <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-950 mb-1">Venda total das férias.</strong>
                      <p>O colaborador permanecerá em sua escala normal. Nenhuma cobertura será criada e não haverá registro de ausência na escala operacional.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <Input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ex: Período aquisitivo 2025/2026"
                />
              </div>
            </div>
          </div>

          {/* Definição das Coberturas */}
          {vacationType !== 'SELL_ALL' && (
            <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--app-border)]">
                <div>
                  <h4 className="font-bold text-[var(--app-text)] text-xs uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--app-accent)]" />
                    2. Cobertura de Férias (Substitutos de 7 Dias)
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {coverageSlots.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApplySmartSplit}
                      className="gap-1.5 text-xs shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      {coverageSlots.length === 2 ? 'Aplicar Sugestão Inteligente (2x 7d)' : 'Aplicar Sugestão (1x 7d)'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddCoverage}
                    className="gap-1 text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Cobertura
                  </Button>
                </div>
              </div>

              {coverages.length === 0 ? (
                <div className="p-4 bg-[var(--app-surface-muted)] border border-dashed border-[var(--app-border)] rounded-xl text-center text-xs text-[var(--app-text-muted)] font-medium">
                  Nenhuma cobertura adicionada ainda. Clique em <strong>"Aplicar Sugestão {coverageSlots.length === 2 ? 'Inteligente' : ''}"</strong> para auto-preencher os substitutos.
                </div>
              ) : (
              <div className="space-y-4">
                {coverages.map((cov, index) => {
                  const slotSuggestion = coverageSlots[index];
                  const chosenInOtherSlots = coverages
                    .filter(otherCov => otherCov.id !== cov.id)
                    .map(otherCov => otherCov.collaboratorId)
                    .filter(Boolean);

                  const enrichedCandidates = slotSuggestion?.candidates
                    .map(cand => {
                      const isDuplicate = chosenInOtherSlots.includes(cand.collaborator.id);
                      if (isDuplicate) {
                        return {
                          ...cand,
                          isRecommended: false,
                          hasConflict: true,
                          conflicts: [
                            ...cand.conflicts,
                            'Já selecionado no outro turno (máximo 7d por colaborador)',
                          ],
                          badgeLabel: 'Impedido (Já Selecionado no Outro Turno)',
                        };
                      }
                      return cand;
                    })
                    .sort((a, b) => {
                      if (a.isRecommended && !b.isRecommended) return -1;
                      if (!a.isRecommended && b.isRecommended) return 1;
                      if (!a.hasConflict && b.hasConflict) return -1;
                      if (a.hasConflict && !b.hasConflict) return 1;
                      return b.score - a.score || a.collaborator.name.localeCompare(b.collaborator.name);
                    });

                  const candidateInfo = enrichedCandidates?.find(c => c.collaborator.id === cov.collaboratorId);

                  return (
                    <div key={cov.id} className="p-4 bg-[var(--app-surface-muted)] border border-[var(--app-border)] rounded-xl shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--app-border)] flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--app-text)] bg-[var(--app-surface-muted)] px-2.5 py-0.5 rounded-md">
                            Turno #{slotSuggestion?.slotNumber || (index + 1)} ({cov.startDate && cov.endDate ? `${cov.startDate.split('-').reverse().join('/')} a ${cov.endDate.split('-').reverse().join('/')}` : '7 dias'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCoverage(cov.id)}
                          className="text-red-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                            <span>Substituto</span>
                            {candidateInfo?.isRecommended && (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Recomendado pela Escala
                              </span>
                            )}
                          </label>
                          <Select
                            value={cov.collaboratorId}
                            onChange={e => handleUpdateCoverage(cov.id, 'collaboratorId', e.target.value)}
                          >
                            <option value="" disabled>Selecione um substituto...</option>
                            {enrichedCandidates ? (
                              enrichedCandidates.map(cand => {
                                const isDuplicate = chosenInOtherSlots.includes(cand.collaborator.id);
                                return (
                                  <option key={cand.collaborator.id} value={cand.collaborator.id}>
                                    {isDuplicate
                                      ? '🚫 [JÁ SELECIONADO] '
                                      : cand.hasConflict
                                      ? '⚠️ [INDISPONÍVEL] '
                                      : cand.isRecommended
                                      ? '⭐ [RECOMENDADO] '
                                      : ''}
                                    {cand.collaborator.name} ({cand.collaborator.role}) - {cand.badgeLabel}
                                  </option>
                                );
                              })
                            ) : (
                              collaborators
                                ?.filter(c => c.id !== collaboratorId)
                                .map(colab => {
                                  const isDuplicate = chosenInOtherSlots.includes(colab.id);
                                  return (
                                    <option key={colab.id} value={colab.id}>
                                      {isDuplicate ? '🚫 [JÁ SELECIONADO] ' : ''}
                                      {colab.name} ({colab.role})
                                    </option>
                                  );
                                })
                            )}
                          </Select>

                          {/* Conflict Alert Box */}
                          {candidateInfo?.hasConflict && (
                            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-900 flex items-start gap-2 font-medium">
                              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-red-950 font-bold block text-[11px]">
                                  Conflito Detectado:
                                </strong>
                                <ul className="list-disc list-inside text-[11px] text-red-800">
                                  {candidateInfo.conflicts.map((conf, idx) => (
                                    <li key={idx}>{conf}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Início da Dobra
                          </label>
                          <Input
                            type="date"
                            value={cov.startDate}
                            onChange={e => handleUpdateCoverage(cov.id, 'startDate', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Fim da Dobra
                          </label>
                          <Input
                            type="date"
                            value={cov.endDate}
                            onChange={e => handleUpdateCoverage(cov.id, 'endDate', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Anotação (Opcional)
                          </label>
                          <Input
                            value={cov.note || ''}
                            onChange={e => handleUpdateCoverage(cov.id, 'note', e.target.value)}
                            placeholder="Ex: Cobertura 1º Turno (7d)"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="bg-[var(--app-surface-muted)] px-6 py-4 border-t border-[var(--app-border)] flex items-center justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="gap-2 whitespace-nowrap text-xs"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Rascunho</span>
          </Button>

          <Button
            type="button"
            onClick={handleConfirmAndPublish}
            disabled={isSubmitting}
            className="gap-2 whitespace-nowrap text-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar e Lançar na Escala</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
