import { expect, it } from 'vitest'
import { brand } from './brand'
import { theme } from './theme'

it('builds the Material UI palette from the centralized brand values', () => {
  expect(theme.palette.primary.main).toBe(brand.colors.primary)
  expect(theme.palette.primary.light).toBe(brand.colors.lightBlue)
  expect(theme.palette.secondary.main).toBe(brand.colors.secondary)
  expect(theme.palette.background.default).toBe(brand.colors.background)
  expect(theme.palette.background.paper).toBe(brand.colors.surface)
  expect(theme.typography.fontFamily).toBe(brand.typography.fontFamily)
})

it('derives interaction and contrast colors from the base palette', () => {
  expect(theme.palette.primary.light).not.toBe(theme.palette.primary.main)
  expect(theme.palette.primary.dark).not.toBe(theme.palette.primary.main)
  expect(theme.palette.action.selected).toBeTruthy()
  expect(theme.palette.action.selected).toBe(brand.colors.lightBlue)
  expect(theme.palette.primary.contrastText).toBeTruthy()
})
