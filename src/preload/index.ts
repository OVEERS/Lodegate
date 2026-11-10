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
    remove: (id: string) => ipcRenderer.invoke('servers:remove', id)
  },
  versions: {
    list: (core: string) => ipcRenderer.invoke('versions:list', core),
    jar: (core: string, version: string) => ipcRenderer.invoke('versions:jar', core, version),
    java: (version: string) => ipcRenderer.invoke('versions:java', version)
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