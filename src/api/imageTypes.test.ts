import { describe, expectTypeOf, it } from 'vitest'
import type {
  ApiResponse,
  CityMemory,
  ImageBatchDeleteResult,
  ImageMetadata,
  PaginatedImages,
  PublicImage
} from './imageTypes'

describe('图片服务类型', () => {
  it('描述公开图片、足迹封面和图片数量', () => {
    expectTypeOf<ApiResponse<PaginatedImages<ImageMetadata>>>().toMatchTypeOf<{
      code: number
      message: string
      data: PaginatedImages<ImageMetadata>
    }>()
    expectTypeOf<ImageMetadata>().toMatchTypeOf<{
      provinceCode?: string | null
      cityCode?: string | null
      districtCode?: string | null
      uploadTime?: string | null
      imageCount: number
      coverImage: PublicImage | null
    }>()
    expectTypeOf<PublicImage>().toMatchTypeOf<{
      imageId: string
      fileName: string
      fileSize: number
      contentType: string
      width: number
      height: number
      createTime: string
      thumbnailUrl: string
      originalUrl: string
    }>()
    expectTypeOf<CityMemory>().toMatchTypeOf<{
      id: string
      provinceCode: string
      cityCode?: string
      districtCode: string
      districtName: string
      visitedAt: string
      imageCount: number
      coverImage: PublicImage | null
      coverLoadFailed?: boolean
    }>()
  })

  it('描述幂等批量删除结果', () => {
    expectTypeOf<ImageBatchDeleteResult>().toMatchTypeOf<{
      requestedCount: number
      deletedCount: number
      ignoredImageIds: string[]
      remainingCount: number
    }>()
  })
})
