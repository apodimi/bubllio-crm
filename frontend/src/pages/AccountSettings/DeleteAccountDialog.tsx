import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

export function DeleteAccountDialog({
  open,
  password,
  confirmation,
  pending,
  onPasswordChange,
  onConfirmationChange,
  onClose,
  onDelete,
}: {
  open: boolean
  password: string
  confirmation: string
  pending: boolean
  onPasswordChange: (value: string) => void
  onConfirmationChange: (value: string) => void
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete account?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            This is permanent. Transfer workspace ownership first if you own a workspace.
          </Typography>
          <TextField
            label="Current password"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            required
          />
          <TextField
            label="Type DELETE to confirm"
            value={confirmation}
            onChange={(event) => onConfirmationChange(event.target.value)}
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          onClick={onDelete}
          disabled={confirmation !== 'DELETE' || !password || pending}
        >
          Delete account
        </Button>
      </DialogActions>
    </Dialog>
  )
}
