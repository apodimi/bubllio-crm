// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CompanyListToolbar, CompanyViewTabs } from './CompanyListControls'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

afterEach(cleanup)

describe('CompanyViewTabs', () => {
  it('exposes the selected view and changes views', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CompanyViewTabs currentUserId={7} value="active" onChange={onChange} />)

    expect(
      screen.getByRole('button', { name: 'crm.companies.active' }).getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(screen.getByRole('button', { name: 'crm.companies.archived' }))
    expect(onChange).toHaveBeenCalledWith('archived')
  })

  it('disables the personal view when no current user is available', () => {
    render(<CompanyViewTabs value="active" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'crm.companies.mine' })).toHaveProperty(
      'disabled',
      true,
    )
  })
})

describe('CompanyListToolbar', () => {
  it('forwards search changes and the filter anchor', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onOpenFilters = vi.fn()
    render(
      <CompanyListToolbar
        search=""
        advancedFilterCount={2}
        filtersOpen={false}
        onSearchChange={onSearchChange}
        onOpenFilters={onOpenFilters}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'crm.companies.search' }), 'Acme')
    expect(onSearchChange).toHaveBeenLastCalledWith('e')

    const [filterButton] = screen.getAllByRole('button', {
      name: 'crm.companies.filtersButton',
    })
    await user.click(filterButton)
    expect(onOpenFilters).toHaveBeenCalledWith(filterButton)
  })
})
