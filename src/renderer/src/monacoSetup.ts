import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker?worker'

;(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new jsonWorker()
    return new editorWorker()
  }
}

// Редактор использует локальный monaco-editor, а не CDN
loader.config({ monaco })

monaco.editor.defineTheme('lodegate', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#0b1220',
    'editor.lineHighlightBackground': '#111a2e',
    'editorLineNumber.foreground': '#4a5a78',
    'editorGutter.background': '#0b1220'
  }
})