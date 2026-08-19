import { describe, expect, it, vi } from 'vitest'
import { createCityMemoryLoader } from './cityMemoryLoader'

describe('城市足迹加载器', () => {
  it('按城市标签加载并映射图片详情', async () => {
    const api = {
      list: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 10, records: [{ id: '1', title: '海边', description: '开心', tags: 'city:440300,visited:2026-08-19,旅行' }] }),
      detail: vi.fn().mockResolvedValue({ id: '1', title: '海边', imageBase64: 'base64-data' })
    }

    await expect(createCityMemoryLoader(api).load('440300', 1, 10)).resolves.toMatchObject({
      total: 1,
      records: [expect.objectContaining({ id: '1', visitedAt: '2026-08-19', imageBase64: 'base64-data', tags: ['旅行'] })]
    })
    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 10, tag: 'city:440300' })
  })

  it('在单张图片详情失败时保留元数据并标记降级', async () => {
    const api = {
      list: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 10, records: [{ id: '1', title: '海边', tags: 'city:440300,visited:2026-08-19' }] }),
      detail: vi.fn().mockRejectedValue(new Error('detail failed'))
    }

    await expect(createCityMemoryLoader(api).load('440300', 1, 10)).resolves.toMatchObject({
      records: [expect.objectContaining({ id: '1', imageLoadFailed: true })]
    })
  })

  it('按区县标签查询独立记录', async () => {
    const api = { list: vi.fn().mockResolvedValue({ total: 0, page: 1, size: 10, records: [] }), detail: vi.fn() }
    await createCityMemoryLoader(api).load({ level: 'county', code: '513422' }, 1, 10)
    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 10, tag: 'county:513422' })
  })
})
