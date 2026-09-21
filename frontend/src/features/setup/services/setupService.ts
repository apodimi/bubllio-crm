import { request } from '../../../services/api'

export type SmtpSettings = {
  name: string
  host: string
  port: number
  username: string
  password: string
  from_email: string
  use_tls: boolean
  use_ssl: boolean
  is_default: boolean
}

export type SetupValues = {
  setup_token: string
  username: string
  email: string
  password: string
  organization_name: string
  organization_slug: string
  smtp?: SmtpSettings
}

export const setupService = {
  status: (signal?: AbortSignal) => request<{ available: boolean }>('/setup/', { signal }),
  complete: (values: SetupValues) => request<{ detail: string }>('/setup/', { body: values }),
  testSmtp: (values: { setup_token: string; smtp: SmtpSettings; recipient: string }) =>
    request<{ detail: string }>('/setup/smtp-test/', { body: values }),
}
