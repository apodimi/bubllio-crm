export interface ProductionReadinessCheck {
  key: string
  label: string
  status: 'pass' | 'fail'
  guidance: string
}

export interface ProductionReadinessStatus {
  ready: boolean
  passed: number
  total: number
  checks: ProductionReadinessCheck[]
}
