import briefcaseIcon from '@iconify-icons/keyline-icons/briefcase'
import buildingIcon from '@iconify-icons/keyline-icons/building'
import userIcon from '@iconify-icons/keyline-icons/user'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import type { GlobalSearchResult } from '../../../types/global-search.types'
import {
  globalSearchResultDetails,
  type GlobalSearchResultGroup,
} from '../globalSearchPresentation'

const resultIcons = {
  company: buildingIcon,
  contact: userIcon,
  deal: briefcaseIcon,
} as const

interface GlobalSearchResultListProps {
  groups: GlobalSearchResultGroup[]
  activeIndex: number
  includeWorkspace: boolean
  onActivate: (index: number) => void
  onSelect: (result: GlobalSearchResult) => void
  registerResult: (index: number, element: HTMLDivElement | null) => void
}

export function GlobalSearchResultList({
  groups,
  activeIndex,
  includeWorkspace,
  onActivate,
  onSelect,
  registerResult,
}: GlobalSearchResultListProps) {
  const { t } = useTranslation()
  let resultIndex = -1

  return (
    <List id="global-search-results" role="listbox" disablePadding sx={{ py: 1 }}>
      {groups.map((group) => (
        <Box component="li" role="presentation" key={group.type} sx={{ listStyle: 'none' }}>
          <Stack
            direction="row"
            sx={{ alignItems: 'baseline', justifyContent: 'space-between', px: 2, pt: 1.5 }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>
              {t(`globalSearch.groups.${group.type}`)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {group.results.length}
            </Typography>
          </Stack>
          {group.results.map((result) => {
            resultIndex += 1
            const index = resultIndex
            return (
              <ListItemButton
                id={`global-search-result-${index}`}
                key={`${result.type}-${result.id}`}
                ref={(element) => registerResult(index, element)}
                role="option"
                selected={activeIndex === index}
                aria-selected={activeIndex === index}
                onMouseMove={() => onActivate(index)}
                onClick={() => onSelect(result)}
                sx={{
                  mx: 1,
                  my: 0.25,
                  px: 1.5,
                  borderRadius: 1,
                  '&.Mui-selected': { bgcolor: 'action.selected' },
                  '&.Mui-selected:hover': { bgcolor: 'action.selected' },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 38,
                    color: activeIndex === index ? 'primary.main' : 'text.secondary',
                  }}
                >
                  <AppIcon icon={resultIcons[result.type]} size={18} />
                </ListItemIcon>
                <ListItemText
                  primary={result.display_name}
                  secondary={globalSearchResultDetails(result, includeWorkspace)}
                  slotProps={{
                    primary: { noWrap: true, sx: { fontWeight: 650 } },
                    secondary: { noWrap: true },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: { xs: 'none', sm: activeIndex === index ? 'block' : 'none' } }}
                >
                  {t('globalSearch.openResult')}
                </Typography>
              </ListItemButton>
            )
          })}
        </Box>
      ))}
    </List>
  )
}
