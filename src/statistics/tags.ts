import type { TagStatistics } from '../api/imageTypes'

export interface TagDisplayEntry {
  tag: string
  count: number
  ratio: number
}

export const buildTagDisplay = (tags: TagStatistics[]): TagDisplayEntry[] => {
  if (tags.length === 0) return []

  const sorted = [...tags].sort((left, right) =>
    right.count - left.count || left.tag.localeCompare(right.tag))
  const highest = sorted[0].count

  return sorted.map((entry) => ({
    tag: entry.tag,
    count: entry.count,
    ratio: entry.count / highest
  }))
}
