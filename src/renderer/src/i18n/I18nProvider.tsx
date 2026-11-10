import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ru } from './ru'
import { en } from './en'

type Lang = 'ru' | 'en'

const dictionaries = { ru, en }

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nValue>({
  lang: 'ru',
  setLang: () => {},
  t: (key) => key
})

function lookup(dict: object, key: string): string {
  let current: unknown = dict
  for (const part of key.split('.')) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return key
    }
  }
  return typeof current === 'string' ? current : key
}


export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru')

  useEffect(() => {
    window.api.settings.get().then((s) => setLangState(s.language))
  }, [])

  function setLang(next: Lang) {
    setLangState(next)
    window.api.settings.set({ language: next })
  }

  function t(key: string): string {
    return lookup(dictionaries[lang], key)
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}