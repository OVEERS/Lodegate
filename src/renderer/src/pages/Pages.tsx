import { useI18n } from '../i18n/I18nProvider'

interface PlaceholderProps {
  titleKey: string
  descriptionKey: string
}

function Placeholder({ titleKey, descriptionKey }: PlaceholderProps) {
  const { t } = useI18n()
  return (
    <div className="flex h-full flex-col p-8">
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <p className="mt-2 text-sm text-muted">{t(descriptionKey)}</p>
      <div className="mt-8 flex flex-1 items-center justify-center rounded-xl border border-dashed border-line text-muted">
        {t('placeholder.soon')}
      </div>
    </div>
  )
}

export function TunnelsPage() {
  return <Placeholder titleKey="tunnels.title" descriptionKey="tunnels.description" />
}

export function ServersPage() {
  return <Placeholder titleKey="servers.title" descriptionKey="servers.description" />
}