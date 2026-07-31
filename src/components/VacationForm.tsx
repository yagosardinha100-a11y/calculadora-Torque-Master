import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useData } from '../data/DataProvider';
import type { VacationPlan, VacationType, VacationCoverage } from '../domain/types';
import {
  getAlignedVacationOptions,
  alignVacationDates,
  calculateCoverageSlotsAndSuggestions,
} from '../domain/vacationUtils';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

const TYPE_OPTIONS: { value: VacationType; label: string }[] = [
  { value: 'FULL',     label: 'Integral (30 dias)' },
  { value: 'SELL_10',  label: 'Venda 10 dias' },
  { value: 'SELL_ALL', label: 'Venda Total' },
];

interface Props {
  plan: VacationPlan | null;
  onClose: () => void;
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

  const colab = collaborators.find(c => c.id === collabId);
  const turma = colab ? turmas.find(t => t.id === colab.turmaId) : undefined;

  /* Aligned options */
  const alignedOptions = useMemo(() => {
    if (!colab) return [];
    return getAlignedVacationOptions(colab, turma, 6);
  }, [colab, turma]);

  const colabOptions = [
    { value: '', label: 'Selecionar colaborador…' },
    ...collaborators.filter(c => c.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(c => ({ value: c.id, label: c.name })),
  ];

  const handleStartDateChange = (val: string) => {
    if (!colab || !val) { setStartDate(val); return; }
    const aligned = alignVacationDates(val, colab, turma);
    setStartDate(aligned.startDate);
    setEndDate(aligned.endDate);
    if (aligned.adjusted && aligned.adjustmentReason) {
      setAlignMsg(aligned.adjustmentReason);
    } else {
      setAlignMsg('');
    }
  };

  /* Coverage suggestions */
  const coverageSlots = useMemo(() => {
    if (!colab || !startDate || !endDate || vacationType === 'SELL_ALL') return [];
    return calculateCoverageSlotsAndSuggestions(
      colab,
      startDate,
      endDate,
      collaborators,
      turmas,
      events,
      vacations,
      vacationType,
    );
  }, [colab, startDate, endDate, vacationType, collaborators, turmas, events, vacations]);

  const handlePickOption = (opt: { vacationStart: string; vacationEnd: string }) => {
    setStartDate(opt.vacationStart);
    setEndDate(opt.vacationEnd);
    setAlignMsg('');
  };

  const handleCoverageChange = (idx: number, field: keyof VacationCoverage, value: string) => {
    setCoverages(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addCoverage = () => {
    setCoverages(prev => [...prev, { id: crypto.randomUUID(), collaboratorId: '', startDate: '', endDate: '' }]);
  };

  const removeCoverage = (idx: number) => {
    setCoverages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!collabId) { setError('Selecione um colaborador.'); return; }
    if (!startDate || !endDate) { setError('Datas obrigatórias.'); return; }
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
        coverages: coverages.filter(c => c.collaboratorId && c.startDate && c.endDate),
        status: plan?.status ?? 'draft',
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const coverColabOptions = [
    { value: '', label: 'Colaborador…' },
    ...collaborators.filter(c => c.active !== false && c.id !== collabId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map(c => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-2xl flex flex-col"
        style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--app-border)' }}>
          <h2 className="font-display text-base font-semibold" style={{ color: 'var(--app-text)' }}>
            {plan ? 'Editar Férias' : 'Nova Programação de Férias'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70">
            <X size={16} style={{ color: 'var(--app-text-muted)' }} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Collaborator + Type */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Colaborador"
              value={collabId}
              onChange={e => { setCollabId(e.target.value); setStartDate(''); setEndDate(''); setAlignMsg(''); }}
              options={colabOptions}
            />
            <Select
              label="Tipo de Férias"
              value={vacationType}
              onChange={e => setVacationType(e.target.value as VacationType)}
              options={TYPE_OPTIONS}
            />
          </div>

          {/* Aligned date suggestions */}
          {colab && alignedOptions.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium" style={{ color: 'var(--app-text-muted)' }}>Opções alinhadas à turma</p>
              <div className="flex flex-wrap gap-1.5">
                {alignedOptions.slice(0, 4).map(opt => (
                  <button
                    key={opt.vacationStart}
                    onClick={() => handlePickOption(opt)}
                    className="rounded border px-2 py-1 text-xs transition-colors hover:opacity-80"
                    style={{
                      borderColor: startDate === opt.vacationStart ? 'var(--app-accent)' : 'var(--app-border)',
                      background: startDate === opt.vacationStart ? 'var(--app-accent-soft)' : 'var(--app-surface-muted)',
                      color: 'var(--app-text)',
                    }}
                  >
                    <span className="font-medium">{opt.label.split(' (')[0]}</span>
                    <span className="ml-1 opacity-60 text-[10px]">{opt.folgaPeriod}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data Início"
              type="date"
              value={startDate}
              onChange={e => handleStartDateChange(e.target.value)}
            />
            <Input
              label="Data Fim"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          {alignMsg && (
            <p className="text-xs rounded-md border px-3 py-2" style={{ color: 'var(--status-dobra)', borderColor: 'var(--status-dobra)', background: 'rgba(217,119,6,0.08)' }}>
              {alignMsg}
            </p>
          )}

          {/* Note */}
          <Input
            label="Observação"
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Opcional"
          />

          {/* Coverage suggestions */}
          {coverageSlots.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--app-text)' }}>Sugestões de Cobertura</p>
              {coverageSlots.map(slot => (
                <div
                  key={slot.slotNumber}
                  className="rounded-lg border p-3 flex flex-col gap-1"
                  style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface-muted)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'var(--app-text)' }}>{slot.title}</p>
                  <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                    {slot.startDate} → {slot.endDate}
                    {slot.recommendedCandidate && (
                      <> · <span style={{ color: 'var(--status-escala)' }}>Recomendado: {slot.recommendedCandidate.name}</span></>
                    )}
                  </p>
                  {slot.recommendedCandidate && coverages.findIndex(c => c.collaboratorId === slot.recommendedCandidate!.id) === -1 && (
                    <button
                      className="self-start text-xs underline mt-0.5"
                      style={{ color: 'var(--app-accent)' }}
                      onClick={() => {
                        setCoverages(prev => [...prev, {
                          id: crypto.randomUUID(),
                          collaboratorId: slot.recommendedCandidate!.id,
                          startDate: slot.startDate,
                          endDate: slot.endDate,
                        }]);
                      }}
                    >
                      Adicionar cobertura
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Coverages */}
          {vacationType !== 'SELL_ALL' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: 'var(--app-text)' }}>Coberturas</p>
                <button className="text-xs underline" style={{ color: 'var(--app-accent)' }} onClick={addCoverage}>
                  + Adicionar
                </button>
              </div>
              {coverages.map((cov, i) => (
                <div key={cov.id} className="grid grid-cols-[1fr_100px_100px_auto] gap-2 items-end">
                  <Select
                    label={i === 0 ? 'Substituto' : undefined}
                    value={cov.collaboratorId}
                    onChange={e => handleCoverageChange(i, 'collaboratorId', e.target.value)}
                    options={coverColabOptions}
                  />
                  <Input
                    label={i === 0 ? 'Início' : undefined}
                    type="date"
                    value={cov.startDate}
                    onChange={e => handleCoverageChange(i, 'startDate', e.target.value)}
                  />
                  <Input
                    label={i === 0 ? 'Fim' : undefined}
                    type="date"
                    value={cov.endDate}
                    onChange={e => handleCoverageChange(i, 'endDate', e.target.value)}
                  />
                  <button
                    className="p-1.5 rounded hover:opacity-70 mb-0.5"
                    onClick={() => removeCoverage(i)}
                    title="Remover"
                  >
                    <X size={13} style={{ color: 'var(--app-danger)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs rounded-md border px-3 py-2" style={{ color: 'var(--app-danger)', borderColor: 'var(--app-danger)', background: 'rgba(200,30,74,0.06)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--app-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar Rascunho'}
          </Button>
        </div>
      </div>
    </div>
  );
}
