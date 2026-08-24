import { describe, expect, it } from 'vitest'
import { createMemoryTags, parseMemoryTags } from './memoryTags'

describe('足迹标签协议', () => {
  it('生成游玩日期和用户标签且不生成位置标签', () => {
    expect(createMemoryTags('2026-08-19', ['旅行', '海边'])).toEqual([
      'visited:2026-08-19',
      '旅行',
      '海边'
    ])
  })

  it('移除用户伪造的日期和旧位置标签', () => {
    expect(createMemoryTags('2026-08-19', ['city:110000', 'county:110101', 'visited:2020-01-01', '旅行'])).toEqual([
      'visited:2026-08-19',
      '旅行'
    ])
  })

  it('解析有效日期并忽略旧位置标签', () => {
    expect(parseMemoryTags('city:440300,county:440304,visited:2026-08-19,旅行')).toEqual({
      visitedAt: '2026-08-19',
      tags: ['旅行']
    })
    expect(parseMemoryTags('visited:not-a-date,旅行')).toBeUndefined()
    expect(parseMemoryTags('旅行')).toBeUndefined()
  })
})
