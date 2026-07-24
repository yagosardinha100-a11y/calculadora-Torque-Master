import { PageHeader } from '@/components/layout/PageHeader'
import { CycleSection } from '@/components/settings/CycleSection'
import { DataSection } from '@/components/settings/DataSection'
import { TeamsSection } from '@/components/settings/TeamsSection'

export function SettingsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <PageHeader
        title="Configurações"
        description="Turmas, ciclo da escala e gestão dos dados locais."
      />
      <div className="flex max-w-3xl flex-col gap-4 pb-6">
        <TeamsSection />
        <CycleSection />
        <DataSection />
      </div>
    </div>
  )
}
