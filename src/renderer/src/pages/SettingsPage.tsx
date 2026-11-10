import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={
        'relative h-6 w-11 rounded-full transition-colors ' + (checked ? 'bg-teal' : 'bg-line')
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
  description,
  children
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-xl border border-line bg-panel p-4">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-1 text-xs text-muted">{description}</div>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    window.api.settings.get().then(setSettings)
  }, [])

  async function update(patch: Partial<AppSettings>) {
    const next = await window.api.settings.set(patch)
    setSettings(next)
  }

  if (!settings) return null

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
      <p className="mt-2 text-sm text-muted">{t('settings.description')}</p>

      <div className="mt-8 flex max-w-2xl flex-col gap-3">
        <Row title={t('settings.language')} description={t('settings.languageDesc')}>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as 'ru' | 'en')}
            className="rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm"
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </Row>

        <Row title={t('settings.tray')} description={t('settings.trayDesc')}>
          <Toggle checked={settings.minimizeToTray} onChange={(v) => update({ minimizeToTray: v })} />
        </Row>

        <Row title={t('settings.telemetry')} description={t('settings.telemetryDesc')}>
          <Toggle checked={settings.telemetry} onChange={(v) => update({ telemetry: v })} />
        </Row>
      </div>
    </div>
  )
}