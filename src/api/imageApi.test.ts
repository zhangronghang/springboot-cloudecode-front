import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageApiError, createImageApi } from './imageApi'

const success = (data: unknown) => new Response(JSON.stringify({ code: 200, message: 'success', data }), { status: 200 })

afterEach(() => vi.restoreAllMocks())

describe('图片服务客户端', () => {
  it('通过 JSON 请求查询列表', async () => {
    const fetcher = vi.fn().mockResolvedValue(success({ total: 0, page: 1, size: 10, records: [] }))
    const api = createImageApi(fetcher)

    await expect(api.list({ page: 1, size: 10, tag: 'city:440300' })).resolves.toMatchObject({ total: 0 })
    expect(fetcher).toHaveBeenCalledWith('/api/images/list', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, size: 10, tag: 'city:440300' })
    }))
  })

  it('上传时提交 multipart 表单', async () => {
    const fetcher = vi.fn().mockResolvedValue(success({ id: 'image-1' }))
    const api = createImageApi(fetcher)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    await api.upload({ file, title: '海边', description: '很好看', tags: 'city:440300,visited:2026-08-19' })

    const [, request] = fetcher.mock.calls[0] as [string, RequestInit]
    expect(request.method).toBe('POST')
    expect(request.body).toBeInstanceOf(FormData)
    expect((request.body as FormData).get('title')).toBe('海边')
  })

  it('读取详情时归一化后端的嵌套元数据和图片内容', async () => {
    const api = createImageApi(vi.fn().mockResolvedValue(success({
      imageBase64: 'aW1hZ2U=',
      metadata: { id: 'image-1', title: '泸沽湖', description: '清晨很安静', tags: 'city:513400,visited:2026-08-19' }
    })))

    await expect(api.detail('image-1')).resolves.toEqual({
      id: 'image-1', title: '泸沽湖', description: '清晨很安静', tags: 'city:513400,visited:2026-08-19', imageBase64: 'aW1hZ2U='
    })
  })

  it('在 HTTP 或业务失败时抛出统一错误', async () => {
    const api = createImageApi(vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 400, message: '标题不能为空', data: null }), { status: 200 })))

    await expect(api.delete('image-1')).rejects.toBeInstanceOf(ImageApiError)
  })
})
