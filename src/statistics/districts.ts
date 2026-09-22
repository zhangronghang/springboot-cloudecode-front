import { getDivisionChildren } from '@aurouscia/china-areas/dist/index.js'
import type { DistrictStatistics } from '../api/imageTypes'

export interface DistrictRankingEntry {
  districtCode: string
  name: string
  footprintCount: number
  imageCount: number
  lastVisitedAt: string
}

export interface UnvisitedDistrict {
  districtCode: string
  name: string
}

export interface DistrictBreakdown {
  ranking: DistrictRankingEntry[]
  unvisited: UnvisitedDistrict[]
}

export const breakdownDistricts = (cityCode: string, districts: DistrictStatistics[]): DistrictBreakdown => {
  const names = new Map(getDivisionChildren(cityCode).map((division) => [division.code, division.name]))

  const ranking = districts
    .filter((entry) => names.has(entry.districtCode))
    .map((entry) => ({
      districtCode: entry.districtCode,
      name: names.get(entry.districtCode) as string,
      footprintCount: entry.footprintCount,
      imageCount: entry.imageCount,
      lastVisitedAt: entry.lastVisitedAt
    }))
    .sort((left, right) =>
      right.footprintCount - left.footprintCount || left.districtCode.localeCompare(right.districtCode))

  const visited = new Set(ranking.map((entry) => entry.districtCode))
  const unvisited = [...names]
    .filter(([code]) => !visited.has(code))
    .map(([districtCode, name]) => ({ districtCode, name }))

  return { ranking, unvisited }
}
