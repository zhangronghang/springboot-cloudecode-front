import { describe, expect, it } from 'vitest'
import { createMemoryTags, parseMemoryTags } from './memoryTags'

describe('城市足迹标签协议', () => {
  it('生成城市、游玩日期和用户标签', () => {
    expect(createMemoryTags('440300', '2026-08-19', ['旅行', '海边'])).toEqual([
      'city:440300',
      'visited:2026-08-19',
      '旅行',
      '海边'
    ])
  })

  it('移除用户伪造的受管理标签', () => {
    expect(createMemoryTags('440300', '2026-08-19', ['city:110000', 'visited:2020-01-01', '旅行'])).toEqual([
      'city:440300',
      'visited:2026-08-19',
      '旅行'
    ])
  })

  it('只接受有效且归属当前城市的记录', () => {
    expect(parseMemoryTags('city:440300,visited:2026-08-19,旅行', '440300')).toMatchObject({
      cityCode: '440300',
      visitedAt: '2026-08-19',
      tags: ['旅行']
    })
    expect(parseMemoryTags('city:440300,visited:not-a-date,旅行', '440300')).toBeUndefined()
    expect(parseMemoryTags('city:110000,visited:2026-08-19,旅行', '440300')).toBeUndefined()
  })

  it('按行政区层级生成并隔离市级与区县级标签', () => {
    expect(createMemoryTags({ level: 'county', code: '513422' }, '2026-08-19', ['旅行'])).toEqual([
      'county:513422',
      'visited:2026-08-19',
      '旅行'
    ])
    expect(parseMemoryTags('city:513400,visited:2026-08-19', { level: 'county', code: '513422' })).toBeUndefined()
    expect(parseMemoryTags('county:513422,visited:2026-08-19', { level: 'county', code: '513422' })).toMatchObject({ code: '513422', level: 'county' })
  })
})
