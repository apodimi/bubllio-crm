import { elTranslations } from './locales/el'
import { enTranslations } from './locales/en'

export const defaultNamespace = 'common'

export const resources = {
  en: {
    common: enTranslations,
  },
  el: {
    common: elTranslations,
  },
} as const
