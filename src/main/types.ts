export type ServerCore = 'paper' | 'vanilla'

export type ServerStatus = 'stopped' | 'installing' | 'starting' | 'running' | 'stopping'

export interface ServerConfig {
  id: string
  name: string
  core: ServerCore
  mcVersion: string
  dir: string
  minRamMb: number
  maxRamMb: number
  createdAt: number
  installed: boolean
}

export interface InstallProgress {
  id: string
  stage: 'preparing' | 'downloading' | 'done' | 'error'
  received: number
  total: number
  message?: string
}