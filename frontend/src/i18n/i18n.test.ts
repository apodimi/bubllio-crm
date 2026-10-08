import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from './index'

describe('i18n', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('translates shared interface labels in Greek', async () => {
    await i18n.changeLanguage('el')

    expect(i18n.t('navigation.companies')).toBe('Εταιρείες')
    expect(i18n.resolvedLanguage).toBe('el')
  })

  it('falls back to English for unsupported languages', async () => {
    await i18n.changeLanguage('fr')

    expect(i18n.t('navigation.companies')).toBe('Companies')
  })
})
