interface PlaceholderProps {
  title: string
  description: string
}

function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="flex h-full flex-col p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-8 flex flex-1 items-center justify-center rounded-xl border border-dashed border-line text-muted">
        Здесь скоро что-то появится
      </div>
    </div>
  )
}

export function TunnelsPage() {
  return (
    <Placeholder
      title="Туннели"
      description="Создание и управление туннелями для подключения друзей."
    />
  )
}

export function ServersPage() {
  return (
    <Placeholder
      title="Игровые серверы"
      description="Создание, импорт и управление Minecraft-серверами."
    />

  )
}

export function SettingsPage() {
  return (
    <Placeholder
      title="Настройки"
      description="Язык, уведомления и поведение приложения."
    />
  )
}