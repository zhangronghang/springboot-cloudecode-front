import { getDivisionChildren } from '@aurouscia/china-areas/dist/index.js'

export interface Coverage {
  visitedCount: number
  totalCount: number
  percentage: number
}

export const summarizeCoverage = (cityCode: string, visitedCodes: string[]): Coverage => {
  const districts = getDivisionChildren(cityCode)
  const codes = new Set(districts.map((district) => district.code))
  const visitedCount = new Set(visitedCodes.filter((code) => codes.has(code))).size

  return {
    visitedCount,
    totalCount: districts.length,
    percentage: districts.length === 0 ? 0 : Math.round((visitedCount / districts.length) * 100)
  }
}
