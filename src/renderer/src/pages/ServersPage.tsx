import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import CreateServerWizard from '../components/CreateServerWizard'

export default function ServersPage() {
  const { t } = useI18n()
  const [servers, setServers] = useState<ServerConfig[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)

  async function reload() {
    setServers(await window.api.servers.list())
  }

  useEffect(() => {
    reload()
  }, [])

  async function remove(id: string) {
    setServers(await window.api.servers.remove(id))
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
          {servers.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-line bg-panel p-4"
            >
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className="mt-1 text-xs text-muted">
                  {s.core} · {s.mcVersion} · {s.maxRamMb / 1024} GB
                </div>
                <div className="mt-0.5 text-xs text-muted">{s.dir}</div>
              </div>
              <button
                onClick={() => remove(s.id)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-text"
              >
                {t('servers.remove')}
              </button>
            </div>
          ))}
        </div>

      )}

      {wizardOpen && (
        <CreateServerWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setWizardOpen(false)
            reload()
          }}
        />
      )}
    </div>
  )
}