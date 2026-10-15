// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ContactListToolbar, ContactViewTabs } from './ContactListControls'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

afterEach(cleanup)

describe('ContactViewTabs', () => {
  it('exposes the selected view and changes views', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ContactViewTabs value="active" onChange={onChange} />)

    expect(
      screen.getByRole('button', { name: 'crm.contacts.active' }).getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(screen.getByRole('button', { name: 'crm.contacts.archived' }))
    expect(onChange).toHaveBeenCalledWith('archived')
  })
})

describe('ContactListToolbar', () => {
  it('forwards search changes and the filter anchor', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onOpenFilters = vi.fn()
    render(
      <ContactListToolbar
        search=""
        filterCount={1}
        filtersOpen={false}
        onSearchChange={onSearchChange}
        onOpenFilters={onOpenFilters}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'crm.contacts.search' }), 'Maria')
    expect(onSearchChange).toHaveBeenLastCalledWith('a')

    const [filterButton] = screen.getAllByRole('button', {
      name: 'crm.contacts.filtersButton',
    })
    await user.click(filterButton)
    expect(onOpenFilters).toHaveBeenCalledWith(filterButton)
  })
})
