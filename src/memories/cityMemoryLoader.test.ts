import { describe, expect, it, vi } from 'vitest'
import { createCityScope, createDirectDistrictScope } from './divisionContext'
import { createCityMemoryLoader } from './cityMemoryLoader'

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
  fileSize: '1024',
  fileName: 'photo.jpg',
  gridFsFileId: 'grid-1'
}

describe('行政区足迹加载器', () => {
  it('按 cityCode 加载并解析下属区县名称', async () => {
    const api = {
      list: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 10, records: [metadata] }),
      detail: vi.fn().mockResolvedValue({ ...metadata, imageBase64: 'base64-data' })
    }
    const scope = createCityScope({ provinceCode: '440000', cityCode: '440300', name: '深圳市' })

    await expect(createCityMemoryLoader(api).load(scope, 1, 10)).resolves.toMatchObject({
      total: 1,
      records: [expect.objectContaining({
        id: '1',
        districtCode: '440304',
        districtName: '福田区',
        visitedAt: '2026-08-19',
        imageBase64: 'base64-data',
        tags: ['旅行']
      })]
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
      list: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 10, records: [districtMetadata] }),
      detail: vi.fn().mockResolvedValue({ ...districtMetadata, imageBase64: 'base64-data' })
    }
    const scope = createDirectDistrictScope({ provinceCode: '110000', districtCode: '110101', name: '东城区' })

    await expect(createCityMemoryLoader(api).load(scope, 1, 10)).resolves.toMatchObject({
      records: [expect.objectContaining({ districtCode: '110101', districtName: '东城区' })]
    })
    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 10, districtCode: '110101' })
  })

  it('过滤空归属、未知区县和无效游玩日期记录', async () => {
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
      }),
      detail: vi.fn().mockResolvedValue({ ...metadata, imageBase64: 'base64-data' })
    }
    const scope = createCityScope({ provinceCode: '440000', cityCode: '440300', name: '深圳市' })

    await expect(createCityMemoryLoader(api).load(scope, 1, 10)).resolves.toMatchObject({
      records: [expect.objectContaining({ id: '1' })]
    })
    expect(api.detail).toHaveBeenCalledTimes(1)
  })

  it('单张图片详情失败时保留元数据并标记降级', async () => {
    const api = {
      list: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 10, records: [metadata] }),
      detail: vi.fn().mockRejectedValue(new Error('detail failed'))
    }
    const scope = createCityScope({ provinceCode: '440000', cityCode: '440300', name: '深圳市' })

    await expect(createCityMemoryLoader(api).load(scope, 1, 10)).resolves.toMatchObject({
      records: [expect.objectContaining({ id: '1', imageLoadFailed: true })]
    })
  })
})
