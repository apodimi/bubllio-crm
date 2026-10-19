import { request } from '../../../services/api'
import {
  updateCenterContract,
  updatePreflightContract,
  updateRunContract,
  updateStatusContract,
} from '../../../types/api-contract/schemas'
import type {
  InstallationUpdateCenterStatus,
  InstallationUpdatePreflight,
  InstallationUpdateRun,
  InstallationUpdateStatus,
} from '../../../types/update.types'

export const updateService = {
  status: (signal?: AbortSignal) =>
    request<InstallationUpdateStatus>('/installation/update-status/', {
      signal,
      schema: updateStatusContract,
    }),
  centerStatus: (signal?: AbortSignal) =>
    request<InstallationUpdateCenterStatus>('/installation/updates/status/', {
      signal,
      schema: updateCenterContract,
    }),
  preflight: (targetVersion: string) =>
    request<InstallationUpdatePreflight>('/installation/updates/preflight/', {
      body: { target_version: targetVersion },
      schema: updatePreflightContract,
    }),
  start: (targetVersion: string, idempotencyKey: string, currentPassword: string) =>
    request<InstallationUpdateRun>('/installation/updates/', {
      body: { target_version: targetVersion, current_password: currentPassword },
      headers: { 'Idempotency-Key': idempotencyKey },
      schema: updateRunContract,
    }),
  run: (runId: string, signal?: AbortSignal) =>
    request<InstallationUpdateRun>(`/installation/updates/${runId}/`, {
      signal,
      schema: updateRunContract,
    }),
}
