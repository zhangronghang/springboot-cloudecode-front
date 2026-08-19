import { describe, expect, it, vi } from 'vitest'
import { openDatePicker } from './datePicker'

describe('日期选择器', () => {
  it('点击时打开原生日历选择器', () => {
    const showPicker = vi.fn()
    openDatePicker({ currentTarget: { showPicker } } as unknown as MouseEvent)
    expect(showPicker).toHaveBeenCalledOnce()
  })
})
