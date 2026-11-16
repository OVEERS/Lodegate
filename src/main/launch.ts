import { existsSync } from 'fs'
import { getInstalledJava } from './java'
import type { LaunchSettings } from './types'

export const DEFAULT_LAUNCH: LaunchSettings = {
  aikar: false,
  zgc: false,
  jmx: false,
  javaMajor: null,
  jvmArgs: '-Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8',
  serverArgs: 'nogui',
  autoRestart: false
}

const AIKAR_FLAGS = [
  '-XX:+UseG1GC',
  '-XX:+ParallelRefProcEnabled',
  '-XX:MaxGCPauseMillis=200',
  '-XX:+UnlockExperimentalVMOptions',
  '-XX:+DisableExplicitGC',
  '-XX:+AlwaysPreTouch',
  '-XX:G1NewSizePercent=30',
  '-XX:G1MaxNewSizePercent=40',
  '-XX:G1HeapRegionSize=8M',
  '-XX:G1ReservePercent=20',
  '-XX:G1HeapWastePercent=5',
  '-XX:G1MixedGCCountTarget=4',
  '-XX:InitiatingHeapOccupancyPercent=15',
  '-XX:G1MixedGCLiveThresholdPercent=90',
  '-XX:G1RaSetUpdatingPauseTimePercent=5',
  '-XX:SurvivorRatio=32',
  '-XX:+PerfDisableSharedMem',

  '-XX:MaxTenuringThreshold=1',
  '-Dusing.aikars.flags=https://mcflags.emc.gs',
  '-Daikars.new.flags=true'
]

// JMX только локально, без пароля, порт 9010
const JMX_FLAGS = [
  '-Dcom.sun.management.jmxremote',
  '-Dcom.sun.management.jmxremote.port=9010',
  '-Dcom.sun.management.jmxremote.authenticate=false',
  '-Dcom.sun.management.jmxremote.ssl=false',
  '-Dcom.sun.management.jmxremote.local.only=true'
]

// Приводит любые данные к корректным настройкам запуска
export function sanitizeLaunch(raw: Partial<LaunchSettings> | undefined | null): LaunchSettings {
  const r = raw ?? {}
  const aikar = !!r.aikar
  const clean = (v: unknown, fallback: string): string =>
    typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim() : fallback
  return {
    aikar,
    zgc: !!r.zgc && !aikar, // Aikar (G1) и ZGC взаимоисключающие
    jmx: !!r.jmx,
    javaMajor:
      typeof r.javaMajor === 'number' && Number.isInteger(r.javaMajor) && r.javaMajor > 0
        ? r.javaMajor
        : null,
    jvmArgs: clean(r.jvmArgs, DEFAULT_LAUNCH.jvmArgs),
    serverArgs: clean(r.serverArgs, DEFAULT_LAUNCH.serverArgs),
    autoRestart: !!r.autoRestart
  }

}

// Делит строку аргументов на части, учитывая кавычки
export function splitArgs(s: string): string[] {
  const out: string[] = []
  let cur = ''
  let quote: string | null = null
  let has = false
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      has = true
    } else if (/\s/.test(ch)) {
      if (cur || has) {
        out.push(cur)
        cur = ''
        has = false
      }
    } else {
      cur += ch
    }
  }
  if (cur || has) out.push(cur)
  return out
}

export function buildLaunchArgs(
  minRamMb: number,
  maxRamMb: number,

  launch: LaunchSettings
): string[] {
  const args = [`-Xms${minRamMb}M`, `-Xmx${maxRamMb}M`]
  if (launch.aikar) args.push(...AIKAR_FLAGS)
  else if (launch.zgc) args.push('-XX:+UseZGC')
  if (launch.jmx) args.push(...JMX_FLAGS)
  args.push(...splitArgs(launch.jvmArgs))
  args.push('-jar', 'server.jar')

  const serverArgs = splitArgs(launch.serverArgs)
  // Без nogui откроется окно сервера, а консоль перестанет работать
  if (!serverArgs.some((a) => a === 'nogui' || a === '--nogui')) serverArgs.push('nogui')
  args.push(...serverArgs)
  return args
}

export function resolveJava(serverJavaPath: string | undefined, launch: LaunchSettings): string | null {
  if (launch.javaMajor !== null) return getInstalledJava(launch.javaMajor)
  return serverJavaPath && existsSync(serverJavaPath) ? serverJavaPath : null
}

export function formatCommand(javaPath: string, args: string[]): string {
  const quote = (s: string): string => (/[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s)
  return [javaPath, ...args].map(quote).join(' ')
}