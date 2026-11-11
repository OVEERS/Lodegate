import type { Dictionary } from './ru'

export const en: Dictionary = {
  app: {
    disclaimer: 'Unofficial product. Not affiliated with Mojang or Microsoft.'
  },
  nav: {
    tunnels: 'Tunnels',
    servers: 'Game servers',
    settings: 'Settings'
  },
  placeholder: {
    soon: 'Something will appear here soon'
  },
  tunnels: {
    title: 'Tunnels',
    description: 'Create and manage tunnels to connect your friends.'
  },
  servers: {
    title: 'Game servers',
    description: 'Create, import and manage Minecraft servers.',
    create: 'Create server',
    empty: 'No servers yet',
    emptyHint: 'Click "Create server" to get started.',
    remove: 'Remove',
    install: 'Install',
    installed: 'Installed',
    notInstalled: 'Not installed',
    preparing: 'Preparing…',
    downloading: 'Downloading core',
    installingJava: 'Installing Java (download and unpack, may take a minute)…',
    installError: 'Install error'
  },
  wizard: {
    title: 'New server',
    name: 'Name',
    namePlaceholder: 'My server',
    core: 'Core',
    corePaper: 'Fast, supports plugins. Recommended.',
    coreVanilla: 'Original Mojang server, no plugins.',
    version: 'Minecraft version',
    loadingVersions: 'Loading version list…',
    versionsError: 'Could not load versions. Check your internet connection.',
    retry: 'Retry',
    folder: 'Server folder',
    choose: 'Choose…',
    ram: 'Memory (RAM)',
    ramHint: 'For 2–5 friends 4 GB is usually enough.',
    next: 'Next',
    back: 'Back',
    cancel: 'Cancel',
    create: 'Create',
    summary: 'Server contents',
    jarFile: 'Core file',
    java: 'Java',
    path: 'Path',
    loadingInfo: 'Getting data…',
    infoError: 'Could not get core information.',
    note: 'The core will be downloaded automatically after creation.'
  },
  console: {
    open: 'Open',
    back: 'Back',
    start: 'Start',
    stop: 'Stop',
    status_stopped: 'Stopped',
    status_installing: 'Installing',
    status_starting: 'Starting',
    status_running: 'Running',
    status_stopping: 'Stopping',
    title: 'Server console',
    commandPlaceholder: 'Enter a command…',
    send: 'Send',
    eulaTitle: 'Minecraft EULA',
    eulaText: 'To start the server you need to accept the Mojang license agreement.',
    eulaLink: 'Read the agreement',
    eulaCheck: 'I have read and accept the EULA',
    eulaAccept: 'Accept and continue',
    startError: 'Could not start'
  },
  tabs: {
    overview: 'Overview',
    players: 'Players',
    plugins: 'Plugins',
    world: 'World',
    files: 'Files',
    launch: 'Launch options',
    scheduler: 'Scheduler',
    settings: 'Settings',
    soon: 'This tab will appear in the next steps.'
  },
  overview: {
    ram: 'RAM',
    cpu: 'CPU',
    players: 'Players',
    java: 'Java',
    quick: 'Quick commands',
    save: 'Save world',
    day: 'Day',
    night: 'Night',
    list: 'Player list',
    plugins: 'Plugins'
  },
  settings: {
    title: 'Settings',
    description: 'Language, notifications and app behavior.',
    language: 'Interface language',
    languageDesc: 'Language of app texts and notifications.',
    tray: 'Minimize to tray on close',
    trayDesc: 'Servers and tunnels keep running in the background.',
    telemetry: 'Anonymous statistics',
    telemetryDesc: 'Off by default. Enable only if you want to help the project.'
  }
}