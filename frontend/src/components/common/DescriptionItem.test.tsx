// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DescriptionItem } from './DescriptionItem'

afterEach(cleanup)

describe('DescriptionItem', () => {
  it('renders a labelled value', () => {
    render(<DescriptionItem label="Owner" value="Alex" />)

    expect(screen.getByText('Owner')).toBeTruthy()
    expect(screen.getByText('Alex')).toBeTruthy()
  })

  it('renders a labelled skeleton while pending', () => {
    render(<DescriptionItem label="Owner" value="Alex" pending />)

    expect(screen.queryByText('Alex')).toBeNull()
    expect(screen.getByLabelText('Owner')).toBeTruthy()
  })
})
