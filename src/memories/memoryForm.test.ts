import { describe, expect, it } from 'vitest'
import { validateImageFile, validateMemoryForm } from './memoryForm'

describe('足迹表单校验', () => {
  it('阻止未选择照片的新建足迹', () => {
    expect(validateMemoryForm({ title: '泸沽湖', visitedAt: '2026-08-19', hasFile: false, isEditing: false }))
      .toBe('请填写标题和有效游玩日期，并为新足迹选择一张照片。')
  })

  it('允许未替换照片的编辑足迹', () => {
    expect(validateMemoryForm({ title: '泸沽湖', visitedAt: '2026-08-19', hasFile: false, isEditing: true })).toBeUndefined()
  })

  it('拒绝浏览器声明为非 JPEG 或 PNG 的文件', () => {
    expect(validateImageFile({ type: 'image/gif', size: 1024 })).toBe('请选择 JPEG 或 PNG 图片。')
  })

  it('拒绝大于 50 MiB 的图片', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 50 * 1024 * 1024 + 1 })).toBe('图片大小不能超过 50MB。')
  })

  it('允许恰好 50 MiB 的 PNG 图片', () => {
    expect(validateImageFile({ type: 'image/png', size: 50 * 1024 * 1024 })).toBeUndefined()
  })

  it('允许小于上限的 JPEG 图片', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 1024 })).toBeUndefined()
  })
})
