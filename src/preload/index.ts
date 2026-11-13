import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

function subscribe<T>(channel: string, callback: (data: T) => void): () => void {
  const listener = (_e: unknown, data: T): void => callback(data)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

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
    onProgress: (cb: (p: never) => void) => subscribe('install:progress', cb)
  },
  runner: {
    start: (id: string) => ipcRenderer.invoke('server:start', id),
    stop: (id: string) => ipcRenderer.invoke('server:stop', id),
    command: (id: string, command: string) => ipcRenderer.invoke('server:command', id, command),
    state: (id: string) => ipcRenderer.invoke('server:state', id),
    eulaStatus: (id: string) => ipcRenderer.invoke('server:eulaStatus', id),
    acceptEula: (id: string) => ipcRenderer.invoke('server:acceptEula', id),
    onLog: (cb: (d: never) => void) => subscribe('server:log', cb),
    onStatus: (cb: (d: never) => void) => subscribe('server:status', cb),
    onPlayers: (cb: (d: never) => void) => subscribe('server:players', cb),
    onStats: (cb: (d: never) => void) => subscribe('server:stats', cb)
  },
  props: {
    exists: (id: string) => ipcRenderer.invoke('props:exists', id),
    read: (id: string) => ipcRenderer.invoke('props:read', id),
    write: (id: string, patch: object) => ipcRenderer.invoke('props:write', id, patch)
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