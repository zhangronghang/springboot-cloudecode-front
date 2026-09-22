import type { MonthStatistics } from '../api/imageTypes'

export const MONTH_LIMIT = 24

const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1
const formatMonth = (index: number) =>
  `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`

export const fillMonthRange = (months: MonthStatistics[]): MonthStatistics[] => {
  if (months.length === 0) return []

  const counts = new Map(months.map((entry) => [monthIndex(entry.month), entry.footprintCount]))
  const latest = Math.max(...counts.keys())
  const earliest = Math.min(...counts.keys())
  const first = Math.max(earliest, latest - MONTH_LIMIT + 1)

  return Array.from({ length: latest - first + 1 }, (_, offset) => {
    const index = first + offset
    return { month: formatMonth(index), footprintCount: counts.get(index) ?? 0 }
  })
}
