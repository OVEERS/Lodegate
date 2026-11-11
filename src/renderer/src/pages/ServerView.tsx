import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

interface Props {
  server: ServerConfig
  onBack: () => void
}

const statusColor: Record<ServerStatus, string> = {
  stopped: 'bg-muted',
  installing: 'bg-amber',
  starting: 'bg-amber',
  running: 'bg-teal',
  stopping: 'bg-amber'
}

export default function ServerView({ server, onBack }: Props) {
  const { t } = useI18n()
  const [status, setStatus] = useState<ServerStatus>('stopped')
  const [lines, setLines] = useState<string[]>([])
  const [command, setCommand] = useState('')
  const [error, setError] = useState('')
  const [eulaOpen, setEulaOpen] = useState(false)
  const [eulaChecked, setEulaChecked] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // Подгружаем текущее состояние и подписываемся на события
  useEffect(() => {
    window.api.runner.state(server.id).then((s) => {
      setStatus(s.status)
      setLines(s.log)
    })


    const offLog = window.api.runner.onLog((d) => {
      if (d.id !== server.id) return
      setLines((prev) => [...prev.slice(-999), d.line])
    })
    const offStatus = window.api.runner.onStatus((d) => {
      if (d.id === server.id) setStatus(d.status)
    })
    return () => {
      offLog()
      offStatus()
    }
  }, [server.id])

  // Прокрутка консоли вниз при новых строках
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  async function start() {
    setError('')
    const accepted = await window.api.runner.eulaStatus(server.id)
    if (!accepted) {
      setEulaChecked(false)
      setEulaOpen(true)
      return
    }
    const res = await window.api.runner.start(server.id)
    if (!res.ok) setError(res.error ?? 'error')
  }


  async function acceptEula() {
    await window.api.runner.acceptEula(server.id)
    setEulaOpen(false)
    const res = await window.api.runner.start(server.id)
    if (!res.ok) setError(res.error ?? 'error')
  }

  async function sendCommand() {
    const text = command.trim()
    if (!text) return
    setCommand('')
    await window.api.runner.command(server.id, text)
  }

  const canStart = status === 'stopped'
  const canStop = status === 'starting' || status === 'running'

  return (
    <div className="flex h-full flex-col p-8">
      <button onClick={onBack} className="mb-4 w-fit text-sm text-muted hover:text-text">
        ← {t('console.back')}
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{server.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span className={'inline-block h-2 w-2 rounded-full ' + statusColor[status]} />
            {t('console.status_' + status)} · {server.core} {server.mcVersion}
          </div>
        </div>
        <div className="flex gap-2">

          <button
            onClick={start}
            disabled={!canStart}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
          >
            {t('console.start')}
          </button>
          <button
            onClick={() => window.api.runner.stop(server.id)}
            disabled={!canStop}
            className="rounded-lg border border-line px-4 py-2 text-sm text-text disabled:opacity-40"
          >
            {t('console.stop')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
          {t('console.startError')}: {error}
        </div>
      )}

      <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-panel">
        <div className="border-b border-line px-4 py-2 text-xs text-muted">
          {t('console.title')}
        </div>
        <div
          ref={logRef}
          className="min-h-0 flex-1 select-text overflow-y-auto px-4 py-3 font-mono text-xs leading-5"
        >
          {lines.map((line, i) => (

            <div
              key={i}
              className={
                /WARN/.test(line)
                  ? 'text-amber'
                  : /ERROR|Exception/.test(line)
                    ? 'text-red-400'
                    : 'text-text'
              }
            >
              {line}
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-line p-3">
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
            disabled={status === 'stopped'}
            placeholder={t('console.commandPlaceholder')}
            className="flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-xs outline-none focus:border-teal disabled:opacity-40"
          />
          <button
            onClick={sendCommand}
            disabled={status === 'stopped'}
            className="rounded-lg border border-line px-4 py-2 text-xs disabled:opacity-40"
          >
            {t('console.send')}
          </button>
        </div>
      </div>


      {eulaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6">
            <h2 className="text-lg font-semibold">{t('console.eulaTitle')}</h2>
            <p className="mt-2 text-sm text-muted">{t('console.eulaText')}</p>
            <a
              href="https://aka.ms/MinecraftEULA"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-teal underline"
            >
              {t('console.eulaLink')}
            </a>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={eulaChecked}
                onChange={(e) => setEulaChecked(e.target.checked)}
                className="accent-teal"
              />
              {t('console.eulaCheck')}
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEulaOpen(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-muted"
              >
                {t('wizard.cancel')}
              </button>
              <button
                onClick={acceptEula}

                disabled={!eulaChecked}
                className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
              >
                {t('console.eulaAccept')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}