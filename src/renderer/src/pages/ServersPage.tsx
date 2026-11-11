import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import CreateServerWizard from '../components/CreateServerWizard'

function formatMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function isBusy(p: InstallProgress | undefined): boolean {
  return !!p && (p.stage === 'preparing' || p.stage === 'downloading' || p.stage === 'java')
}

export default function ServersPage() {
  const { t } = useI18n()
  const [servers, setServers] = useState<ServerConfig[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [progress, setProgress] = useState<Record<string, InstallProgress>>({})

  async function reload() {
    setServers(await window.api.servers.list())
  }

  useEffect(() => {
    reload()
    if (!window.api.install) {
      console.error('window.api.install не найден: preload не обновился, перезапусти npm run dev')
      return
    }
    const unsubscribe = window.api.install.onProgress((p) => {
      setProgress((prev) => ({ ...prev, [p.id]: p }))
      if (p.stage === 'done') reload()
    })
    return unsubscribe
  }, [])

  async function install(id: string) {
    setProgress((prev) => ({
      ...prev,
      [id]: { id, stage: 'preparing', received: 0, total: 0 }
    }))
    await window.api.install.start(id)
  }

  async function remove(id: string) {
    setServers(await window.api.servers.remove(id))
  }

  function renderStatus(s: ServerConfig) {
    const p = progress[s.id]

    if (p && isBusy(p)) {
      const percent = p.total > 0 ? Math.round((p.received / p.total) * 100) : 0
      const indeterminate = p.stage === 'preparing' || p.stage === 'java'
      return (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted">
            <span>
              {p.stage === 'preparing'
                ? t('servers.preparing')
                : p.stage === 'java'
                  ? t('servers.installingJava')
                  : t('servers.downloading')}
            </span>
            {p.stage === 'downloading' && (
              <span>
                {formatMb(p.received)} / {formatMb(p.total)} · {percent}%
              </span>
            )}
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className={'h-full bg-teal transition-all ' + (indeterminate ? 'animate-pulse' : '')}
              style={{ width: indeterminate ? '100%' : percent + '%' }}
            />
          </div>
        </div>
      )
    }

    if (p?.stage === 'error') {
      return (
        <div className="mt-2 text-xs text-amber">
          {t('servers.installError')}: {p.message}
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex h-full flex-col p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('servers.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('servers.description')}</p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
        >
          {t('servers.create')}
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line text-muted">
          <div className="text-base text-text">{t('servers.empty')}</div>
          <div className="mt-1 text-sm">{t('servers.emptyHint')}</div>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {servers.map((s) => {
            const busy = isBusy(progress[s.id])
            return (
              <div key={s.id} className="rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.name}</span>
                      <span
                        className={
                          'rounded px-1.5 py-0.5 text-[10px] ' +
                          (s.installed ? 'bg-teal/15 text-teal' : 'bg-amber/15 text-amber')
                        }
                      >
                        {s.installed ? t('servers.installed') : t('servers.notInstalled')}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {s.core} · {s.mcVersion} · {s.maxRamMb / 1024} GB
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted">{s.dir}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!s.installed && !busy && (
                      <button
                        onClick={() => install(s.id)}
                        className="rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-bg"
                      >
                        {t('servers.install')}
                      </button>
                    )}
                    <button
                      onClick={() => remove(s.id)}
                      disabled={busy}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
                    >
                      {t('servers.remove')}
                    </button>
                  </div>
                </div>
                {renderStatus(s)}
              </div>
            )
          })}
        </div>
      )}

      {wizardOpen && (
        <CreateServerWizard
          onClose={() => setWizardOpen(false)}
          onCreated={(id) => {
            setWizardOpen(false)
            reload().then(() => install(id))
          }}
        />
      )}
    </div>
  )
}