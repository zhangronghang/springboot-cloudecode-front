import { describe, expect, it } from 'vitest'
import { validateMemoryForm } from './memoryForm'

describe('足迹表单校验', () => {
  it('阻止未选择照片的新建足迹', () => {
    expect(validateMemoryForm({ title: '泸沽湖', visitedAt: '2026-08-19', hasFile: false, isEditing: false }))
      .toBe('请填写标题和有效游玩日期，并为新足迹选择一张照片。')
  })

  it('允许未替换照片的编辑足迹', () => {
    expect(validateMemoryForm({ title: '泸沽湖', visitedAt: '2026-08-19', hasFile: false, isEditing: true })).toBeUndefined()
  })
})
