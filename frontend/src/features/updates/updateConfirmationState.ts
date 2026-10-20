export interface UpdateConfirmationState {
  open: boolean
  targetVersion: string | null
  confirmation: string
  currentPassword: string
}

export type UpdateConfirmationAction =
  | { type: 'open'; targetVersion: string | null }
  | { type: 'close'; targetVersion: string | null }
  | { type: 'confirmationChanged'; targetVersion: string | null; value: string }
  | { type: 'passwordChanged'; targetVersion: string | null; value: string }

export const initialUpdateConfirmationState: UpdateConfirmationState = {
  open: false,
  targetVersion: null,
  confirmation: '',
  currentPassword: '',
}

export function updateConfirmationReducer(
  state: UpdateConfirmationState,
  action: UpdateConfirmationAction,
): UpdateConfirmationState {
  switch (action.type) {
    case 'open':
      return { ...initialUpdateConfirmationState, open: true, targetVersion: action.targetVersion }
    case 'close':
      return { ...initialUpdateConfirmationState, targetVersion: action.targetVersion }
    case 'confirmationChanged':
      return {
        open: state.open,
        targetVersion: action.targetVersion,
        confirmation: action.value,
        currentPassword: state.targetVersion === action.targetVersion ? state.currentPassword : '',
      }
    case 'passwordChanged':
      return {
        open: state.open,
        targetVersion: action.targetVersion,
        confirmation: state.targetVersion === action.targetVersion ? state.confirmation : '',
        currentPassword: action.value,
      }
  }
}
