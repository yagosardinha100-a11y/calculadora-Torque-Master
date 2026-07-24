import { useEffect, useState } from 'react'
import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useData } from '@/context/DataContext'

export function CycleSection() {
  const { settings, updateSettings } = useData()

  const [daysOn, setDaysOn] = useState(String(settings.daysOn))
  const [daysOff, setDaysOff] = useState(String(settings.daysOff))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDaysOn(String(settings.daysOn))
    setDaysOff(String(settings.daysOff))
  }, [settings.daysOn, settings.daysOff])

  const handleSave = async () => {
    setError(null)
    setSaved(false)

    const parsedOn = Number(daysOn)
    const parsedOff = Number(daysOff)
    if (!Number.isInteger(parsedOn) || parsedOn < 1 || parsedOn > 60) {
      setError('Os dias embarcado devem ser um número inteiro entre 1 e 60.')
      return
    }
    if (!Number.isInteger(parsedOff) || parsedOff < 1 || parsedOff > 60) {
      setError('Os dias de folga devem ser um número inteiro entre 1 e 60.')
      return
    }

    try {
      setSaving(true)
      await updateSettings(parsedOn, parsedOff)
      setSaved(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Não foi possível salvar as configurações.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Ciclo da escala</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Padrão offshore 14x14. Alterações recalculam automaticamente toda a escala.
      </p>

      <div className="mt-4 grid max-w-md grid-cols-2 gap-4">
        <Field label="Dias embarcado" htmlFor="cycle-on">
          <Input
            id="cycle-on"
            type="number"
            min={1}
            max={60}
            value={daysOn}
            onChange={(event) => setDaysOn(event.target.value)}
          />
        </Field>
        <Field label="Dias de folga" htmlFor="cycle-off">
          <Input
            id="cycle-off"
            type="number"
            min={1}
            max={60}
            value={daysOff}
            onChange={(event) => setDaysOff(event.target.value)}
          />
        </Field>
      </div>

      {error ? (
        <p className="mt-3 max-w-md rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar ciclo'}
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
            <CheckIcon className="size-4" /> Ciclo atualizado
          </span>
        ) : null}
      </div>
    </section>
  )
}
