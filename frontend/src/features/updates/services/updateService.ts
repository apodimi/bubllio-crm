import { request } from '../../../services/api'
import type {
  InstallationUpdateCenterStatus,
  InstallationUpdatePreflight,
  InstallationUpdateRun,
  InstallationUpdateStatus,
} from '../../../types/update.types'

export const updateService = {
  status: (signal?: AbortSignal) =>
    request<InstallationUpdateStatus>('/installation/update-status/', { signal }),
  centerStatus: (signal?: AbortSignal) =>
    request<InstallationUpdateCenterStatus>('/installation/updates/status/', { signal }),
  preflight: (targetVersion: string) =>
    request<InstallationUpdatePreflight>('/installation/updates/preflight/', {
      body: { target_version: targetVersion },
    }),
  start: (targetVersion: string, idempotencyKey: string, currentPassword: string) =>
    request<InstallationUpdateRun>('/installation/updates/', {
      body: { target_version: targetVersion, current_password: currentPassword },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  run: (runId: string, signal?: AbortSignal) =>
    request<InstallationUpdateRun>(`/installation/updates/${runId}/`, { signal }),
}
