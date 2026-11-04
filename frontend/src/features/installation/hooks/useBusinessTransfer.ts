import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dataExportService } from '../services/dataExportService'

export function useBusinessTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dataExportService.downloadBusinessTransfer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installation-audit-log'] }),
  })
}
