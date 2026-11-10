import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

type Core = 'paper' | 'vanilla'

interface Props {
  onClose: () => void
  onCreated: () => void
}

interface Info {
  fileName: string
  java: number
}

// Убираем символы, которые нельзя использовать в имени папки Windows
function safeName(name: string): string {
  return name.trim().replace(/[<>:"/\\|?*]/g, '_')
}

export default function CreateServerWizard({ onClose, onCreated }: Props) {
  const { t } = useI18n()

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [core, setCore] = useState<Core>('paper')
  const [versions, setVersions] = useState<string[]>([])
  const [version, setVersion] = useState('')
  const [loadingVersions, setLoadingVersions] = useState(true)
  const [versionsError, setVersionsError] = useState(false)
  const [parentDir, setParentDir] = useState('')
  const [ramGb, setRamGb] = useState(4)


  const [info, setInfo] = useState<Info | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [infoError, setInfoError] = useState(false)
  const [saving, setSaving] = useState(false)

  // Папка по умолчанию
  useEffect(() => {
    window.api.servers.defaultDir().then(setParentDir)
  }, [])

  // Список версий загружается заново при смене ядра
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoadingVersions(true)
    setVersionsError(false)
    window.api.versions
      .list(core)
      .then((list) => {
        if (cancelled) return
        setVersions(list)
        setVersion(list[0] ?? '')
        setLoadingVersions(false)
      })
      .catch(() => {
        if (cancelled) return
        setVersionsError(true)
        setLoadingVersions(false)
      })
    return () => {
      cancelled = true

    }
  }, [core, reloadKey])

  const finalDir = parentDir + '\\' + safeName(name)
  const canNext = name.trim().length > 0 && version !== '' && parentDir !== ''

  async function pickFolder() {
    const picked = await window.api.servers.pickFolder()
    if (picked) setParentDir(picked)
  }

  async function goNext() {
    setStep(2)
    setInfo(null)
    setInfoError(false)
    setLoadingInfo(true)
    try {
      const [jar, java] = await Promise.all([
        window.api.versions.jar(core, version),
        window.api.versions.java(version)
      ])
      setInfo({ fileName: jar.fileName, java })
    } catch {
      setInfoError(true)
    }
    setLoadingInfo(false)
  }

  async function create() {
    setSaving(true)
    await window.api.servers.add({
      name: name.trim(),

      core,
      mcVersion: version,
      dir: finalDir,
      minRamMb: Math.min(2048, ramGb * 1024),
      maxRamMb: ramGb * 1024
    })
    onCreated()
  }

  const coreCards: { id: Core; title: string; desc: string }[] = [
    { id: 'paper', title: 'Paper', desc: t('wizard.corePaper') },
    { id: 'vanilla', title: 'Vanilla', desc: t('wizard.coreVanilla') }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="flex max-h-full w-full max-w-xl flex-col rounded-2xl border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold">{t('wizard.title')}</h2>
          <span className="text-xs text-muted">{step} / 2</span>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="flex flex-col gap-5">
              {/* Название */}
              <div>
                <label className="text-sm font-medium">{t('wizard.name')}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('wizard.namePlaceholder')}

                  className="mt-2 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-teal"
                />
              </div>

              {/* Ядро */}
              <div>
                <label className="text-sm font-medium">{t('wizard.core')}</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {coreCards.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCore(c.id)}
                      className={
                        'rounded-lg border p-3 text-left transition-colors ' +
                        (core === c.id
                          ? 'border-teal bg-teal/10'
                          : 'border-line bg-panel-2 hover:border-muted')
                      }
                    >
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="mt-1 text-xs text-muted">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Версия */}
              <div>
                <label className="text-sm font-medium">{t('wizard.version')}</label>
                {loadingVersions && (
                  <div className="mt-2 text-sm text-muted">{t('wizard.loadingVersions')}</div>
                )}

                {versionsError && (
                  <div className="mt-2 flex items-center gap-3 text-sm text-amber">
                    {t('wizard.versionsError')}
                    <button
                      onClick={() => setReloadKey((k) => k + 1)}
                      className="rounded-lg border border-line px-3 py-1 text-xs text-text"
                    >
                      {t('wizard.retry')}
                    </button>
                  </div>
                )}
                {!loadingVersions && !versionsError && (
                  <select
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm"
                  >
                    {versions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Папка */}
              <div>
                <label className="text-sm font-medium">{t('wizard.folder')}</label>
                <div className="mt-2 flex gap-2">
                  <div className="min-w-0 flex-1 truncate rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-muted">
                    {name.trim() ? finalDir : parentDir}

                  </div>
                  <button
                    onClick={pickFolder}
                    className="rounded-lg border border-line px-3 py-2 text-sm hover:border-muted"
                  >
                    {t('wizard.choose')}
                  </button>
                </div>
              </div>

              {/* RAM */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('wizard.ram')}</label>
                  <span className="text-sm text-teal">{ramGb} GB</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={16}
                  step={1}
                  value={ramGb}
                  onChange={(e) => setRamGb(Number(e.target.value))}
                  className="mt-2 w-full accent-teal"
                />
                <div className="mt-1 text-xs text-muted">{t('wizard.ramHint')}</div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>

              <div className="text-sm font-medium">{t('wizard.summary')}</div>
              <div className="mt-3 divide-y divide-line rounded-lg border border-line bg-panel-2 text-sm">
                <SummaryRow label={t('wizard.name')} value={name.trim()} />
                <SummaryRow
                  label={t('wizard.core')}
                  value={(core === 'paper' ? 'Paper ' : 'Vanilla ') + version}
                />
                <SummaryRow label={t('wizard.ram')} value={`${ramGb} GB`} />
                <SummaryRow label={t('wizard.path')} value={finalDir} />
                {loadingInfo && <SummaryRow label="…" value={t('wizard.loadingInfo')} />}
                {infoError && <SummaryRow label="!" value={t('wizard.infoError')} />}
                {info && (
                  <>
                    <SummaryRow label={t('wizard.jarFile')} value={info.fileName} />
                    <SummaryRow label={t('wizard.java')} value={`Java ${info.java}`} />
                  </>
                )}
              </div>
              <div className="mt-4 text-xs text-muted">{t('wizard.note')}</div>
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-line px-6 py-4">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-text"
          >
            {step === 1 ? t('wizard.cancel') : t('wizard.back')}
          </button>

          {step === 1 ? (

            <button
              onClick={goNext}
              disabled={!canNext}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
            >
              {t('wizard.next')}
            </button>
          ) : (
            <button
              onClick={create}
              disabled={!info || saving}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
            >
              {t('wizard.create')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5">
      <span className="text-muted">{label}</span>
      <span className="break-all text-right">{value}</span>
    </div>
  )
}