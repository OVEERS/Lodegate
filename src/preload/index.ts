import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch: object) => ipcRenderer.invoke('settings:set', patch)
  },
  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    add: (data: object) => ipcRenderer.invoke('servers:add', data),
    remove: (id: string) => ipcRenderer.invoke('servers:remove', id),
    defaultDir: () => ipcRenderer.invoke('servers:defaultDir'),
    pickFolder: () => ipcRenderer.invoke('servers:pickFolder')
  },
  versions: {
    list: (core: string) => ipcRenderer.invoke('versions:list', core),
    jar: (core: string, version: string) => ipcRenderer.invoke('versions:jar', core, version),
    java: (version: string) => ipcRenderer.invoke('versions:java', version)
  },
  install: {
    start: (id: string) => ipcRenderer.invoke('install:start', id),
    onProgress: (callback: (p: unknown) => void) => {
      const listener = (_e: unknown, p: unknown): void => callback(p)
      ipcRenderer.on('install:progress', listener)
      return () => ipcRenderer.removeListener('install:progress', listener)
    }
  }
}

if (process.contextIsolated) {

  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI

  // @ts-ignore (define in dts)
  window.api = api
}