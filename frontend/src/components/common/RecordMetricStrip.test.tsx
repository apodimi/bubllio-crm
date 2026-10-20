// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { RecordMetricStrip } from './RecordMetricStrip'

afterEach(cleanup)

describe('RecordMetricStrip', () => {
  it('connects its heading to the metric group', () => {
    render(
      <RecordMetricStrip
        title="Customer summary"
        titleId="customer-summary"
        appearance="ruled"
        items={[
          { key: 'owner', label: 'Owner', value: 'Alex' },
          { key: 'services', label: 'Services', value: '2' },
        ]}
      />,
    )

    expect(screen.getByRole('region', { name: 'Customer summary' })).toBeTruthy()
    expect(screen.getByText('Alex')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })
})
