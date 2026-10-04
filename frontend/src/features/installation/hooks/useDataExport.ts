import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dataExportService } from '../services/dataExportService'

export function useDataExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: dataExportService.download,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installation-audit-log'] }),
  })
}
