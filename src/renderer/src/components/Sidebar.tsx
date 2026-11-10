import { useI18n } from '../i18n/I18nProvider'

export type Page = 'tunnels' | 'servers' | 'settings'

interface SidebarProps {
  current: Page
  onChange: (page: Page) => void
}

const items: { id: Page; labelKey: string; icon: string }[] = [
  { id: 'tunnels', labelKey: 'nav.tunnels', icon: '⇄' },
  { id: 'servers', labelKey: 'nav.servers', icon: '▦' },
  { id: 'settings', labelKey: 'nav.settings', icon: '⚙' }
]

export default function Sidebar({ current, onChange }: SidebarProps) {
  const { t } = useI18n()

  return (
    <aside className="flex h-full w-60 flex-col border-r border-line bg-panel">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/15 text-lg text-teal">
          ◈
        </div>
        <div>
          <div className="text-base font-semibold leading-tight">Lodegate</div>
          <div className="text-xs text-muted">v0.0.1</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
        {items.map((item) => {

          const active = item.id === current
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ' +
                (active
                  ? 'bg-teal/15 text-teal'
                  : 'text-muted hover:bg-panel-2 hover:text-text')
              }
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              {t(item.labelKey)}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-line px-5 py-4 text-xs text-muted">
        {t('app.disclaimer')}
      </div>
    </aside>
  )
}