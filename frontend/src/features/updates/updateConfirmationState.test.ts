import { describe, expect, it } from 'vitest'

import {
  initialUpdateConfirmationState,
  updateConfirmationReducer,
} from './updateConfirmationState'

describe('updateConfirmationReducer', () => {
  it('clears secrets when the target version changes', () => {
    const state = updateConfirmationReducer(
      {
        open: true,
        targetVersion: '1.0.0',
        confirmation: '1.0.0',
        currentPassword: 'secret',
      },
      { type: 'confirmationChanged', targetVersion: '2.0.0', value: '2.0.0' },
    )

    expect(state).toEqual({
      open: true,
      targetVersion: '2.0.0',
      confirmation: '2.0.0',
      currentPassword: '',
    })
  })

  it('resets the complete dialog state when closed', () => {
    const state = updateConfirmationReducer(
      { ...initialUpdateConfirmationState, open: true, currentPassword: 'secret' },
      { type: 'close', targetVersion: '2.0.0' },
    )

    expect(state).toEqual({
      ...initialUpdateConfirmationState,
      targetVersion: '2.0.0',
    })
  })
})
