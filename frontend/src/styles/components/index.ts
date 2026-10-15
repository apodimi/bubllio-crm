import type { Components, Theme } from '@mui/material/styles'
import { button } from './button'
import { card } from './card'
import { chip } from './chip'
import { cssBaseline } from './css-baseline'
import { dialog } from './dialog'
import { dialogActions } from './dialog-actions'
import { dialogTitle } from './dialog-title'
import { drawer } from './drawer'
import { iconButton } from './icon-button'
import { inputLabel } from './input-label'
import { listItemButton } from './list-item-button'
import { listItemText } from './list-item-text'
import { menu } from './menu'
import { menuItem } from './menu-item'
import { outlinedInput } from './outlined-input'
import { paper } from './paper'
import { select } from './select'
import { tableCell } from './table-cell'
import { tableRow } from './table-row'
import { tab } from './tab'
import { tabs } from './tabs'
import { textField } from './text-field'
import { toggleButton } from './toggle-button'
import { tooltip } from './tooltip'

/**
 * Maps each readable local override to the component key expected by MUI.
 * Add new application-wide component styles here after creating their own file.
 */
export const components: Components<Theme> = {
  MuiButton: button,
  MuiCard: card,
  MuiChip: chip,
  MuiCssBaseline: cssBaseline,
  MuiDialog: dialog,
  MuiDialogActions: dialogActions,
  MuiDialogTitle: dialogTitle,
  MuiDrawer: drawer,
  MuiIconButton: iconButton,
  MuiInputLabel: inputLabel,
  MuiListItemButton: listItemButton,
  MuiListItemText: listItemText,
  MuiMenu: menu,
  MuiMenuItem: menuItem,
  MuiOutlinedInput: outlinedInput,
  MuiPaper: paper,
  MuiSelect: select,
  MuiTableCell: tableCell,
  MuiTableRow: tableRow,
  MuiTab: tab,
  MuiTabs: tabs,
  MuiTextField: textField,
  MuiToggleButton: toggleButton,
  MuiTooltip: tooltip,
}
