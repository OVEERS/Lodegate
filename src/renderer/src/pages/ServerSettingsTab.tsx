import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

type FieldType = 'text' | 'number' | 'bool' | 'select'

interface Field {
  key: string
  type: FieldType
  def: string
  ru: string
  en: string
  options?: string[]
}

interface Group {
  id: string
  ru: string
  en: string
  noteRu?: string
  noteEn?: string
  fields: Field[]
}

const GROUPS: Group[] = [
  {
    id: 'basic',
    ru: 'Основные',
    en: 'Basic',
    fields: [
      { key: 'motd', type: 'text', def: 'A Minecraft Server', ru: 'Описание сервера (MOTD)', en: 'Server description (MOTD)' },
      { key: 'max-players', type: 'number', def: '20', ru: 'Максимум игроков', en: 'Max players' },
      { key: 'server-port', type: 'number', def: '25565', ru: 'Порт сервера', en: 'Server port' },
      { key: 'gamemode', type: 'select', def: 'survival', ru: 'Режим игры', en: 'Game mode', options: ['survival', 'creative', 'adventure', 'spectator'] },
      { key: 'difficulty', type: 'select', def: 'easy', ru: 'Сложность', en: 'Difficulty', options: ['peaceful', 'easy', 'normal', 'hard'] },
      { key: 'pvp', type: 'bool', def: 'true', ru: 'PvP', en: 'PvP' },
      { key: 'hardcore', type: 'bool', def: 'false', ru: 'Хардкор', en: 'Hardcore' }
    ]
  },
  {
    id: 'security',
    ru: 'Безопасность',
    en: 'Security',
    fields: [
      { key: 'online-mode', type: 'bool', def: 'true', ru: 'Онлайн-режим (лицензия)', en: 'Online mode (licensed accounts)' },
      { key: 'white-list', type: 'bool', def: 'false', ru: 'Белый список', en: 'Whitelist' },
      { key: 'enforce-whitelist', type: 'bool', def: 'false', ru: 'Принудительный белый список', en: 'Enforce whitelist' },
      { key: 'op-permission-level', type: 'number', def: '4', ru: 'Уровень прав оператора', en: 'Operator permission level' },
      { key: 'player-idle-timeout', type: 'number', def: '0', ru: 'Тайм-аут бездействия (мин.)', en: 'Idle timeout (min.)' },
      { key: 'enable-command-block', type: 'bool', def: 'false', ru: 'Командные блоки', en: 'Command blocks' },
      { key: 'spawn-protection', type: 'number', def: '16', ru: 'Защита спавна (радиус)', en: 'Spawn protection (radius)' }
    ]
  },
  {
    id: 'world',
    ru: 'Мир',
    en: 'World',
    noteRu: 'Имя мира и seed действуют только при создании нового мира.',
    noteEn: 'World name and seed only apply when a new world is created.',
    fields: [
      { key: 'level-name', type: 'text', def: 'world', ru: 'Имя мира', en: 'World name' },
      { key: 'level-seed', type: 'text', def: '', ru: 'Seed', en: 'Seed' },
      { key: 'view-distance', type: 'number', def: '10', ru: 'Дальность прорисовки', en: 'View distance' },
      { key: 'simulation-distance', type: 'number', def: '10', ru: 'Дальность симуляции', en: 'Simulation distance' },
      { key: 'allow-nether', type: 'bool', def: 'true', ru: 'Незер', en: 'Nether' },
      { key: 'generate-structures', type: 'bool', def: 'true', ru: 'Генерировать структуры', en: 'Generate structures' },
      { key: 'spawn-monsters', type: 'bool', def: 'true', ru: 'Появление монстров', en: 'Spawn monsters' }
    ]
  }
]

const KNOWN_KEYS = new Set(GROUPS.flatMap((g) => g.fields.map((f) => f.key)))

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

interface Props {
  server: ServerConfig
  status: ServerStatus
}

export default function ServerSettingsTab({ server, status }: Props) {
  const { t, lang } = useI18n()
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [values, setValues] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    window.api.props.read(server.id).then((res) => {
      setOriginal(res.values)
      setValues({})
      setLoaded(true)
    })
  }, [server.id])

  function get(key: string, def: string): string {
    return values[key] ?? original[key] ?? def
  }

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const changedKeys = Object.keys(values).filter((k) => values[k] !== original[k])

  async function save() {
    if (changedKeys.length === 0 || status !== 'stopped') return
    setSaving(true)
    setSaveError(false)
    const patch: Record<string, string> = {}
    for (const k of changedKeys) patch[k] = values[k]
    try {
      const saved = await window.api.props.write(server.id, patch)
      if (!saved) {
        setSaveError(true)
        return
      }
      setOriginal((prev) => ({ ...prev, ...patch }))
      setValues({})
      setSavedAt(Date.now())
      setTimeout(() => setSavedAt(0), 2500)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  function renderControl(
    key: string,
    type: FieldType,
    def: string,
    disabled: boolean,
    options?: string[]
  ) {
    const v = get(key, def)
    if (type === 'bool') {
      return (
        <Toggle
          checked={v === 'true'}
          onChange={(x) => set(key, x ? 'true' : 'false')}
          disabled={disabled}
        />
      )
    }
    if (type === 'select' && options) {
      const opts = options.includes(v) ? options : [v, ...options]
      return (
        <select
          value={v}
          onChange={(e) => set(key, e.target.value)}
          disabled={disabled}
          className="w-56 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm"
        >
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    }
    return (
      <input
        type={type === 'number' ? 'number' : 'text'}
        value={v}
        onChange={(e) => set(key, e.target.value)}
        disabled={disabled}
        className="w-56 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm outline-none focus:border-teal"
      />
    )
  }

  function renderRow(
    key: string,
    title: string,
    type: FieldType,
    def: string,
    disabled: boolean,
    options?: string[]
  ) {
    const changed = changedKeys.includes(key)
    return (
      <div
        key={key}
        className={
          'flex items-center justify-between gap-6 rounded-xl border bg-panel px-4 py-3 ' +
          (changed ? 'border-teal/60' : 'border-line')
        }
      >
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-0.5 font-mono text-[11px] text-muted">{key}</div>
        </div>
        {renderControl(key, type, def, disabled, options)}
      </div>
    )
  }

  if (!loaded) {
    return <div className="text-sm text-muted">{t('props.loading')}</div>
  }

  const advanced = Object.keys(original)
    .filter((k) => !KNOWN_KEYS.has(k))
    .sort()

  const offline = get('online-mode', 'true') === 'false'
  const readOnly = status !== 'stopped'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        {status !== 'stopped' && (
          <div className="mb-4 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs text-muted">
            {t('props.restartHint')}
          </div>
        )}
        {saveError && (
          <div className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
            {t('props.saveError')}
          </div>
        )}
        {offline && (
          <div className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
            {t('props.onlineWarn')}
          </div>
        )}

        {GROUPS.map((g) => (
          <div key={g.id} className="mb-6">
            <div className="mb-2 text-sm font-semibold text-teal">{lang === 'ru' ? g.ru : g.en}</div>
            {(g.noteRu || g.noteEn) && (
              <div className="mb-2 text-xs text-muted">{lang === 'ru' ? g.noteRu : g.noteEn}</div>
            )}
            <div className="flex flex-col gap-2">
              {g.fields.map((f) =>
                renderRow(f.key, lang === 'ru' ? f.ru : f.en, f.type, f.def, readOnly, f.options)
              )}
            </div>
          </div>
        ))}

        {advanced.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 text-sm font-semibold text-teal">{t('props.advanced')}</div>
            <div className="flex flex-col gap-2">
              {advanced.map((k) => {
                const isBool = original[k] === 'true' || original[k] === 'false'
                return renderRow(k, k, isBool ? 'bool' : 'text', original[k], readOnly)
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <div className="text-xs text-muted">
          {savedAt > 0
            ? t('props.saved')
            : changedKeys.length > 0
              ? `${t('props.changed')}: ${changedKeys.length}`
              : ''}
        </div>
        <button
          onClick={save}
          disabled={changedKeys.length === 0 || saving || readOnly}
          className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-bg disabled:opacity-40"
        >
          {t('props.save')}
        </button>
      </div>
    </div>
  )
}