import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import searchIcon from '@iconify-icons/keyline-icons/search'
import xIcon from '@iconify-icons/keyline-icons/x'
import {
  Alert,
  Box,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import type { GlobalSearchResult } from '../../../types/global-search.types'
import { AppIcon } from '../../../components/common/AppIcon'
import { groupGlobalSearchResults } from '../globalSearchPresentation'
import { globalSearchReducer, initialGlobalSearchState } from '../globalSearchState'
import { useGlobalSearch } from '../hooks/useGlobalSearch'
import { GlobalSearchResultList } from './GlobalSearchResultList'

const emptyResults: GlobalSearchResult[] = []

type GlobalSearchProps = {
  currentOrganizationId?: string
  currentWorkspaceName?: string
}

export function GlobalSearch({ currentOrganizationId, currentWorkspaceName }: GlobalSearchProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(globalSearchReducer, initialGlobalSearchState)
  const { open, query, activeIndex, searchAllWorkspaces } = state
  const scope = currentOrganizationId && !searchAllWorkspaces ? 'current' : 'all'
  const debouncedQuery = useDebouncedValue(query, 250)
  const scopedOrganizationId = scope === 'current' ? currentOrganizationId : undefined
  const scopeName =
    scope === 'current'
      ? (currentWorkspaceName ?? t('common.workspace'))
      : t('globalSearch.allWorkspaces')
  const search = useGlobalSearch(debouncedQuery, scopedOrganizationId)
  const resultRefs = useRef<Array<HTMLDivElement | null>>([])
  const results = search.data?.results ?? emptyResults
  const groupedResults = useMemo(() => groupGlobalSearchResults(results), [results])
  const displayedResults = useMemo(
    () => groupedResults.flatMap((group) => group.results),
    [groupedResults],
  )

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        dispatch({ type: 'open' })
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const closeSearch = useCallback(() => dispatch({ type: 'close' }), [])

  const openSearch = useCallback(() => dispatch({ type: 'open' }), [])

  const selectResult = useCallback(
    (result: GlobalSearchResult) => {
      closeSearch()
      const organizationId = result.organization.id
      if (result.type === 'company') {
        void navigate({
          to: '/organizations/$organizationId/companies/$companyId',
          params: { organizationId, companyId: result.id },
        })
        return
      }
      if (result.type === 'contact') {
        void navigate({
          to: '/organizations/$organizationId/contacts',
          params: { organizationId },
          search: { contact: result.id },
        })
        return
      }
      void navigate({
        to: '/organizations/$organizationId/deals/$dealId',
        params: { organizationId, dealId: result.id },
      })
    },
    [closeSearch, navigate],
  )

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (displayedResults.length === 0) {
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = (activeIndex + 1) % displayedResults.length
      resultRefs.current[next]?.scrollIntoView({ block: 'nearest' })
      dispatch({ type: 'activeIndexChanged', activeIndex: next })
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const next = (activeIndex - 1 + displayedResults.length) % displayedResults.length
      resultRefs.current[next]?.scrollIntoView({ block: 'nearest' })
      dispatch({ type: 'activeIndexChanged', activeIndex: next })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectResult(displayedResults[activeIndex] ?? displayedResults[0])
    }
  }

  return (
    <>
      <Tooltip title={t('globalSearch.open')}>
        <ButtonBase
          aria-label={t('globalSearch.open')}
          onClick={openSearch}
          sx={{
            minHeight: 40,
            minWidth: { xs: 40, lg: 220 },
            px: { xs: 1, lg: 1.25 },
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
            color: 'text.secondary',
            justifyContent: { xs: 'center', lg: 'flex-start' },
            '&:hover': { borderColor: 'text.secondary', bgcolor: 'background.paper' },
          }}
        >
          <AppIcon icon={searchIcon} />
          <Typography
            variant="body2"
            noWrap
            sx={{ display: { xs: 'none', lg: 'block' }, ml: 1, flex: 1, textAlign: 'left' }}
          >
            {t('globalSearch.trigger')}
          </Typography>
          <Box
            component="kbd"
            sx={{
              display: { xs: 'none', lg: 'block' },
              px: 0.75,
              py: 0.25,
              border: 1,
              borderColor: 'divider',
              borderRadius: 0.5,
              bgcolor: 'background.default',
              color: 'text.secondary',
              font: 'inherit',
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            ⌘ K
          </Box>
        </ButtonBase>
      </Tooltip>
      <Dialog
        open={open}
        onClose={closeSearch}
        fullWidth
        maxWidth="sm"
        aria-labelledby="global-search-title"
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1.5, sm: 3 },
              width: { xs: 'calc(100% - 24px)', sm: '100%' },
              maxHeight: { xs: 'calc(100dvh - 24px)', sm: 'min(720px, calc(100dvh - 64px))' },
              borderRadius: 1.5,
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: { xs: 1.5, sm: 2 } }}>
          <Typography id="global-search-title" variant="h6" sx={{ px: 0.5, mb: 1.5 }}>
            {t('globalSearch.title')}
          </Typography>
          {currentOrganizationId ? (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={scope}
              aria-label={t('globalSearch.scopeLabel')}
              onChange={(_event, nextScope: 'current' | 'all' | null) => {
                if (nextScope) {
                  dispatch({
                    type: 'scopeChanged',
                    searchAllWorkspaces: nextScope === 'all',
                  })
                }
              }}
              sx={{
                mb: 1.5,
                width: { xs: '100%', sm: 'auto' },
                gap: 1,
                '& .MuiToggleButton-root': {
                  minWidth: 0,
                  flex: { xs: '1 1 0', sm: '0 0 auto' },
                  px: { xs: 1, sm: 1.5 },
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '8px !important',
                },
              }}
            >
              <ToggleButton value="current">
                <Box
                  component="span"
                  sx={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('globalSearch.currentWorkspace', {
                    name: currentWorkspaceName ?? t('common.workspace'),
                  })}
                </Box>
              </ToggleButton>
              <ToggleButton value="all">
                <Box
                  component="span"
                  sx={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('globalSearch.allWorkspaces')}
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          ) : null}
          <TextField
            autoFocus
            fullWidth
            value={query}
            placeholder={t('globalSearch.placeholder')}
            onChange={(event) => {
              dispatch({ type: 'queryChanged', query: event.target.value })
            }}
            onKeyDown={handleKeyDown}
            slotProps={{
              htmlInput: {
                'aria-label': t('globalSearch.inputLabel', { scope: scopeName }),
                role: 'combobox',
                'aria-autocomplete': 'list',
                'aria-expanded': results.length > 0,
                'aria-controls': results.length ? 'global-search-results' : undefined,
                'aria-activedescendant': results.length
                  ? `global-search-result-${activeIndex}`
                  : undefined,
                autoComplete: 'off',
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <AppIcon icon={searchIcon} />
                  </InputAdornment>
                ),
                endAdornment: search.isFetching ? (
                  <InputAdornment position="end">
                    <CircularProgress size={18} aria-label={t('globalSearch.loading')} />
                  </InputAdornment>
                ) : query ? (
                  <InputAdornment position="end">
                    <Tooltip title={t('globalSearch.clear')}>
                      <IconButton
                        size="small"
                        aria-label={t('globalSearch.clear')}
                        onClick={() => {
                          dispatch({ type: 'queryChanged', query: '' })
                        }}
                      >
                        <AppIcon icon={xIcon} size={18} />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
        </Box>
        <Divider sx={{ mt: 2 }} />
        <DialogContent sx={{ p: 0, minHeight: 220 }}>
          {query.trim().length < 2 ? (
            <Stack sx={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', px: 3 }}>
              <Box sx={{ mb: 1, color: 'text.secondary' }}>
                <AppIcon icon={searchIcon} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                {t('globalSearch.hint')}
              </Typography>
            </Stack>
          ) : search.isPending || (search.isFetching && !search.data) ? (
            <Stack
              role="status"
              aria-live="polite"
              sx={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 1.5 }}
            >
              <CircularProgress size={22} />
              <Typography variant="body2" color="text.secondary">
                {t('globalSearch.loading')}
              </Typography>
            </Stack>
          ) : search.isError ? (
            <Alert
              severity="error"
              action={
                <ButtonBase onClick={() => void search.refetch()} sx={{ px: 1, py: 0.5 }}>
                  {t('common.retry')}
                </ButtonBase>
              }
              sx={{ m: 2 }}
            >
              {t('globalSearch.error')}
            </Alert>
          ) : !search.isFetching && results.length === 0 ? (
            <Stack
              role="status"
              aria-live="polite"
              sx={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', px: 3 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('globalSearch.noResults')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                {t('globalSearch.noResultsHint')}
              </Typography>
            </Stack>
          ) : (
            <GlobalSearchResultList
              groups={groupedResults}
              activeIndex={activeIndex}
              includeWorkspace={scope === 'all'}
              onActivate={(index) => dispatch({ type: 'activeIndexChanged', activeIndex: index })}
              onSelect={selectResult}
              registerResult={(index, element) => {
                resultRefs.current[index] = element
              }}
            />
          )}
        </DialogContent>
        <Divider />
        <Stack
          direction="row"
          sx={{
            display: { xs: 'none', sm: 'flex' },
            px: 2,
            py: 1.25,
            gap: 2,
            color: 'text.secondary',
          }}
        >
          <Typography variant="caption">↑↓ {t('globalSearch.navigate')}</Typography>
          <Typography variant="caption">↵ {t('globalSearch.select')}</Typography>
          <Typography variant="caption">esc {t('globalSearch.close')}</Typography>
        </Stack>
      </Dialog>
    </>
  )
}
