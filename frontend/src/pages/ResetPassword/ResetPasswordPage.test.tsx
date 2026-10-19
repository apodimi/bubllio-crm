// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { authService } from '../../features/auth/services/authService'

import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useParams: () => ({ uid: 'encoded-user', token: 'single-use-token' }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { changeLanguage: vi.fn(), resolvedLanguage: 'en' },
    t: (key: string) => key,
  }),
}))

vi.mock('../../features/auth/services/authService', () => ({
  authService: {
    confirmPasswordReset: vi.fn(),
    requestPasswordReset: vi.fn(),
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ResetPasswordPage', () => {
  it('removes the reset form immediately after the link is consumed', async () => {
    vi.mocked(authService.confirmPasswordReset).mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<ResetPasswordPage />)

    await user.type(screen.getByLabelText(/passwordReset.newPassword/), 'new-password-4938')
    await user.type(screen.getByLabelText(/passwordReset.confirmPassword/), 'new-password-4938')
    await user.click(screen.getByRole('button', { name: 'passwordReset.reset' }))

    await screen.findByText('passwordReset.resetSuccess')
    expect(screen.queryByLabelText(/passwordReset.newPassword/)).toBeNull()
    expect(screen.queryByLabelText(/passwordReset.confirmPassword/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'passwordReset.reset' })).toBeNull()
    expect(screen.getByRole('link', { name: 'passwordReset.signIn' }).getAttribute('href')).toBe(
      '/',
    )
    await waitFor(() => expect(authService.confirmPasswordReset).toHaveBeenCalledTimes(1))
  })
})
