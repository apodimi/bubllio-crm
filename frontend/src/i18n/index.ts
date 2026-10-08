import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { defaultNamespace, resources } from './resources'

export const supportedLanguages = ['en', 'el'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS: defaultNamespace,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'bubllio-language',
    },
    react: { useSuspense: false },
  })

function syncDocumentLanguage(language: string) {
  if (typeof document === 'undefined') {
    return
  }

  if (supportedLanguages.includes(language as SupportedLanguage)) {
    document.documentElement.lang = language
  } else {
    document.documentElement.lang = 'en'
  }

  document.documentElement.dir = 'ltr'
}

syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)

export { i18n }
