const cityTag = /^city:\d{6}$/
const countyTag = /^county:\d{6}$/
const visitedTag = /^visited:(\d{4}-\d{2}-\d{2})$/

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const isManagedTag = (tag: string) => cityTag.test(tag) || countyTag.test(tag) || visitedTag.test(tag)

export const createMemoryTags = (visitedAt: string, userTags: string[]) => [
  `visited:${visitedAt}`,
  ...new Set(userTags.map((tag) => tag.trim()).filter((tag) => tag && !isManagedTag(tag)))
]

export const parseMemoryTags = (rawTags: string | undefined) => {
  const tags = (rawTags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean)
  const visitedAt = tags.map((tag) => tag.match(visitedTag)?.[1]).find(Boolean)
  if (!visitedAt || !isValidDate(visitedAt)) return undefined
  return { visitedAt, tags: tags.filter((tag) => !isManagedTag(tag)) }
}

export const isMemoryDate = isValidDate
