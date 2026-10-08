import enAuth from './locales/en/auth.json'
import enCommon from './locales/en/common.json'
import enErrors from './locales/en/errors.json'
import enNavigation from './locales/en/navigation.json'
import enOrganizations from './locales/en/organizations.json'
import enPasswordReset from './locales/en/passwordReset.json'
import enSetup from './locales/en/setup.json'
import elAuth from './locales/el/auth.json'
import elCommon from './locales/el/common.json'
import elErrors from './locales/el/errors.json'
import elNavigation from './locales/el/navigation.json'
import elOrganizations from './locales/el/organizations.json'
import elPasswordReset from './locales/el/passwordReset.json'
import elSetup from './locales/el/setup.json'

export const defaultNamespace = 'common'

export const resources = {
  en: {
    common: {
      common: enCommon,
      navigation: enNavigation,
      auth: enAuth,
      organizations: enOrganizations,
      setup: enSetup,
      passwordReset: enPasswordReset,
      errors: enErrors,
    },
  },
  el: {
    common: {
      common: elCommon,
      navigation: elNavigation,
      auth: elAuth,
      organizations: elOrganizations,
      setup: elSetup,
      passwordReset: elPasswordReset,
      errors: elErrors,
    },
  },
} as const
