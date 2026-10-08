import { FormControl, MenuItem, Select } from '@mui/material'
import TranslateRounded from '@mui/icons-material/TranslateRounded'
import { useTranslation } from 'react-i18next'
import type { SupportedLanguage } from '../../i18n'

type LanguageSwitcherProps = {
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const language: SupportedLanguage = i18n.resolvedLanguage === 'el' ? 'el' : 'en'

  return (
    <FormControl size="small" variant="outlined">
      <Select
        value={language}
        aria-label={t('common.language')}
        onChange={(event) => void i18n.changeLanguage(event.target.value as SupportedLanguage)}
        startAdornment={<TranslateRounded fontSize="small" sx={{ mr: 0.75 }} />}
        renderValue={compact ? (value) => String(value).toUpperCase() : undefined}
        sx={{ minWidth: compact ? 82 : 126, bgcolor: 'background.paper' }}
      >
        <MenuItem value="en">{t('common.english')}</MenuItem>
        <MenuItem value="el">{t('common.greek')}</MenuItem>
      </Select>
    </FormControl>
  )
}
