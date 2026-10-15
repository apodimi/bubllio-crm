import type { WorkspaceSettings } from '../../../types/organization.types'

export type SettingsSection =
  'general' | 'business' | 'email' | 'people' | 'erp' | 'activity' | 'danger'

export interface SettingsField {
  name: keyof WorkspaceSettings
  label: string
  helper?: string
  type?: string
  options?: Array<{ value: string | number; label: string }>
  wide?: boolean
}

export interface SettingsFieldGroup {
  title: string
  description: string
  fields: SettingsField[]
}
