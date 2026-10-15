import { TablePagination } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { LIST_PAGE_SIZE } from '../../hooks/useListPage'

export function ListPagination({
  count,
  page,
  onChange,
}: {
  count: number
  page: number
  onChange: (page: number) => void
}) {
  const { t } = useTranslation()
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      rowsPerPage={LIST_PAGE_SIZE}
      rowsPerPageOptions={[]}
      onPageChange={(_, next) => onChange(next)}
      getItemAriaLabel={(type) => t(`crm.pagination.${type}`)}
      labelDisplayedRows={({ from, to, count }) => t('crm.pagination.range', { from, to, count })}
    />
  )
}
