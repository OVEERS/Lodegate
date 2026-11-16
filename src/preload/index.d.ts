import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  type ServerStatus = 'stopped' | 'installing' | 'starting' | 'running' | 'stopping'

  interface AppSettings {
    language: 'ru' | 'en'
    minimizeToTray: boolean
    telemetry: boolean
  }

  interface LaunchSettings {
    aikar: boolean
    zgc: boolean
    jmx: boolean
    javaMajor: number | null
    jvmArgs: string
    serverArgs: string
    autoRestart: boolean
  }

  interface ServerConfig {
    id: string
    name: string
    core: 'paper' | 'vanilla'
    mcVersion: string
    dir: string
    minRamMb: number
    maxRamMb: number
    createdAt: number
    installed: boolean
    javaMajor?: number

    javaPath?: string
    launch: LaunchSettings
  }

  interface InstallProgress {
    id: string
    stage: 'preparing' | 'downloading' | 'java' | 'done' | 'error'
    received: number
    total: number
    message?: string
  }

  interface ServerStats {
    ramMb: number
    cpu: number
  }

  interface FileEntry {
    name: string
    isDir: boolean
    size: number
  }

  interface FileOpResult {
    ok: boolean
    error?: string
  }

  interface Window {
    electron: ElectronAPI
    api: {
      settings: {

        get: () => Promise<AppSettings>
        set: (patch: Partial<AppSettings>) => Promise<AppSettings>
      }
      servers: {
        list: () => Promise<ServerConfig[]>
        add: (
          data: Omit<ServerConfig, 'id' | 'createdAt' | 'installed' | 'launch'>
        ) => Promise<ServerConfig>
        remove: (id: string) => Promise<ServerConfig[]>
        defaultDir: () => Promise<string>
        pickFolder: () => Promise<string | null>
      }
      versions: {
        list: (core: 'paper' | 'vanilla') => Promise<string[]>
        jar: (
          core: 'paper' | 'vanilla',
          version: string
        ) => Promise<{ url: string; fileName: string; build?: number }>
        java: (version: string) => Promise<number>
      }
      install: {
        start: (id: string) => Promise<{ ok: boolean; error?: string }>
        onProgress: (callback: (p: InstallProgress) => void) => () => void
      }
      runner: {
        start: (id: string) => Promise<{ ok: boolean; error?: string }>
        stop: (id: string) => Promise<void>
        command: (id: string, command: string) => Promise<void>
        state: (id: string) => Promise<{
          status: ServerStatus
          log: string[]
          players: string[]

          stats: ServerStats
          maxPlayers: number
        }>
        eulaStatus: (id: string) => Promise<boolean>
        acceptEula: (id: string) => Promise<boolean>
        onLog: (callback: (d: { id: string; line: string }) => void) => () => void
        onStatus: (callback: (d: { id: string; status: ServerStatus }) => void) => () => void
        onPlayers: (callback: (d: { id: string; players: string[] }) => void) => () => void
        onStats: (callback: (d: { id: string } & ServerStats) => void) => () => void
      }
      props: {
        exists: (id: string) => Promise<boolean>
        read: (id: string) => Promise<{ exists: boolean; values: Record<string, string> }>
        write: (id: string, patch: Record<string, string>) => Promise<boolean>
      }
      files: {
        list: (
          id: string,
          rel: string
        ) => Promise<{ ok: boolean; error?: string; entries: FileEntry[] }>
        read: (
          id: string,
          rel: string,
          mode?: 'normal' | 'force'
        ) => Promise<{
          ok: boolean
          error?: string
          kind?: 'text' | 'forced' | 'image'
          content?: string
          dataUrl?: string
          truncated?: boolean
        }>

        write: (id: string, rel: string, content: string) => Promise<FileOpResult>
        create: (id: string, rel: string, isDir: boolean) => Promise<FileOpResult>
        remove: (id: string, rel: string) => Promise<FileOpResult>
      }
      launch: {
        info: () => Promise<{ javas: number[]; totalRamMb: number }>
        preview: (
          id: string,
          minRamMb: number,
          maxRamMb: number,
          launch: LaunchSettings
        ) => Promise<string>
        save: (
          id: string,
          minRamMb: number,
          maxRamMb: number,
          launch: LaunchSettings
        ) => Promise<FileOpResult>
      }
    }
  }
}