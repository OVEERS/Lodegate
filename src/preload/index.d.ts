import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface AppSettings {
    language: 'ru' | 'en'
    minimizeToTray: boolean
    telemetry: boolean
  }

  interface Window {
    electron: ElectronAPI
    api: {
      settings: {
        get: () => Promise<AppSettings>
        set: (patch: Partial<AppSettings>) => Promise<AppSettings>
      }
    }
  }
}