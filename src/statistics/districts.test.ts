import { describe, expect, it } from 'vitest'
import type { DistrictStatistics } from '../api/imageTypes'
import { breakdownDistricts } from './districts'

const district = (
  districtCode: string,
  footprintCount: number,
  imageCount = footprintCount,
  lastVisitedAt = '2026-08-19'
): DistrictStatistics => ({
  provinceCode: '510000',
  cityCode: '513400',
  districtCode,
  footprintCount,
  imageCount,
  lastVisitedAt
})

describe('区县打卡分布', () => {
  it('排行按足迹数降序、同数按编码升序，并带出区县名', () => {
    const { ranking } = breakdownDistricts('513400', [
      district('513424', 1),
      district('513422', 3, 7, '2026-09-02'),
      district('513402', 1)
    ])

    expect(ranking).toEqual([
      { districtCode: '513422', name: '木里藏族自治县', footprintCount: 3, imageCount: 7, lastVisitedAt: '2026-09-02' },
      { districtCode: '513402', name: '会理市', footprintCount: 1, imageCount: 1, lastVisitedAt: '2026-08-19' },
      { districtCode: '513424', name: '德昌县', footprintCount: 1, imageCount: 1, lastVisitedAt: '2026-08-19' }
    ])
    expect(ranking.map((entry) => entry.districtCode)).not.toContain('999999')
  })

  it('区划表之外的编码既不入排行也不进未打卡清单', () => {
    const { ranking, unvisited } = breakdownDistricts('513400', [district('999999', 4)])

    expect(ranking).toEqual([])
    expect(unvisited).toHaveLength(17)
    expect(unvisited.map((entry) => entry.districtCode)).not.toContain('999999')
  })

  it('未打卡清单是区划表去掉已打卡区县后的差集', () => {
    const { unvisited } = breakdownDistricts('513400', [district('513401', 1), district('513422', 1)])

    expect(unvisited).toHaveLength(15)
    expect(unvisited.map((entry) => entry.districtCode)).toEqual([
      '513402', '513423', '513424', '513426', '513427', '513428', '513429', '513430', '513431',
      '513432', '513433', '513434', '513435', '513436', '513437'
    ])
    expect(unvisited[0]).toEqual({ districtCode: '513402', name: '会理市' })
  })

  it('全部区县都已打卡时未打卡清单为空', () => {
    const all = ['513401', '513402', '513422', '513423', '513424', '513426', '513427', '513428',
      '513429', '513430', '513431', '513432', '513433', '513434', '513435', '513436', '513437']
    const { ranking, unvisited } = breakdownDistricts('513400', all.map((code) => district(code, 1)))

    expect(ranking).toHaveLength(17)
    expect(unvisited).toEqual([])
  })
})
