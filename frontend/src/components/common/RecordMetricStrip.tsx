import { Box, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import { DescriptionItem } from './DescriptionItem'

export interface RecordMetric {
  key: string
  label: ReactNode
  value: ReactNode
  pending?: boolean
  error?: boolean
}

interface RecordMetricStripProps {
  items: RecordMetric[]
  title?: ReactNode
  titleId?: string
  appearance?: 'ruled' | 'card'
}

export function RecordMetricStrip({
  items,
  title,
  titleId,
  appearance = 'card',
}: RecordMetricStripProps) {
  const isRuled = appearance === 'ruled'

  return (
    <Paper
      component="section"
      aria-labelledby={title ? titleId : undefined}
      variant={isRuled ? 'elevation' : 'outlined'}
      elevation={0}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: title
            ? `auto repeat(${items.length}, minmax(120px, 1fr))`
            : `repeat(${items.length}, minmax(0, 1fr))`,
        },
        alignItems: 'stretch',
        columnGap: isRuled ? { xs: 2.5, md: 4 } : 0,
        rowGap: isRuled ? 1.5 : 0,
        borderRadius: isRuled ? 0 : undefined,
        borderTop: 1,
        borderBottom: 1,
        borderLeft: isRuled ? 0 : undefined,
        borderRight: isRuled ? 0 : undefined,
        borderColor: 'divider',
        bgcolor: isRuled ? 'transparent' : undefined,
        '& > [data-metric]': isRuled
          ? undefined
          : { px: { xs: 2, sm: 2.5 }, borderColor: 'divider' },
        '& > [data-metric]:not(:nth-of-type(2n + 1))': isRuled
          ? undefined
          : { borderLeft: { xs: 1, md: 0 } },
        '& > [data-metric]:not(:first-of-type)': isRuled ? undefined : { borderLeft: { md: 1 } },
        '& > [data-metric]:nth-of-type(n + 3)': isRuled
          ? undefined
          : { borderTop: { xs: 1, md: 0 } },
      }}
    >
      {title ? (
        <Typography
          id={titleId}
          component="h2"
          variant="subtitle2"
          sx={{
            gridColumn: { xs: '1 / -1', md: 'auto' },
            alignSelf: 'center',
            py: 1.75,
            pr: { md: 2 },
          }}
        >
          {title}
        </Typography>
      ) : null}
      {items.map(({ key, ...item }) => (
        <Box key={key} data-metric sx={{ minWidth: 0 }}>
          <DescriptionItem {...item} emphasized paddingY={isRuled ? 2.25 : 1.5} />
        </Box>
      ))}
    </Paper>
  )
}
