import type { ImageListInput } from '../api/imageApi'
import type { CityMemory, ImageDetail, ImageMetadata, PaginatedImages } from '../api/imageTypes'
import { findDistrict } from '../data/china'
import { createInformationListInput, type MemoryDivision } from './divisionContext'
import { parseMemoryTags } from './memoryTags'

export interface ImageMemoryApi {
  list(input: ImageListInput): Promise<PaginatedImages<ImageMetadata>>
  detail(id: string): Promise<ImageDetail>
}

const resolveDistrictName = (image: ImageMetadata, scope: MemoryDivision) => {
  if (!image.provinceCode || image.provinceCode !== scope.provinceCode || !image.districtCode) return undefined

  if (scope.level === 'district') {
    if (image.districtCode !== scope.districtCode) return undefined
    if (scope.cityCode && image.cityCode !== scope.cityCode) return undefined
    if (!scope.cityCode && image.cityCode) return undefined
    return scope.name
  }

  if (image.cityCode !== scope.cityCode) return undefined
  return findDistrict(scope.cityCode, image.districtCode)?.name
}

const toMemory = (image: ImageMetadata, scope: MemoryDivision): CityMemory | undefined => {
  const parsed = parseMemoryTags(image.tags)
  const districtName = resolveDistrictName(image, scope)
  if (!parsed || !districtName || !image.provinceCode || !image.districtCode) return undefined

  return {
    id: image.id,
    provinceCode: image.provinceCode,
    ...(image.cityCode ? { cityCode: image.cityCode } : {}),
    districtCode: image.districtCode,
    districtName,
    title: image.title,
    feeling: image.description ?? '',
    visitedAt: parsed.visitedAt,
    tags: parsed.tags
  }
}

export const createCityMemoryLoader = (api: ImageMemoryApi) => ({
  async load(scope: MemoryDivision, page: number, size: number) {
    const result = await api.list(createInformationListInput(scope, page, size))
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
