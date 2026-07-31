import { useRef, useState } from 'react'
import { DownloadIcon, RotateCcwIcon, UploadIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import type { BackupPayload } from '@/types'
import { downloadBackup, parseBackupFile, readFileAsText } from '@/utils/backup'

export function DataSection() {
  const { buildBackup, importBackup, clearAllData, resetLocalDatabase, storageMode } = useData()
  const { showToast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<BackupPayload | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleExport = () => {
    try {
      downloadBackup(buildBackup())
      showToast('success', 'Backup exportado com sucesso.')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Falha ao exportar o backup.',
      )
    }
  }

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await readFileAsText(file)
      const payload = parseBackupFile(text)
      setPendingImport(payload)
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Arquivo de backup inválido.',
      )
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingImport) return
    try {
      setBusy(true)
      await importBackup(pendingImport)
      showToast('success', 'Backup importado com sucesso.')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Falha ao importar o backup.',
      )
    } finally {
      setBusy(false)
      setPendingImport(null)
    }
  }

  const handleConfirmClear = async () => {
    try {
      setBusy(true)
      await clearAllData()
      showToast('success', 'Todos os dados foram apagados.')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Falha ao apagar os dados.',
      )
    } finally {
      setBusy(false)
      setConfirmClear(false)
    }
  }

  const handleConfirmReset = async () => {
    try {
      setBusy(true)
      await resetLocalDatabase()
      showToast('success', 'Banco de dados local recriado com sucesso.')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Falha ao resetar o banco local.',
      )
    } finally {
      setBusy(false)
      setConfirmReset(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Dados</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Todos os dados ficam armazenados apenas neste navegador
        {storageMode === 'memory'
          ? ' (modo alternativo — exporte backups com frequência).'
          : ' (IndexedDB). Exporte backups periodicamente para não perder o histórico.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" icon={<DownloadIcon />} onClick={handleExport}>
          Exportar backup (JSON)
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<UploadIcon />}
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          Importar backup
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<RotateCcwIcon />}
          disabled={busy}
          onClick={() => setConfirmClear(true)}
        >
          Apagar todos os dados
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => setConfirmReset(true)}
        >
          Resetar banco local
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleFileSelected(event.target.files?.[0])}
        />
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Importar backup"
        message="Todos os dados atuais serão substituídos pelo conteúdo do backup. Esta ação não pode ser desfeita."
        confirmLabel="Substituir dados"
        onConfirm={() => void handleConfirmImport()}
        onCancel={() => setPendingImport(null)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Apagar todos os dados"
        message="Colaboradores, turmas, ajustes, dobras e compromissos serão apagados permanentemente deste navegador. Esta ação não pode ser desfeita."
        confirmLabel="Apagar tudo"
        onConfirm={() => void handleConfirmClear()}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Resetar banco local"
        message="Recria o IndexedDB do zero. Use quando houver erro de schema ou dados corrompidos. Exporte um backup antes, se possível."
        confirmLabel="Resetar banco"
        onConfirm={() => void handleConfirmReset()}
        onCancel={() => setConfirmReset(false)}
      />
    </section>
  )
}
