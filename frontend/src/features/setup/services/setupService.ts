import { request } from '../../../services/api'

export type SetupValues = {
  setup_token: string
  username: string
  email: string
  password: string
  organization_name: string
  organization_slug: string
  smtp?: {
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
}

export const setupService = {
  status: (signal?: AbortSignal) => request<{ available: boolean }>('/setup/', { signal }),
  complete: (values: SetupValues) => request<{ detail: string }>('/setup/', { body: values }),
}
