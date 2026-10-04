import { request } from '../../../services/api'
import type { ProductionReadinessStatus } from '../../../types/productionReadiness.types'

export const productionReadinessService = {
  get: (signal?: AbortSignal) =>
    request<ProductionReadinessStatus>('/installation/production-readiness/', { signal }),
}
