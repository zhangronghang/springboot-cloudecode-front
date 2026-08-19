import type { ImageDetail, ImageMetadata, PaginatedImages, CityMemory } from '../api/imageTypes'
import { parseMemoryTags, type DivisionScope } from './memoryTags'

export interface ImageMemoryApi {
  list(input: { page: number; size: number; tag?: string }): Promise<PaginatedImages<ImageMetadata>>
  detail(id: string): Promise<ImageDetail>
}

const toMemory = (image: ImageMetadata, division: string | DivisionScope): CityMemory | undefined => {
  const parsed = parseMemoryTags(image.tags, division)
  if (!parsed) return undefined
  return {
    id: image.id,
    cityCode: parsed.cityCode,
    title: image.title,
    feeling: image.description ?? '',
    visitedAt: parsed.visitedAt,
    tags: parsed.tags
  }
}

export const createCityMemoryLoader = (api: ImageMemoryApi) => ({
  async load(division: string | DivisionScope, page: number, size: number) {
    const scope = typeof division === 'string' ? { level: 'city' as const, code: division } : division
    const result = await api.list({ page, size, tag: `${scope.level}:${scope.code}` })
    const memories = result.records.map((image) => toMemory(image, scope)).filter((memory): memory is CityMemory => Boolean(memory))
    const records = await Promise.all(memories.map(async (memory) => {
      try {
        const detail = await api.detail(memory.id)
        return { ...memory, imageBase64: detail.imageBase64 }
      } catch {
        return { ...memory, imageLoadFailed: true }
      }
    }))
    return { total: result.total, page: result.page, size: result.size, records }
  }
})
