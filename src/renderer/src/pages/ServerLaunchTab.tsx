import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

interface Props {
  server: ServerConfig
  status: ServerStatus
}

interface Draft {
  minRamMb: number
  maxRamMb: number
  launch: LaunchSettings
}


function Toggle({
  checked,
  onChange,
  disabled
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled: boolean
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={
        'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ' +
        (checked ? 'bg-teal' : 'bg-line')
      }
    >
      <span
        className={
          'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' +
          (checked ? 'left-[22px]' : 'left-0.5')
        }
      />
    </button>
  )
}

function Row({
  title,
  desc,
  children
}: {
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-xl border border-line bg-panel px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {desc && <div className="mt-0.5 text-xs text-muted">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-sm font-semibold text-teal">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function showValue(mb: number, unit: 'MB' | 'GB'): string {
  return String(unit === 'GB' ? Math.round((mb / 1024) * 100) / 100 : mb)
}

function MemoryField({
  valueMb,
  onChange,
  disabled
}: {
  valueMb: number
  onChange: (mb: number) => void
  disabled: boolean
}) {
  const initialUnit: 'MB' | 'GB' = valueMb % 1024 === 0 ? 'GB' : 'MB'
  const [unit, setUnit] = useState<'MB' | 'GB'>(initialUnit)
  const [text, setText] = useState(showValue(valueMb, initialUnit))

  function changeText(v: string) {
    setText(v)
    const n = parseFloat(v.replace(',', '.'))
    onChange(Number.isFinite(n) ? Math.round(n * (unit === 'GB' ? 1024 : 1)) : 0)
  }

  function changeUnit(u: 'MB' | 'GB') {
    setUnit(u)
    setText(showValue(valueMb, u))
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => changeText(e.target.value)}
        disabled={disabled}
        className="w-24 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-right text-sm outline-none focus:border-teal disabled:opacity-40"
      />
      <div className="flex overflow-hidden rounded-lg border border-line text-xs">
        {(['MB', 'GB'] as const).map((u) => (
          <button
            key={u}
            onClick={() => changeUnit(u)}
            disabled={disabled}
            className={
              'px-2.5 py-1.5 disabled:opacity-40 ' +
              (unit === u ? 'bg-teal text-bg' : 'bg-panel-2 text-muted')
            }
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ServerLaunchTab({ server, status }: Props) {
  const { t } = useI18n()
  const [original, setOriginal] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [javas, setJavas] = useState<number[]>([])
  const [totalRamMb, setTotalRamMb] = useState(0)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')

  // Берём свежие данные, а не те, что были при открытии списка серверов
  useEffect(() => {
    let alive = true
    Promise.all([window.api.servers.list(), window.api.launch.info()]).then(([list, info]) => {
      if (!alive) return
      const s = list.find((x) => x.id === server.id) ?? server
      const d: Draft = { minRamMb: s.minRamMb, maxRamMb: s.maxRamMb, launch: s.launch }
      setOriginal(d)
      setDraft(d)
      setJavas(info.javas)
      setTotalRamMb(info.totalRamMb)
    })
    return () => {
      alive = false
    }
  }, [server.id])

  // Предпросмотр строит main, той же функцией, что и запуск
  useEffect(() => {
    if (!draft) return
    const handle = setTimeout(() => {
      window.api.launch
        .preview(server.id, draft.minRamMb, draft.maxRamMb, draft.launch)
        .then(setPreview)
    }, 150)
    return () => clearTimeout(handle)
  }, [draft, server.id])

  if (!draft || !original) {
    return <div className="text-sm text-muted">{t('launch.loading')}</div>
  }

  const readOnly = status !== 'stopped'
  const dirty = JSON.stringify(draft) !== JSON.stringify(original)
  const ramInvalid = draft.minRamMb < 256 || draft.maxRamMb < draft.minRamMb
  const ramBig = totalRamMb > 0 && draft.maxRamMb > totalRamMb * 0.8

  function setLaunch(patch: Partial<LaunchSettings>) {
    setSaveState('idle')
    setDraft((d) => (d ? { ...d, launch: { ...d.launch, ...patch } } : d))
  }

  function setRam(patch: Partial<Pick<Draft, 'minRamMb' | 'maxRamMb'>>) {
    setSaveState('idle')
    setDraft((d) => (d ? { ...d, ...patch } : d))
  }

  async function save() {
    if (!draft || !dirty || ramInvalid || readOnly) return
    setSaving(true)
    const res = await window.api.launch.save(server.id, draft.minRamMb, draft.maxRamMb, draft.launch)
    setSaving(false)
    if (res.ok) {
      setOriginal(draft)
      setSaveState('saved')
    } else {
      setSaveState('error')
    }
  }

  const javaOptions = [...javas]
  if (draft.launch.javaMajor !== null && !javaOptions.includes(draft.launch.javaMajor)) {
    javaOptions.push(draft.launch.javaMajor)
  }

  const textarea =
    'mt-2 w-full resize-none rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-xs outline-none focus:border-teal disabled:opacity-40'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        {readOnly && (
          <div className="mb-4 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs text-muted">
            {t('launch.readOnlyHint')}
          </div>
        )}
        {ramInvalid && (
          <div className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
            {t('launch.ramInvalid')}
          </div>
        )}
        {!ramInvalid && ramBig && (
          <div className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
            {t('launch.ramBig')}
          </div>
        )}

        <Section title={t('launch.memory')}>
          <Row title={t('launch.minRam')} desc={t('launch.minRamDesc')}>
            <MemoryField
              valueMb={draft.minRamMb}
              onChange={(mb) => setRam({ minRamMb: mb })}
              disabled={readOnly}
            />
          </Row>
          <Row title={t('launch.maxRam')} desc={t('launch.maxRamDesc')}>
            <MemoryField
              valueMb={draft.maxRamMb}
              onChange={(mb) => setRam({ maxRamMb: mb })}
              disabled={readOnly}
            />
          </Row>
        </Section>

        <Section title={t('launch.javaSection')}>
          <Row title={t('launch.javaVersion')} desc={t('launch.javaDesc')}>
            <select
              value={draft.launch.javaMajor === null ? 'auto' : String(draft.launch.javaMajor)}
              onChange={(e) =>
                setLaunch({ javaMajor: e.target.value === 'auto' ? null : Number(e.target.value) })
              }
              disabled={readOnly}
              className="w-56 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              <option value="auto">
                {t('launch.javaAuto')}
                {server.javaMajor ? ` (Java ${server.javaMajor})` : ''}
              </option>
              {javaOptions.map((major) => (
                <option key={major} value={String(major)}>
                  Java {major}
                  {javas.includes(major) ? '' : ` (${t('launch.javaMissing')})`}
                </option>
              ))}
            </select>
          </Row>
        </Section>

        <Section title={t('launch.flags')}>
          <Row title={t('launch.aikar')} desc={t('launch.aikarDesc')}>
            <Toggle
              checked={draft.launch.aikar}
              onChange={(v) => setLaunch(v ? { aikar: true, zgc: false } : { aikar: false })}
              disabled={readOnly}
            />
          </Row>
          <Row title={t('launch.zgc')} desc={t('launch.zgcDesc')}>
            <Toggle
              checked={draft.launch.zgc}
              onChange={(v) => setLaunch(v ? { zgc: true, aikar: false } : { zgc: false })}
              disabled={readOnly}
            />
          </Row>
          <Row title={t('launch.jmx')} desc={t('launch.jmxDesc')}>
            <Toggle
              checked={draft.launch.jmx}
              onChange={(v) => setLaunch({ jmx: v })}
              disabled={readOnly}
            />
          </Row>
          <div className="rounded-xl border border-line bg-panel px-4 py-3">
            <div className="text-sm font-medium">{t('launch.jvmArgs')}</div>
            <div className="mt-0.5 text-xs text-muted">{t('launch.jvmArgsDesc')}</div>
            <textarea
              rows={3}
              value={draft.launch.jvmArgs}
              onChange={(e) => setLaunch({ jvmArgs: e.target.value })}
              disabled={readOnly}
              spellCheck={false}
              className={textarea}
            />
          </div>
        </Section>

        <Section title={t('launch.serverSection')}>
          <div className="rounded-xl border border-line bg-panel px-4 py-3">
            <div className="text-sm font-medium">{t('launch.serverArgs')}</div>
            <div className="mt-0.5 text-xs text-muted">{t('launch.serverArgsDesc')}</div>
            <textarea
              rows={2}
              value={draft.launch.serverArgs}
              onChange={(e) => setLaunch({ serverArgs: e.target.value })}
              disabled={readOnly}
              spellCheck={false}
              className={textarea}
            />
          </div>
        </Section>

        <Section title={t('launch.behavior')}>
          <Row title={t('launch.autoRestart')} desc={t('launch.autoRestartDesc')}>
            <Toggle
              checked={draft.launch.autoRestart}
              onChange={(v) => setLaunch({ autoRestart: v })}
              disabled={readOnly}
            />
          </Row>
        </Section>

        <Section title={t('launch.preview')}>
          <div className="select-text break-all rounded-xl border border-line bg-panel-2 p-3 font-mono text-xs leading-5">
            {preview}
          </div>
        </Section>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <div className="text-xs">
          {saveState === 'saved' && <span className="text-teal">{t('launch.saved')}</span>}
          {saveState === 'error' && <span className="text-amber">{t('launch.saveError')}</span>}
          {saveState === 'idle' && dirty && (
            <span className="text-muted">{t('launch.unsaved')}</span>
          )}
        </div>
        <button
          onClick={() => void save()}
          disabled={!dirty || ramInvalid || readOnly || saving}
          className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-bg disabled:opacity-40"
        >
          {t('launch.save')}
        </button>
      </div>
    </div>
  )
}