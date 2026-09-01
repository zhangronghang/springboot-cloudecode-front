import { describe, expect, it, vi } from 'vitest'
import { createCityScope, createDirectDistrictScope } from './divisionContext'
import { createCityMemoryLoader } from './cityMemoryLoader'

const coverImage = {
  imageId: 'photo-1',
  fileName: 'photo.jpg',
  fileSize: 1024,
  contentType: 'image/jpeg',
  width: 1200,
  height: 800,
  createTime: '2026-08-19 10:00:00',
  thumbnailUrl: '/api/information/1/images/photo-1/thumbnail',
  originalUrl: '/api/information/1/images/photo-1/original'
}

const metadata = {
  id: '1',
  title: '海边',
  description: '开心',
  tags: 'visited:2026-08-19,旅行',
  uploader: '',
  provinceCode: '440000',
  cityCode: '440300',
  districtCode: '440304',
  createTime: null,
  uploadTime: '2026-08-19 10:00:00',
  imageCount: 2,
  coverImage
}

describe('行政区足迹加载器', () => {
  it('按 cityCode 加载并直接映射列表封面和图片数量', async () => {
    const api = {
      list: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 10, records: [metadata] })
    }
    const scope = createCityScope({ provinceCode: '440000', cityCode: '440300', name: '深圳市' })

    await expect(createCityMemoryLoader(api).load(scope, 1, 10)).resolves.toEqual({
      total: 1,
      page: 1,
      size: 10,
      records: [{
        id: '1',
        provinceCode: '440000',
        cityCode: '440300',
        districtCode: '440304',
        districtName: '福田区',
        title: '海边',
        feeling: '开心',
        visitedAt: '2026-08-19',
        tags: ['旅行'],
        imageCount: 2,
        coverImage
      }]
    })
    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 10, cityCode: '440300' })
  })

  it('按 districtCode 加载直辖市区县记录', async () => {
    const districtMetadata = {
      ...metadata,
      provinceCode: '110000',
      cityCode: '',
      districtCode: '110101'
    }
    const api = {
      list: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 10, records: [districtMetadata] })
    }
    const scope = createDirectDistrictScope({ provinceCode: '110000', districtCode: '110101', name: '东城区' })

    await expect(createCityMemoryLoader(api).load(scope, 1, 10)).resolves.toMatchObject({
      records: [expect.objectContaining({ districtCode: '110101', districtName: '东城区', imageCount: 2, coverImage })]
    })
    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 10, districtCode: '110101' })
  })

  it('过滤空归属、未知区县和无效游玩日期记录且不请求详情', async () => {
    const api = {
      list: vi.fn().mockResolvedValue({
        total: 4,
        page: 1,
        size: 10,
        records: [
          metadata,
          { ...metadata, id: '2', districtCode: null },
          { ...metadata, id: '3', districtCode: '449999' },
          { ...metadata, id: '4', tags: '旅行' }
        ]
      })
    }
    const scope = createCityScope({ provinceCode: '440000', cityCode: '440300', name: '深圳市' })

    await expect(createCityMemoryLoader(api).load(scope, 1, 10)).resolves.toMatchObject({
      total: 1,
      records: [expect.objectContaining({ id: '1' })]
    })
  })

  it('第一页全是无效历史记录时继续读取后页并按有效记录重新分页', async () => {
    const invalid = Array.from({ length: 10 }, (_, index) => ({
      ...metadata,
      id: `invalid-${index}`,
      tags: '旅行'
    }))
    const api = {
      list: vi.fn()
        .mockResolvedValueOnce({ total: 11, page: 1, size: 10, records: invalid })
        .mockResolvedValueOnce({ total: 11, page: 2, size: 10, records: [{ ...metadata, id: 'valid-later' }] })
    }
    const scope = createCityScope({ provinceCode: '440000', cityCode: '440300', name: '深圳市' })

    await expect(createCityMemoryLoader(api).load(scope, 1, 10)).resolves.toMatchObject({
      total: 1,
      page: 1,
      size: 10,
      records: [expect.objectContaining({ id: 'valid-later' })]
    })
    expect(api.list).toHaveBeenNthCalledWith(1, { page: 1, size: 10, cityCode: '440300' })
    expect(api.list).toHaveBeenNthCalledWith(2, { page: 2, size: 10, cityCode: '440300' })
  })

  it('保留没有图片的有效足迹', async () => {
    const api = {
      list: vi.fn().mockResolvedValue({
        total: 1,
        page: 1,
        size: 10,
        records: [{ ...metadata, imageCount: 0, coverImage: null }]
      })
    }
    const scope = createCityScope({ provinceCode: '440000', cityCode: '440300', name: '深圳市' })

    await expect(createCityMemoryLoader(api).load(scope, 1, 10)).resolves.toMatchObject({
      records: [expect.objectContaining({ id: '1', imageCount: 0, coverImage: null })]
    })
  })
})
