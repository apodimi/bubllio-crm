// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { downloadAccountExport } from './downloadAccountExport'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('downloadAccountExport', () => {
  it('downloads the export with a stable filename and releases the object URL', () => {
    const file = new Blob(['{}'], { type: 'application/json' })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:account-export')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    downloadAccountExport(file)

    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:account-export')
  })
})
