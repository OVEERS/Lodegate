import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

export default function ServersPage() {
  const { t } = useI18n()
  const [servers, setServers] = useState<ServerConfig[]>([])

  async function reload() {
    setServers(await window.api.servers.list())
  }

  useEffect(() => {
    reload()
  }, [])

  // Временно: создаёт тестовую запись, настоящий мастер будет в шаге 2.3
  async function addTest() {
    await window.api.servers.add({
      name: 'Test server ' + (servers.length + 1),
      core: 'paper',
      mcVersion: '1.21.4',
      dir: 'D:\\servers\\test',
      minRamMb: 1024,
      maxRamMb: 4096
    })
    reload()
  }

  // Временно: проверка запросов к API версий
  async function testVersions() {
    try {
      const list = await window.api.versions.list('paper')
      console.log('Paper версии (первые 5):', list.slice(0, 5))
      const jar = await window.api.versions.jar('paper', list[0])
      console.log('Jar для', list[0], jar)
      const java = await window.api.versions.java(list[0])
      console.log('Нужна Java', java)
    } catch (e) {
      console.error('Ошибка:', e)
    }
  }

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
        <div className="flex">
          <button
            onClick={testVersions}
            className="mr-2 rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-text"
          >
            Test API
          </button>
          <button
            onClick={addTest}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
          >
            {t('servers.create')}
          </button>
        </div>
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
                  {s.core} · {s.mcVersion} · {s.maxRamMb} MB
                </div>
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
    </div>
  )
}