import { useRef, useState } from 'react'
import { DownloadIcon, RotateCcwIcon, UploadIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useData } from '@/context/DataContext'
import type { BackupPayload } from '@/types'
import { downloadBackup, parseBackupFile, readFileAsText } from '@/utils/backup'

type Notice = { kind: 'success' | 'error'; message: string } | null

export function DataSection() {
  const { buildBackup, importBackup, clearAllData } = useData()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [pendingImport, setPendingImport] = useState<BackupPayload | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleExport = () => {
    try {
      downloadBackup(buildBackup())
      setNotice({ kind: 'success', message: 'Backup exportado com sucesso.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Falha ao exportar o backup.',
      })
    }
  }

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await readFileAsText(file)
      const payload = parseBackupFile(text)
      setPendingImport(payload)
      setNotice(null)
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Arquivo de backup inválido.',
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingImport) return
    try {
      setBusy(true)
      await importBackup(pendingImport)
      setNotice({ kind: 'success', message: 'Backup importado com sucesso.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Falha ao importar o backup.',
      })
    } finally {
      setBusy(false)
      setPendingImport(null)
    }
  }

  const handleConfirmClear = async () => {
    try {
      setBusy(true)
      await clearAllData()
      setNotice({ kind: 'success', message: 'Todos os dados foram apagados.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Falha ao apagar os dados.',
      })
    } finally {
      setBusy(false)
      setConfirmClear(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Dados</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Todos os dados ficam armazenados apenas neste navegador (IndexedDB). Exporte backups
        periodicamente para não perder o histórico.
      </p>

      {notice ? (
        <p
          className={
            notice.kind === 'success'
              ? 'mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200'
              : 'mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200'
          }
        >
          {notice.message}
        </p>
      ) : null}

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
    </section>
  )
}
