import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import '../monacoSetup'
import { useI18n } from '../i18n/I18nProvider'

interface Props {
  server: ServerConfig
  status: ServerStatus
}

interface Selected {
  path: string
  isDir: boolean
}

interface OpenFile {
  path: string
  error?: string
  kind?: 'text' | 'forced' | 'image'
  dataUrl?: string
  truncated?: boolean
}

function joinRel(parent: string, name: string): string {
  return parent ? parent + '/' + name : name
}

function dirOf(path: string): string {
  const i = path.lastIndexOf('/')
  return i < 0 ? '' : path.slice(0, i)
}

function languageFor(path: string): string {
  const name = path.toLowerCase()
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  switch (ext) {
    case 'yml':
    case 'yaml':
      return 'yaml'
    case 'json':
    case 'mcmeta':
      return 'json'
    case 'properties':
    case 'ini':
    case 'cfg':
    case 'conf':
    case 'toml':
      return 'ini'
    case 'md':
      return 'markdown'
    case 'xml':
      return 'xml'
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'js':
    case 'mjs':
      return 'javascript'
    case 'ts':
      return 'typescript'
    case 'py':
      return 'python'
    case 'sh':
      return 'shell'
    case 'bat':
    case 'cmd':
      return 'bat'
    default:
      return 'plaintext'
  }
}

function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function ServerFilesTab({ server, status }: Props) {
  const { t } = useI18n()
  const [listing, setListing] = useState<Record<string, FileEntry[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Selected | null>(null)
  const [rootError, setRootError] = useState(false)

  const [openFile, setOpenFile] = useState<OpenFile | null>(null)
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState('')

  const [createKind, setCreateKind] = useState<'file' | 'dir' | null>(null)
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Selected | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  const saveRef = useRef<() => Promise<boolean>>(async () => false)

  const active = status !== 'stopped'
  const readOnly = openFile?.kind === 'forced' || openFile?.kind === 'image'
  const dirty = !!openFile && !openFile.error && !readOnly && content !== savedContent
  const createParent = selected ? (selected.isDir ? selected.path : dirOf(selected.path)) : ''

  function errText(code?: string): string {
    if (code === 'invalidName') return t('files.invalidName')
    if (code === 'exists') return t('files.exists')
    if (code === 'active') return t('files.activeError')
    return code ?? t('files.saveError')
  }

  async function loadDir(rel: string) {
    const res = await window.api.files.list(server.id, rel)
    if (res.ok) {
      setListing((prev) => ({ ...prev, [rel]: res.entries }))
      if (rel === '') setRootError(false)
    } else if (rel === '') {
      setRootError(true)
    }
  }

  useEffect(() => {
    setListing({})
    setExpanded({})
    setSelected(null)
    setOpenFile(null)
    loadDir('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server.id])

  async function refreshAll() {
    const dirs = ['', ...Object.keys(expanded).filter((k) => expanded[k])]
    await Promise.all(dirs.map((d) => loadDir(d)))
  }

  async function toggleDir(path: string) {
    const open = !!expanded[path]
    setExpanded((prev) => ({ ...prev, [path]: !open }))
    if (!open) await loadDir(path)
  }

  async function doOpen(path: string, mode: 'normal' | 'force' = 'normal') {
    setPendingPath(null)
    setSaveState('idle')
    const res = await window.api.files.read(server.id, path, mode)
    if (res.ok) {
      setOpenFile({
        path,
        kind: res.kind,
        dataUrl: res.dataUrl,
        truncated: res.truncated
      })
      setContent(res.content ?? '')
      setSavedContent(res.content ?? '')
    } else {
      setOpenFile({ path, error: res.error ?? 'error' })
      setContent('')
      setSavedContent('')
    }
  }

  function requestOpen(path: string) {
    if (openFile && openFile.path === path) return
    if (dirty) setPendingPath(path)
    else void doOpen(path)
  }

  async function save(): Promise<boolean> {
    if (!openFile || openFile.error || readOnly) return false
    const toSave = content
    const res = await window.api.files.write(server.id, openFile.path, toSave)
    if (res.ok) {
      setSavedContent(toSave)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
      return true
    }
    setSaveErr(errText(res.error))
    setSaveState('error')
    return false
  }

  // Ctrl+S в редакторе всегда вызывает свежую версию save
  useEffect(() => {
    saveRef.current = save
  })

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void saveRef.current()
    })
  }

  async function submitCreate() {
    const name = createName.trim()
    if (!name || /[\\\/:*?"<>|]/.test(name)) {
      setCreateError(t('files.invalidName'))
      return
    }
    const path = joinRel(createParent, name)
    const kind = createKind
    const res = await window.api.files.create(server.id, path, kind === 'dir')
    if (!res.ok) {
      setCreateError(errText(res.error))
      return
    }
    setCreateKind(null)
    if (createParent) setExpanded((prev) => ({ ...prev, [createParent]: true }))
    await loadDir(createParent)
    setSelected({ path, isDir: kind === 'dir' })
    if (kind === 'file') requestOpen(path)
  }

  async function submitDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    const res = await window.api.files.remove(server.id, target.path)
    if (!res.ok) {
      setDeleteError(errText(res.error))
      return
    }
    setDeleteTarget(null)
    setDeleteError('')
    if (
      openFile &&
      (openFile.path === target.path || openFile.path.startsWith(target.path + '/'))
    ) {
      setOpenFile(null)
    }
    setSelected(null)
    await loadDir(dirOf(target.path))
  }

  function renderDir(rel: string, depth: number): React.ReactNode {
    const entries = listing[rel]
    if (!entries) {
      return depth === 0 ? (
        <div className="px-3 py-2 text-xs text-muted">{t('files.loading')}</div>
      ) : null
    }
    if (entries.length === 0 && depth > 0) {
      return (
        <div className="py-1 text-xs text-muted" style={{ paddingLeft: 8 + depth * 14 }}>
          {t('files.empty')}
        </div>
      )
    }
    return entries.map((e) => {
      const path = joinRel(rel, e.name)
      const isOpen = !!expanded[path]
      const isSel = selected?.path === path
      return (
        <div key={path}>
          <div
            onClick={() => {
              setSelected({ path, isDir: e.isDir })
              if (e.isDir) void toggleDir(path)
              else requestOpen(path)
            }}
            style={{ paddingLeft: 8 + depth * 14 }}
            className={
              'flex cursor-pointer items-center gap-1.5 py-1 pr-2 text-xs ' +
              (isSel ? 'bg-teal/15 text-teal' : 'hover:bg-panel-2')
            }
          >
            <span className="w-3 shrink-0 text-muted">
              {e.isDir ? (isOpen ? '▾' : '▸') : '•'}
            </span>
            <span className="truncate">{e.name}</span>
          </div>
          {e.isDir && isOpen && renderDir(path, depth + 1)}
        </div>
      )
    })
  }

  const readErrorText =
    openFile?.error === 'binary'
      ? t('files.binary')
      : openFile?.error === 'tooLarge'
        ? t('files.tooLarge')
        : t('files.readError')

  const btn =
    'rounded-md border border-line px-2 py-1 text-[11px] hover:border-teal disabled:opacity-40'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {active && (
        <div className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
          {t('files.activeHint')}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-panel">
        {/* Левая часть: дерево */}
        <div className="flex w-64 shrink-0 flex-col border-r border-line">
          <div className="flex flex-wrap gap-1 border-b border-line p-2">
            <button onClick={refreshAll} className={btn}>
              ↻ {t('files.refresh')}
            </button>
            <button
              onClick={() => {
                setCreateName('')
                setCreateError('')
                setCreateKind('file')
              }}
              className={btn}
            >
              {t('files.newFile')}
            </button>
            <button
              onClick={() => {
                setCreateName('')
                setCreateError('')
                setCreateKind('dir')
              }}
              className={btn}
            >
              {t('files.newFolder')}
            </button>
            <button
              onClick={() => {
                setDeleteError('')
                setDeleteTarget(selected)
              }}
              disabled={!selected || active}
              className={btn}
            >
              {t('files.remove')}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {rootError ? (
              <div className="px-3 py-2 text-xs text-amber">{t('files.rootError')}</div>
            ) : (
              renderDir('', 0)
            )}
          </div>
        </div>

        {/* Правая часть: редактор */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!openFile && (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              {t('files.pick')}
            </div>
          )}

          {openFile && (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
                <div className="min-w-0 truncate font-mono text-xs">
                  {openFile.path}
                  {dirty && <span className="ml-2 text-amber">●</span>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {saveState === 'saved' && (
                    <span className="text-xs text-teal">{t('files.saved')}</span>
                  )}
                  {saveState === 'error' && (
                    <span className="text-xs text-amber">{saveErr}</span>
                  )}
                  <button
                    onClick={() => void save()}
                    disabled={!dirty}
                    className="rounded-md bg-teal px-3 py-1 text-xs font-medium text-bg disabled:opacity-40"
                  >
                    {t('files.save')}
                  </button>
                </div>
              </div>

              {openFile.error ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted">
                  {readErrorText}
                  {(openFile.error === 'binary' || openFile.error === 'readError') && (
                    <button
                      onClick={() => void doOpen(openFile.path, 'force')}
                      className="rounded-lg border border-line px-4 py-2 text-xs text-text hover:border-teal"
                    >
                      {t('files.forceOpen')}
                    </button>
                  )}
                </div>
              ) : openFile.kind === 'image' ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-auto p-4">
                  <img
                    src={openFile.dataUrl}
                    alt={openFile.path}
                    className="max-h-full max-w-full rounded border border-line object-contain"
                  />
                  <div className="text-xs text-muted">{t('files.imageHint')}</div>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  {readOnly && (
                    <div className="border-b border-line bg-amber/10 px-3 py-1.5 text-xs text-amber">
                      {t('files.forcedHint')}
                      {openFile.truncated ? ' ' + t('files.truncated') : ''}
                    </div>
                  )}
                  <div className="min-h-0 flex-1">
                    <Editor
                      key={openFile.path}
                      height="100%"
                      theme="lodegate"
                      language={languageFor(openFile.path)}
                      value={content}
                      onChange={(v) => setContent(v ?? '')}
                      onMount={handleMount}
                      loading={t('files.loading')}
                      options={{
                        readOnly,
                        minimap: { enabled: false },
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {createKind && (
        <Modal title={createKind === 'file' ? t('files.newFileTitle') : t('files.newFolderTitle')}>
          <div className="mt-1 text-xs text-muted">/{createParent}</div>
          <label className="mt-4 block text-sm font-medium">{t('files.name')}</label>
          <input
            autoFocus
            value={createName}
            onChange={(e) => {
              setCreateName(e.target.value)
              setCreateError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && void submitCreate()}
            className="mt-2 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-teal"
          />
          {createError && <div className="mt-2 text-xs text-amber">{createError}</div>}
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setCreateKind(null)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-muted"
            >
              {t('wizard.cancel')}
            </button>
            <button
              onClick={() => void submitCreate()}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-bg"
            >
              {t('files.create')}
            </button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title={t('files.deleteTitle')}>
          <p className="mt-2 text-sm text-muted">{t('files.deleteText')}</p>
          <p className="mt-2 break-all font-mono text-xs">{deleteTarget.path}</p>
          {deleteError && <div className="mt-2 text-xs text-amber">{deleteError}</div>}
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-muted"
            >
              {t('wizard.cancel')}
            </button>
            <button
              onClick={() => void submitDelete()}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white"
            >
              {t('files.remove')}
            </button>
          </div>
        </Modal>
      )}

      {pendingPath && (
        <Modal title={t('files.unsavedTitle')}>
          <p className="mt-2 text-sm text-muted">{t('files.unsavedText')}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setPendingPath(null)}
              className="rounded-lg border border-line px-3 py-2 text-sm text-muted"
            >
              {t('files.stay')}
            </button>
            <button
              onClick={() => void doOpen(pendingPath)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              {t('files.discard')}
            </button>
            <button
              onClick={async () => {
                if (await save()) await doOpen(pendingPath)
                else setPendingPath(null)
              }}
              className="rounded-lg bg-teal px-3 py-2 text-sm font-medium text-bg"
            >
              {t('files.saveAndGo')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}