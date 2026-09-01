import type { ImageListInput } from '../api/imageApi'
import type { CityMemory, ImageMetadata, PaginatedImages } from '../api/imageTypes'
import { findDistrict } from '../data/china'
import { createInformationListInput, type MemoryDivision } from './divisionContext'
import { parseMemoryTags } from './memoryTags'

export interface ImageMemoryApi {
  list(input: ImageListInput): Promise<PaginatedImages<ImageMetadata>>
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
    tags: parsed.tags,
    imageCount: image.imageCount,
    coverImage: image.coverImage
  }
}

export const createCityMemoryLoader = (api: ImageMemoryApi) => ({
  async load(scope: MemoryDivision, page: number, size: number) {
    const currentPage = await api.list(createInformationListInput(scope, page, size))
    const currentRecords = currentPage.records
      .map((image) => toMemory(image, scope))
      .filter((memory): memory is CityMemory => Boolean(memory))
    if (currentRecords.length === currentPage.records.length) {
      return { total: currentPage.total, page: currentPage.page, size: currentPage.size, records: currentRecords }
    }

    const serverPageSize = Math.max(1, currentPage.size || size)
    const serverPageCount = Math.max(1, Math.ceil(currentPage.total / serverPageSize))
    const pages = await Promise.all(Array.from({ length: serverPageCount }, (_, index) => {
      const serverPage = index + 1
      return serverPage === currentPage.page
        ? currentPage
        : api.list(createInformationListInput(scope, serverPage, size))
    }))
    const validRecords = pages
      .flatMap((result) => result.records)
      .map((image) => toMemory(image, scope))
      .filter((memory): memory is CityMemory => Boolean(memory))
    const validPageCount = Math.max(1, Math.ceil(validRecords.length / size))
    const normalizedPage = Math.min(Math.max(1, page), validPageCount)
    const start = (normalizedPage - 1) * size

    return {
      total: validRecords.length,
      page: normalizedPage,
      size,
      records: validRecords.slice(start, start + size)
    }
  }
})
