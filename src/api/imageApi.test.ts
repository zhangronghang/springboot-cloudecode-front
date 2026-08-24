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

  it('读取详情时归一化后端的嵌套元数据和图片内容', async () => {
    const api = createImageApi(vi.fn().mockResolvedValue(success({
      imageBase64: 'aW1hZ2U=',
      metadata: {
        id: 'image-1',
        title: '泸沽湖',
        description: '清晨很安静',
        tags: 'visited:2026-08-19',
        provinceCode: '510000',
        cityCode: '513400',
        districtCode: '513422',
        uploadTime: '2026-08-19 17:55:42'
      }
    })))

    await expect(api.detail('image-1')).resolves.toEqual({
      id: 'image-1',
      title: '泸沽湖',
      description: '清晨很安静',
      tags: 'visited:2026-08-19',
      provinceCode: '510000',
      cityCode: '513400',
      districtCode: '513422',
      uploadTime: '2026-08-19 17:55:42',
      imageBase64: 'aW1hZ2U='
    })
  })

  it('更新信息时不提交行政区字段', async () => {
    const fetcher = vi.fn().mockResolvedValue(success({ id: 'image-1' }))
    const api = createImageApi(fetcher)

    await api.update({
      id: 'image-1',
      title: '新标题',
      provinceCode: '510000',
      cityCode: '513400',
      districtCode: '513422'
    } as Parameters<typeof api.update>[0] & Record<string, string>)

    const [path, request] = fetcher.mock.calls[0] as [string, RequestInit]
    const form = request.body as FormData
    expect(path).toBe('/api/information/update')
    expect(form.get('id')).toBe('image-1')
    expect(form.has('provinceCode')).toBe(false)
    expect(form.has('cityCode')).toBe(false)
    expect(form.has('districtCode')).toBe(false)
  })

  it('详情和删除使用新信息接口', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(success({ imageBase64: 'aW1hZ2U=', metadata: { id: 'image-1', title: '海边' } }))
      .mockResolvedValueOnce(success(null))
    const api = createImageApi(fetcher)

    await api.detail('image-1')
    await api.delete('image-1')

    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/information/detail')
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/information/delete')
  })

  it('在 HTTP 或业务失败时抛出统一错误', async () => {
    const api = createImageApi(vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 400, message: '标题不能为空', data: null }), { status: 200 })))

    await expect(api.delete('image-1')).rejects.toBeInstanceOf(ImageApiError)
  })
})
