import BusinessRounded from '@mui/icons-material/BusinessRounded'
import DeleteForeverRounded from '@mui/icons-material/DeleteForeverRounded'
import EmailRounded from '@mui/icons-material/EmailRounded'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import PaymentsRounded from '@mui/icons-material/PaymentsRounded'
import PeopleRounded from '@mui/icons-material/PeopleRounded'
import PublicRounded from '@mui/icons-material/PublicRounded'

import type { SettingsSection } from './settings.types'

export const settingsSections = [
  ['general', 'General & regional', PublicRounded],
  ['business', 'Business identity', BusinessRounded],
  ['email', 'Email connections', EmailRounded],
  ['people', 'People & permissions', PeopleRounded],
  ['erp', 'ERP defaults', PaymentsRounded],
  ['activity', 'Activity', HistoryRounded],
  ['danger', 'Danger zone', DeleteForeverRounded],
] as const satisfies ReadonlyArray<readonly [SettingsSection, string, typeof PublicRounded]>
