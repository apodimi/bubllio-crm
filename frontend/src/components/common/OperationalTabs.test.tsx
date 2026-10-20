// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { OperationalTabs } from './OperationalTabs'

afterEach(cleanup)

describe('OperationalTabs', () => {
  it('exposes the selected option and changes options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <OperationalTabs
        label="Deal view"
        options={[
          { value: 'missing', label: 'Missing next action' },
          { value: 'closing', label: 'Closing this month' },
        ]}
        value="missing"
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Deal view' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Missing next action' }).getAttribute('aria-pressed'),
    ).toBe('true')

    await user.click(screen.getByRole('button', { name: 'Closing this month' }))

    expect(onChange).toHaveBeenCalledWith('closing')
  })

  it('renders unavailable options as disabled', () => {
    const onChange = vi.fn()

    render(
      <OperationalTabs
        label="Record view"
        options={[
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived', disabled: true },
        ]}
        value="active"
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('button', { name: 'Archived' }).hasAttribute('disabled')).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })
})
