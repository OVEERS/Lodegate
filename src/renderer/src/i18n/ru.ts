export const ru = {
  app: {
    disclaimer: 'Неофициальный продукт. Не связан с Mojang и Microsoft.'
  },
  nav: {
    tunnels: 'Туннели',
    servers: 'Игровые серверы',
    settings: 'Настройки'
  },
  placeholder: {
    soon: 'Здесь скоро что-то появится'
  },
  tunnels: {
    title: 'Туннели',
    description: 'Создание и управление туннелями для подключения друзей.'
  },
  servers: {
    title: 'Игровые серверы',
    description: 'Создание, импорт и управление Minecraft-серверами.',
    create: 'Создать сервер',
    empty: 'Серверов пока нет',
    emptyHint: 'Нажмите «Создать сервер», чтобы начать.',
    remove: 'Удалить',
    install: 'Установить',
    installed: 'Установлен',
    notInstalled: 'Не установлен',
    preparing: 'Подготовка…',
    downloading: 'Скачивание ядра',
    installingJava: 'Установка Java (скачивание и распаковка, может занять минуту)…',
    installError: 'Ошибка установки'
  },
  wizard: {
    title: 'Новый сервер',
    name: 'Название',
    namePlaceholder: 'Мой сервер',
    core: 'Ядро',
    corePaper: 'Быстрое, поддерживает плагины. Рекомендуется.',
    coreVanilla: 'Оригинальный сервер Mojang, без плагинов.',
    version: 'Версия Minecraft',
    loadingVersions: 'Загрузка списка версий…',
    versionsError: 'Не удалось загрузить версии. Проверьте интернет.',
    retry: 'Повторить',
    folder: 'Папка сервера',
    choose: 'Выбрать…',
    ram: 'Память (RAM)',
    ramHint: 'Для 2–5 друзей обычно хватает 4 GB.',
    next: 'Далее',
    back: 'Назад',
    cancel: 'Отмена',
    create: 'Создать',
    summary: 'Состав сервера',
    jarFile: 'Файл ядра',
    java: 'Java',
    path: 'Путь',
    loadingInfo: 'Получаю данные…',
    infoError: 'Не удалось получить данные о ядре.',
    note: 'После создания ядро скачается автоматически.'
  },
  console: {
    open: 'Открыть',
    back: 'Назад',
    start: 'Запустить',
    stop: 'Остановить',
    status_stopped: 'Остановлен',
    status_installing: 'Установка',
    status_starting: 'Запускается',
    status_running: 'Работает',
    status_stopping: 'Останавливается',
    title: 'Консоль сервера',
    commandPlaceholder: 'Введите команду…',
    send: 'Отправить',
    eulaTitle: 'Соглашение Minecraft EULA',
    eulaText: 'Для запуска сервера нужно принять лицензионное соглашение Mojang.',
    eulaLink: 'Прочитать соглашение',
    eulaCheck: 'Я прочитал(а) и принимаю условия EULA',
    eulaAccept: 'Принять и продолжить',
    startError: 'Не удалось запустить'
  },
  tabs: {
    overview: 'Обзор',
    players: 'Игроки',
    plugins: 'Плагины',
    world: 'Мир',
    files: 'Файлы',
    launch: 'Параметры запуска',
    scheduler: 'Планировщик',
    settings: 'Настройки',
    soon: 'Эта вкладка появится на следующих шагах.'
  },
  overview: {
    ram: 'RAM',
    cpu: 'CPU',
    players: 'Игроки',
    java: 'Java',
    quick: 'Быстрые команды',
    save: 'Сохранить мир',
    day: 'День',
    night: 'Ночь',
    list: 'Список игроков',
    plugins: 'Плагины'
  },
  settings: {
    title: 'Настройки',
    description: 'Язык, уведомления и поведение приложения.',
    language: 'Язык интерфейса',
    languageDesc: 'Язык текстов и уведомлений приложения.',
    tray: 'Сворачивать в трей при закрытии',
    trayDesc: 'Серверы и туннели продолжат работать в фоне.',
    telemetry: 'Анонимная статистика',
    telemetryDesc: 'По умолчанию выключена. Включайте только если хотите помочь проекту.'
  }
}

export type Dictionary = typeof ru