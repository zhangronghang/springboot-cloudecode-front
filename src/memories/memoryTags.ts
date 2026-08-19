const cityTag = /^city:(\d{6})$/
const countyTag = /^county:(\d{6})$/
const visitedTag = /^visited:(\d{4}-\d{2}-\d{2})$/
export interface DivisionScope { level: 'city' | 'county'; code: string }
const asScope = (value: string | DivisionScope): DivisionScope => typeof value === 'string' ? { level: 'city', code: value } : value
const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export const createMemoryTags = (division: string | DivisionScope, visitedAt: string, userTags: string[]) => {
  const scope = asScope(division)
  return [`${scope.level}:${scope.code}`, `visited:${visitedAt}`, ...[...new Set(userTags.map((tag) => tag.trim()).filter((tag) => tag && !tag.startsWith('city:') && !tag.startsWith('county:') && !tag.startsWith('visited:')))]]
}
export const parseMemoryTags = (rawTags: string | undefined, expected: string | DivisionScope) => {
  const scope = asScope(expected)
  const tags = (rawTags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean)
  const code = tags.map((tag) => tag.match(scope.level === 'city' ? cityTag : countyTag)?.[1]).find(Boolean)
  const visitedAt = tags.map((tag) => tag.match(visitedTag)?.[1]).find(Boolean)
  if (code !== scope.code || !visitedAt || !isValidDate(visitedAt)) return undefined
  return { cityCode: code, code, level: scope.level, visitedAt, tags: tags.filter((tag) => !cityTag.test(tag) && !countyTag.test(tag) && !visitedTag.test(tag)) }
}
export const isMemoryDate = isValidDate
