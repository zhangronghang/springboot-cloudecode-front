import { describe, expectTypeOf, it } from 'vitest'
import type { ApiResponse, CityMemory, ImageMetadata, PaginatedImages } from './imageTypes'

describe('图片服务类型', () => {
  it('描述图片元数据、分页结果和城市足迹', () => {
    expectTypeOf<ApiResponse<PaginatedImages<ImageMetadata>>>().toMatchTypeOf<{
      code: number
      message: string
      data: PaginatedImages<ImageMetadata>
    }>()
    expectTypeOf<CityMemory>().toMatchTypeOf<{ id: string; cityCode: string; visitedAt: string; imageBase64?: string }>()
  })
})
