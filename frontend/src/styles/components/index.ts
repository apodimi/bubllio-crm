import type { Components, Theme } from '@mui/material/styles'
import { button } from './button'
import { card } from './card'
import { chip } from './chip'
import { cssBaseline } from './css-baseline'
import { drawer } from './drawer'
import { listItemButton } from './list-item-button'
import { outlinedInput } from './outlined-input'
import { paper } from './paper'
import { select } from './select'
import { tableCell } from './table-cell'
import { textField } from './text-field'

/**
 * Maps each readable local override to the component key expected by MUI.
 * Add new application-wide component styles here after creating their own file.
 */
export const components: Components<Theme> = {
  MuiButton: button,
  MuiCard: card,
  MuiChip: chip,
  MuiCssBaseline: cssBaseline,
  MuiDrawer: drawer,
  MuiListItemButton: listItemButton,
  MuiOutlinedInput: outlinedInput,
  MuiPaper: paper,
  MuiSelect: select,
  MuiTableCell: tableCell,
  MuiTextField: textField,
}
