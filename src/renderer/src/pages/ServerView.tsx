import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import ServerSettingsTab from './ServerSettingsTab'

interface Props {
  server: ServerConfig
  onBack: () => void
}

type Tab = 'overview' | 'players' | 'plugins' | 'world' | 'files' | 'launch' | 'scheduler' | 'settings'

const TABS: Tab[] = [
  'overview',
  'players',
  'plugins',
  'world',
  'files',
  'launch',
  'scheduler',
  'settings'
]

const statusColor: Record<ServerStatus, string> = {
  stopped: 'bg-muted',
  installing: 'bg-amber',
  starting: 'bg-amber',
  running: 'bg-teal',
  stopping: 'bg-amber'
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  )
}

export default function ServerView({ server, onBack }: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('overview')
  const [status, setStatus] = useState<ServerStatus>('stopped')
  const [lines, setLines] = useState<string[]>([])
  const [players, setPlayers] = useState<string[]>([])
  const [stats, setStats] = useState<ServerStats>({ ramMb: 0, cpu: 0 })
  const [maxPlayers, setMaxPlayers] = useState(20)
  const [command, setCommand] = useState('')
  const [error, setError] = useState('')
  const [eulaOpen, setEulaOpen] = useState(false)
  const [eulaChecked, setEulaChecked] = useState(false)
  const [propsExists, setPropsExists] = useState(false)
  const [blockedOpen, setBlockedOpen] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.runner.state(server.id).then((s) => {
      setStatus(s.status)
      setLines(s.log)
      setPlayers(s.players)
      setStats(s.stats)
      setMaxPlayers(s.maxPlayers)
    })

    const offLog = window.api.runner.onLog((d) => {
      if (d.id !== server.id) return
      setLines((prev) => [...prev.slice(-999), d.line])
    })
    const offStatus = window.api.runner.onStatus((d) => {
      if (d.id !== server.id) return
      setStatus(d.status)
      if (d.status === 'running') {
        window.api.runner.state(server.id).then((s) => setMaxPlayers(s.maxPlayers))
      }
    })
    const offPlayers = window.api.runner.onPlayers((d) => {
      if (d.id === server.id) setPlayers(d.players)
    })
    const offStats = window.api.runner.onStats((d) => {
      if (d.id === server.id) setStats({ ramMb: d.ramMb, cpu: d.cpu })
    })
    return () => {
      offLog()
      offStatus()
      offPlayers()
      offStats()
    }
  }, [server.id])

  // Проверяем, создан ли server.properties (от этого зависит замок на вкладке)
  useEffect(() => {
    let active = true
    window.api.props.exists(server.id).then((exists) => {
      if (active) setPropsExists(exists)
    })
    return () => {
      active = false
    }
  }, [server.id, status])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, tab])

  async function selectTab(id: Tab) {
    if (id === 'settings') {
      const [exists, state] = await Promise.all([
        window.api.props.exists(server.id),
        window.api.runner.state(server.id)
      ])
      setPropsExists(exists)
      setStatus(state.status)
      if (!server.installed || state.status !== 'stopped' || !exists) {
        setBlockedOpen(true)
        return
      }
    }
    setTab(id)
  }

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

  async function sendCommand(text?: string) {
    const value = (text ?? command).trim()
    if (!value) return
    if (text === undefined) setCommand('')
    await window.api.runner.command(server.id, value)
  }

  const canStart = status === 'stopped'
  const canStop = status === 'starting' || status === 'running'
  const live = status !== 'stopped'

  const quick: { label: string; cmd: string }[] = [
    { label: t('overview.save'), cmd: 'save-all' },
    { label: t('overview.day'), cmd: 'time set day' },
    { label: t('overview.night'), cmd: 'time set night' },
    { label: t('overview.list'), cmd: 'list' }
  ]
  if (server.core === 'paper') quick.push({ label: t('overview.plugins'), cmd: 'plugins' })

  const ramText = live
    ? `${(stats.ramMb / 1024).toFixed(1)} GB / ${server.maxRamMb / 1024} GB`
    : `0 GB / ${server.maxRamMb / 1024} GB`

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

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((id) => (
          <button
            key={id}
            onClick={() => selectTab(id)}
            className={
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ' +
              (tab === id
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-text')
            }
          >
            {id === 'settings' &&
            (!server.installed || status !== 'stopped' || !propsExists)
              ? '🔒 '
              : ''}
            {t('tabs.' + id)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
          {t('console.startError')}: {error}
        </div>
      )}

      {tab !== 'overview' && tab !== 'settings' && (
        <div className="mt-6 flex flex-1 items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
          {t('tabs.soon')}
        </div>
      )}

      {tab === 'settings' && (
        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          <ServerSettingsTab server={server} status={status} />
        </div>
      )}

      {tab === 'overview' && (
        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label={t('overview.ram')} value={ramText} />
            <StatCard label={t('overview.cpu')} value={`${live ? stats.cpu.toFixed(1) : '0.0'}%`} />
            <StatCard label={t('overview.players')} value={`${players.length} / ${maxPlayers}`} />
            <StatCard
              label={t('overview.java')}
              value={server.javaMajor ? `Java ${server.javaMajor}` : '—'}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-panel">
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
                disabled={!live}
                placeholder={t('console.commandPlaceholder')}
                className="flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-xs outline-none focus:border-teal disabled:opacity-40"
              />
              <button
                onClick={() => sendCommand()}
                disabled={!live}
                className="rounded-lg border border-line px-4 py-2 text-xs disabled:opacity-40"
              >
                {t('console.send')}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-3">
              <span className="text-xs text-muted">{t('overview.quick')}:</span>
              {quick.map((q) => (
                <button
                  key={q.cmd}
                  onClick={() => sendCommand(q.cmd)}
                  disabled={status !== 'running'}
                  className="rounded-full border border-line bg-panel-2 px-3 py-1 text-xs hover:border-teal disabled:opacity-40"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {blockedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6">
            <h2 className="text-lg font-semibold">{t('props.blockedTitle')}</h2>
            <p className="mt-2 text-sm text-muted">{t('props.blockedText')}</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setBlockedOpen(false)}
                className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-bg"
              >
                {t('props.ok')}
              </button>
            </div>
          </div>
        </div>
      )}

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