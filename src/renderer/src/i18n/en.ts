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
    remove: 'Remove'
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
    note: 'For now only a record is created. File download comes in step 2.4.'
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