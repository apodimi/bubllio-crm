// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DealBoardToolbar, DealViewTabs } from './DealBoardControls'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

afterEach(cleanup)

describe('DealViewTabs', () => {
  it('exposes the selected view and changes views', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DealViewTabs value="active" onChange={onChange} />)

    expect(
      screen.getByRole('button', { name: 'crm.deals.active' }).getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(screen.getByRole('button', { name: 'crm.deals.archived' }))
    expect(onChange).toHaveBeenCalledWith('archived')
  })
})

describe('DealBoardToolbar', () => {
  it('forwards search changes and the filter anchor', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onOpenFilters = vi.fn()
    render(
      <DealBoardToolbar
        search=""
        filterCount={1}
        filtersOpen={false}
        onSearchChange={onSearchChange}
        onOpenFilters={onOpenFilters}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'crm.deals.search' }), 'Renewal')
    expect(onSearchChange).toHaveBeenLastCalledWith('l')

    const [filterButton] = screen.getAllByRole('button', { name: 'crm.deals.filtersButton' })
    await user.click(filterButton)
    expect(onOpenFilters).toHaveBeenCalledWith(filterButton)
  })
})
