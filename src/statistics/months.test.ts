import { describe, expect, it } from 'vitest'
import { fillMonthRange } from './months'

describe('月份热力条数据', () => {
  it('补齐最早与最晚游玩月份之间的空档', () => {
    expect(fillMonthRange([{ month: '2026-06', footprintCount: 2 }, { month: '2026-09', footprintCount: 1 }]))
      .toEqual([
        { month: '2026-06', footprintCount: 2 },
        { month: '2026-07', footprintCount: 0 },
        { month: '2026-08', footprintCount: 0 },
        { month: '2026-09', footprintCount: 1 }
      ])
  })

  it('跨年时按自然月连续补齐', () => {
    expect(fillMonthRange([{ month: '2026-11', footprintCount: 1 }, { month: '2027-02', footprintCount: 3 }]))
      .toEqual([
        { month: '2026-11', footprintCount: 1 },
        { month: '2026-12', footprintCount: 0 },
        { month: '2027-01', footprintCount: 0 },
        { month: '2027-02', footprintCount: 3 }
      ])
  })

  it('跨度超过 24 个月时只保留最近 24 个月', () => {
    const buckets = fillMonthRange([
      { month: '2023-01', footprintCount: 5 },
      { month: '2026-04', footprintCount: 2 }
    ])

    expect(buckets).toHaveLength(24)
    expect(buckets[0]).toEqual({ month: '2024-05', footprintCount: 0 })
    expect(buckets[23]).toEqual({ month: '2026-04', footprintCount: 2 })
    expect(buckets.map((bucket) => bucket.month)).not.toContain('2024-04')
    expect(buckets.every((bucket, index) => index === 0 || bucket.month > buckets[index - 1].month)).toBe(true)
  })

  it('没有月份时不渲染任何格子', () => {
    expect(fillMonthRange([])).toEqual([])
  })
})
