import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageApiError, createImageApi } from './imageApi'

const success = (data: unknown) => new Response(JSON.stringify({ code: 200, message: 'success', data }), { status: 200 })

afterEach(() => vi.restoreAllMocks())

describe('图片服务客户端', () => {
  it('通过新信息接口按市级编码查询列表', async () => {
    const fetcher = vi.fn().mockResolvedValue(success({ total: 0, page: 1, size: 10, records: [] }))
    const api = createImageApi(fetcher)

    await expect(api.list({ page: 1, size: 10, cityCode: '440300' })).resolves.toMatchObject({ total: 0 })
    expect(fetcher).toHaveBeenCalledWith('/api/information/list', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, size: 10, cityCode: '440300' })
    }))
  })

  it('按足迹标识和每页 12 张查询图片集', async () => {
    const image = {
      imageId: 'photo-1', fileName: 'lake.png', fileSize: 123, contentType: 'image/png',
      width: 800, height: 600, createTime: '2026-08-31 10:00:00',
      thumbnailUrl: '/api/information/info-1/images/photo-1/thumbnail',
      originalUrl: '/api/information/info-1/images/photo-1/original'
    }
    const fetcher = vi.fn().mockResolvedValue(success({ total: 1, page: 1, size: 12, records: [image] }))
    const api = createImageApi(fetcher)

    await expect(api.listImages({ informationId: 'info-1', page: 1, size: 12 })).resolves.toEqual({
      total: 1, page: 1, size: 12, records: [image]
    })
    expect(fetcher).toHaveBeenCalledWith('/api/information/image/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ informationId: 'info-1', page: 1, size: 12 })
    })
  })

  it('为已有足迹新增恰好一张图片', async () => {
    const image = {
      imageId: 'photo-2', fileName: 'new.jpg', fileSize: 3, contentType: 'image/jpeg',
      width: 1, height: 1, createTime: '2026-08-31 10:01:00',
      thumbnailUrl: '/api/information/info-1/images/photo-2/thumbnail',
      originalUrl: '/api/information/info-1/images/photo-2/original'
    }
    const fetcher = vi.fn().mockResolvedValue(success(image))
    const api = createImageApi(fetcher)
    const file = new File(['new'], 'new.jpg', { type: 'image/jpeg' })

    await expect(api.addImage({ informationId: 'info-1', file })).resolves.toEqual(image)
    const [path, request] = fetcher.mock.calls[0] as [string, RequestInit]
    const form = request.body as FormData
    expect(path).toBe('/api/information/image/add')
    expect(request.method).toBe('POST')
    expect(form.get('informationId')).toBe('info-1')
    expect(form.getAll('file')).toEqual([file])
  })

  it('批量删除前去重稳定图片标识并返回部分忽略结果', async () => {
    const result = { requestedCount: 2, deletedCount: 1, ignoredImageIds: ['photo-2'], remainingCount: 3 }
    const fetcher = vi.fn().mockResolvedValue(success(result))
    const api = createImageApi(fetcher)

    await expect(api.deleteImages({ informationId: 'info-1', imageIds: ['photo-1', 'photo-1', 'photo-2'] })).resolves.toEqual(result)
    expect(fetcher).toHaveBeenCalledWith('/api/information/image/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ informationId: 'info-1', imageIds: ['photo-1', 'photo-2'] })
    })
  })

  it('普通区县上传时通过新接口提交三级行政区字段', async () => {
    const fetcher = vi.fn().mockResolvedValue(success({ id: 'image-1' }))
    const api = createImageApi(fetcher)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    await api.upload({
      file,
      title: '海边',
      description: '很好看',
      tags: 'visited:2026-08-19',
      provinceCode: '440000',
      cityCode: '440300',
      districtCode: '440304'
    })

    const [path, request] = fetcher.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/api/information/upload')
    expect(request.method).toBe('POST')
    expect(request.body).toBeInstanceOf(FormData)
    expect((request.body as FormData).get('title')).toBe('海边')
    expect((request.body as FormData).get('provinceCode')).toBe('440000')
    expect((request.body as FormData).get('cityCode')).toBe('440300')
    expect((request.body as FormData).get('districtCode')).toBe('440304')
  })

  it('直辖市区县上传时省略 cityCode', async () => {
    const fetcher = vi.fn().mockResolvedValue(success({ id: 'image-1' }))
    const api = createImageApi(fetcher)

    await api.upload({
      file: new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
      title: '故宫',
      tags: 'visited:2026-08-19',
      provinceCode: '110000',
      districtCode: '110101'
    })

    const [, request] = fetcher.mock.calls[0] as [string, RequestInit]
    const form = request.body as FormData
    expect(form.get('provinceCode')).toBe('110000')
    expect(form.get('districtCode')).toBe('110101')
    expect(form.has('cityCode')).toBe(false)
  })

  it('更新信息时不提交文件或行政区字段', async () => {
    const fetcher = vi.fn().mockResolvedValue(success({ id: 'image-1' }))
    const api = createImageApi(fetcher)

    await api.update({
      id: 'image-1',
      title: '新标题',
      file: new File(['replacement'], 'replacement.jpg', { type: 'image/jpeg' }),
      provinceCode: '510000',
      cityCode: '513400',
      districtCode: '513422'
    } as unknown as Parameters<typeof api.update>[0] & Record<string, string>)

    const [path, request] = fetcher.mock.calls[0] as [string, RequestInit]
    const form = request.body as FormData
    expect(path).toBe('/api/information/update')
    expect(form.get('id')).toBe('image-1')
    expect(form.has('file')).toBe(false)
    expect(form.has('provinceCode')).toBe(false)
    expect(form.has('cityCode')).toBe(false)
    expect(form.has('districtCode')).toBe(false)
  })

  it('删除足迹使用新信息接口', async () => {
    const fetcher = vi.fn().mockResolvedValue(success(null))
    const api = createImageApi(fetcher)

    await api.delete('image-1')

    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/information/delete')
  })

  it('在 HTTP 或业务失败时抛出统一错误', async () => {
    const api = createImageApi(vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 400, message: '标题不能为空', data: null }), { status: 200 })))

    await expect(api.delete('image-1')).rejects.toMatchObject({ name: 'ImageApiError', uncertain: false })
  })

  it.each([
    ['无法解析的上传响应', new Response('bad gateway', { status: 502 })],
    ['服务端 5xx 上传响应', new Response(JSON.stringify({ code: 500, message: '网关超时', data: null }), { status: 504 })]
  ])('%s 标记为结果不确定', async (_, response) => {
    const api = createImageApi(vi.fn().mockResolvedValue(response))

    await expect(api.addImage({
      informationId: 'info-1',
      file: new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    })).rejects.toMatchObject({ name: 'ImageApiError', uncertain: true })
  })
})
