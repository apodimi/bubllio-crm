import { Box, Skeleton, Typography, type TypographyProps } from '@mui/material'
import type { ReactNode } from 'react'

export interface DescriptionItemProps {
  label: ReactNode
  value: ReactNode
  pending?: boolean
  error?: boolean
  valueColor?: TypographyProps['color']
  paddingY?: number
  emphasized?: boolean
}

export function DescriptionItem({
  label,
  value,
  pending = false,
  error = false,
  valueColor,
  paddingY = 0,
  emphasized = false,
}: DescriptionItemProps) {
  const color = error ? 'error.main' : valueColor

  return (
    <Box sx={{ minWidth: 0, py: paddingY }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {pending ? (
        <Skeleton aria-label={typeof label === 'string' ? label : undefined} width="70%" />
      ) : (
        <Typography
          component="div"
          variant="body2"
          color={color}
          sx={{ fontWeight: emphasized ? 700 : undefined, overflowWrap: 'anywhere' }}
        >
          {value}
        </Typography>
      )}
    </Box>
  )
}
