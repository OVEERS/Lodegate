import { ipcMain } from 'electron'

const USER_AGENT = 'Lodegate/0.0.1 (https://github.com/OVEERS/Lodegate)'

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`)
  return (await res.json()) as T
}

export interface McVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  url: string
}

interface MojangManifest {
  versions: McVersion[]
}

let manifestCache: { at: number; data: McVersion[] } | null = null

async function getMojangVersions(): Promise<McVersion[]> {
  if (manifestCache && Date.now() - manifestCache.at < 10 * 60 * 1000) {
    return manifestCache.data
  }
  const data = await getJson<MojangManifest>(
    'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
  )
  manifestCache = { at: Date.now(), data: data.versions }
  return data.versions

}

export async function getVersionsForCore(core: 'paper' | 'vanilla'): Promise<string[]> {
  const mojang = await getMojangVersions()
  const releases = mojang.filter((v) => v.type === 'release').map((v) => v.id)

  if (core === 'vanilla') return releases

  const paper = await getJson<{ versions: Record<string, string[]> }>(
    'https://fill.papermc.io/v3/projects/paper'
  )
  const supported = new Set(Object.values(paper.versions).flat())
  return releases.filter((v) => supported.has(v))
}

export interface JarInfo {
  url: string
  fileName: string
  build?: number
}

export async function getJarInfo(
  core: 'paper' | 'vanilla',
  mcVersion: string
): Promise<JarInfo> {
  if (core === 'paper') {
    const builds = await getJson<
      { id: number; channel: string; downloads: Record<string, { url: string; name: string }> }[]
    >(`https://fill.papermc.io/v3/projects/paper/versions/${mcVersion}/builds`)

    const stable = builds.filter((b) => b.channel === 'STABLE')
    const best = (stable.length ? stable : builds).sort((a, b) => b.id - a.id)[0]
    if (!best) throw new Error(`Для Paper ${mcVersion} нет сборок`)

    const file = best.downloads['server:default']
    if (!file) throw new Error('В сборке нет серверного jar')
    return { url: file.url, fileName: file.name, build: best.id }
  }

  const mojang = await getMojangVersions()
  const entry = mojang.find((v) => v.id === mcVersion)
  if (!entry) throw new Error(`Версия ${mcVersion} не найдена`)

  const detail = await getJson<{ downloads: { server?: { url: string } } }>(entry.url)
  if (!detail.downloads.server) throw new Error('У этой версии нет серверного jar')
  return { url: detail.downloads.server.url, fileName: `minecraft_server.${mcVersion}.jar` }
}

export async function getJavaMajor(mcVersion: string): Promise<number> {
  const mojang = await getMojangVersions()
  const entry = mojang.find((v) => v.id === mcVersion)
  if (!entry) return 21
  const detail = await getJson<{ javaVersion?: { majorVersion: number } }>(entry.url)
  return detail.javaVersion?.majorVersion ?? 8
}

export function registerVersionsIpc(): void {
  ipcMain.handle('versions:list', (_e, core: 'paper' | 'vanilla') => getVersionsForCore(core))

  ipcMain.handle('versions:jar', (_e, core: 'paper' | 'vanilla', v: string) =>
    getJarInfo(core, v)
  )
  ipcMain.handle('versions:java', (_e, v: string) => getJavaMajor(v))
}