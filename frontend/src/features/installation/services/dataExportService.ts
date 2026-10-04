import { apiClient } from '../../../services/api'

export const dataExportService = {
  download: () => apiClient.get<Blob>('/installation/data-export/', { responseType: 'blob' }),
}
