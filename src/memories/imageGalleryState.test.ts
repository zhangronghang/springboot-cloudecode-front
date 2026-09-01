import { describe, expect, it, vi } from 'vitest'
import { ImageApiError } from '../api/imageApi'
import type { PublicImage } from '../api/imageTypes'
import { createImageGalleryState } from './imageGalleryState'

const image = (imageId: string): PublicImage => ({
  imageId,
  fileName: `${imageId}.jpg`,
  fileSize: 1024,
  contentType: 'image/jpeg',
  width: 1200,
  height: 800,
  createTime: '2026-08-31 10:00:00',
  thumbnailUrl: `/api/information/info/images/${imageId}/thumbnail`,
  originalUrl: `/api/information/info/images/${imageId}/original`
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

describe('图片集状态', () => {
  it('打开足迹时以纯浏览模式加载第一页 12 张', async () => {
    const records = [image('photo-1')]
    const api = {
      listImages: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 12, records }),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)

    await gallery.open('info-1')

    expect(gallery.mode.value).toBe('browse')
    expect(gallery.status.value).toBe('ready')
    expect(gallery.records.value).toEqual(records)
    expect(gallery.total.value).toBe(1)
    expect(api.listImages).toHaveBeenCalledWith({ informationId: 'info-1', page: 1, size: 12 })
  })

  it('没有图片时进入可恢复的空状态', async () => {
    const api = {
      listImages: vi.fn().mockResolvedValue({ total: 0, page: 1, size: 12, records: [] }),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)

    await gallery.open('info-1')

    expect(gallery.status.value).toBe('empty')
    expect(gallery.records.value).toEqual([])
  })

  it('图片分页失败时清除陈旧网格并暴露重试错误', async () => {
    const api = {
      listImages: vi.fn().mockRejectedValue(new Error('offline')),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)

    await gallery.open('info-1')

    expect(gallery.status.value).toBe('error')
    expect(gallery.records.value).toEqual([])
    expect(gallery.error.value).toBe('offline')
  })

  it('忽略较早足迹的迟到响应', async () => {
    const first = deferred<{ total: number; page: number; size: number; records: PublicImage[] }>()
    const second = deferred<{ total: number; page: number; size: number; records: PublicImage[] }>()
    const api = {
      listImages: vi.fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)

    const firstOpen = gallery.open('info-1')
    const secondOpen = gallery.open('info-2')
    second.resolve({ total: 1, page: 1, size: 12, records: [image('new')] })
    await secondOpen
    first.resolve({ total: 1, page: 1, size: 12, records: [image('old')] })
    await firstOpen

    expect(gallery.informationId.value).toBe('info-2')
    expect(gallery.records.value.map(({ imageId }) => imageId)).toEqual(['new'])
  })

  it('管理模式翻页时清空当前页选择', async () => {
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 13, page: 1, size: 12, records: [image('photo-1')] })
        .mockResolvedValueOnce({ total: 13, page: 2, size: 12, records: [image('photo-13')] }),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.enterManage()
    gallery.toggleSelection('photo-1')

    await gallery.changePage(2)

    expect(gallery.mode.value).toBe('manage')
    expect([...gallery.selectedIds.value]).toEqual([])
    expect(gallery.records.value.map(({ imageId }) => imageId)).toEqual(['photo-13'])
  })

  it('在同一页按稳定图片标识预览上一张和下一张', async () => {
    const api = {
      listImages: vi.fn().mockResolvedValue({
        total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')]
      }),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')

    gallery.preview('photo-1')
    await gallery.previewNext()
    expect(gallery.mode.value).toBe('preview')
    expect(gallery.activeImage.value?.imageId).toBe('photo-2')

    await gallery.previewPrevious()
    expect(gallery.activeImage.value?.imageId).toBe('photo-1')
    gallery.backToGrid()
    expect(gallery.mode.value).toBe('browse')
  })

  it('跨越分页边界连续预览下一张和上一张', async () => {
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 13, page: 1, size: 12, records: [image('photo-12')] })
        .mockResolvedValueOnce({ total: 13, page: 2, size: 12, records: [image('photo-13')] })
        .mockResolvedValueOnce({ total: 13, page: 1, size: 12, records: [image('photo-12')] }),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.preview('photo-12')

    await gallery.previewNext()
    expect(gallery.page.value).toBe(2)
    expect(gallery.activeImage.value?.imageId).toBe('photo-13')

    await gallery.previewPrevious()
    expect(gallery.page.value).toBe(1)
    expect(gallery.activeImage.value?.imageId).toBe('photo-12')
  })

  it('预览期间拒绝普通分页以保持活动图片与当前页一致', async () => {
    const api = {
      listImages: vi.fn().mockResolvedValue({ total: 13, page: 1, size: 12, records: [image('photo-1')] }),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.preview('photo-1')

    const changed = await gallery.changePage(2)

    expect(changed).toBe(false)
    expect(api.listImages).toHaveBeenCalledTimes(1)
    expect(gallery.page.value).toBe(1)
    expect(gallery.activeImage.value?.imageId).toBe('photo-1')
  })

  it('跨页预览请求期间禁用导航并拒绝重复请求', async () => {
    const nextPage = deferred<{ total: number; page: number; size: number; records: PublicImage[] }>()
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 13, page: 1, size: 12, records: [image('photo-12')] })
        .mockReturnValueOnce(nextPage.promise),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.preview('photo-12')

    const first = gallery.previewNext()
    const second = gallery.previewNext()

    expect(gallery.previewNavigationLoading.value).toBe(true)
    expect(gallery.canPreviewNext.value).toBe(false)
    expect(gallery.canPreviewPrevious.value).toBe(false)
    expect(api.listImages).toHaveBeenCalledTimes(2)
    nextPage.resolve({ total: 13, page: 2, size: 12, records: [image('photo-13')] })
    await Promise.all([first, second])
    expect(gallery.previewNavigationLoading.value).toBe(false)
    expect(gallery.activeImage.value?.imageId).toBe('photo-13')
  })

  it('跨页预览加载失败时保留当前原图', async () => {
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 13, page: 1, size: 12, records: [image('photo-12')] })
        .mockRejectedValueOnce(new Error('下一页加载失败')),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.preview('photo-12')

    await gallery.previewNext()

    expect(gallery.page.value).toBe(1)
    expect(gallery.activeImage.value?.imageId).toBe('photo-12')
    expect(gallery.error.value).toBe('下一页加载失败')
  })

  it('原图失败后可重试并返回原来的网格模式', async () => {
    const api = {
      listImages: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 12, records: [image('photo-1')] }),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.enterManage()
    gallery.preview('photo-1')

    gallery.markOriginalFailed()
    expect(gallery.originalFailed.value).toBe(true)
    gallery.retryOriginal()
    expect(gallery.originalFailed.value).toBe(false)
    expect(gallery.originalRetryKey.value).toBe(1)
    gallery.backToGrid()
    expect(gallery.mode.value).toBe('manage')
  })

  it('上传一张有效图片后刷新图片集并通知足迹列表', async () => {
    const changed = vi.fn()
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 1, page: 1, size: 12, records: [image('photo-1')] })
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')] }),
      addImage: vi.fn().mockResolvedValue(image('photo-2')),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api, changed)
    await gallery.open('info-1')
    gallery.enterManage()
    const file = new File(['photo'], 'photo-2.jpg', { type: 'image/jpeg' })

    await gallery.upload(file)

    expect(api.addImage).toHaveBeenCalledWith({ informationId: 'info-1', file })
    expect(gallery.mutation.value).toBe('idle')
    expect(gallery.total.value).toBe(2)
    expect(gallery.message.value).toContain('photo-2.jpg')
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('达到 50 张时拒绝继续上传', async () => {
    const api = {
      listImages: vi.fn().mockResolvedValue({ total: 50, page: 1, size: 12, records: [image('photo-1')] }),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.enterManage()

    await gallery.upload(new File(['photo'], 'extra.png', { type: 'image/png' }))

    expect(api.addImage).not.toHaveBeenCalled()
    expect(gallery.canAdd.value).toBe(false)
    expect(gallery.error.value).toBe('每个足迹最多 50 张图片。')
  })

  it('普通业务上传失败时保留管理状态且不刷新', async () => {
    const changed = vi.fn()
    const api = {
      listImages: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 12, records: [image('photo-1')] }),
      addImage: vi.fn().mockRejectedValue(new ImageApiError('图片内容无效')),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api, changed)
    await gallery.open('info-1')
    gallery.enterManage()

    await gallery.upload(new File(['photo'], 'bad.jpg', { type: 'image/jpeg' }))

    expect(gallery.mode.value).toBe('manage')
    expect(gallery.error.value).toBe('图片内容无效')
    expect(api.listImages).toHaveBeenCalledTimes(1)
    expect(changed).not.toHaveBeenCalled()
  })

  it('网络中断导致结果不确定时不重试上传而刷新两处数据', async () => {
    const changed = vi.fn()
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 1, page: 1, size: 12, records: [image('photo-1')] })
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')] }),
      addImage: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api, changed)
    await gallery.open('info-1')
    gallery.enterManage()

    await gallery.upload(new File(['photo'], 'uncertain.jpg', { type: 'image/jpeg' }))

    expect(api.addImage).toHaveBeenCalledTimes(1)
    expect(api.listImages).toHaveBeenCalledTimes(2)
    expect(changed).toHaveBeenCalledTimes(1)
    expect(gallery.message.value).toContain('结果无法确认')
  })

  it('网关或协议错误导致结果不确定时同样刷新两处数据', async () => {
    const changed = vi.fn()
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 1, page: 1, size: 12, records: [image('photo-1')] })
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')] }),
      addImage: vi.fn().mockRejectedValue(new ImageApiError('网关返回无法解析的响应', true)),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api, changed)
    await gallery.open('info-1')
    gallery.enterManage()

    await gallery.upload(new File(['photo'], 'uncertain.jpg', { type: 'image/jpeg' }))

    expect(api.addImage).toHaveBeenCalledTimes(1)
    expect(api.listImages).toHaveBeenCalledTimes(2)
    expect(changed).toHaveBeenCalledTimes(1)
    expect(gallery.message.value).toContain('结果无法确认')
  })

  it('上传进行中禁止重复提交', async () => {
    const pending = deferred<PublicImage>()
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 1, page: 1, size: 12, records: [image('photo-1')] })
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')] }),
      addImage: vi.fn().mockReturnValue(pending.promise),
      deleteImages: vi.fn()
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.enterManage()
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    const firstUpload = gallery.upload(file)
    const secondUpload = gallery.upload(file)
    expect(gallery.mutation.value).toBe('uploading')
    expect(api.addImage).toHaveBeenCalledTimes(1)
    pending.resolve(image('photo-2'))
    await Promise.all([firstUpload, secondUpload])
  })

  it('批量删除报告实际删除数和已忽略数', async () => {
    const changed = vi.fn()
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 3, page: 1, size: 12, records: [image('photo-1'), image('photo-2'), image('photo-3')] })
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-2'), image('photo-3')] }),
      addImage: vi.fn(),
      deleteImages: vi.fn().mockResolvedValue({
        requestedCount: 2, deletedCount: 1, ignoredImageIds: ['photo-2'], remainingCount: 2
      })
    }
    const gallery = createImageGalleryState(api, changed)
    await gallery.open('info-1')
    gallery.enterManage()
    gallery.toggleSelection('photo-1')
    gallery.toggleSelection('photo-2')

    await gallery.deleteSelected()

    expect(api.deleteImages).toHaveBeenCalledWith({ informationId: 'info-1', imageIds: ['photo-1', 'photo-2'] })
    expect(gallery.message.value).toContain('删除 1 张')
    expect(gallery.message.value).toContain('忽略 1 张')
    expect([...gallery.selectedIds.value]).toEqual([])
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('删除当前页最后一张后回退到上一有效页', async () => {
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 13, page: 1, size: 12, records: Array.from({ length: 12 }, (_, index) => image(`photo-${index + 1}`)) })
        .mockResolvedValueOnce({ total: 13, page: 2, size: 12, records: [image('photo-13')] })
        .mockResolvedValueOnce({ total: 12, page: 1, size: 12, records: Array.from({ length: 12 }, (_, index) => image(`photo-${index + 1}`)) }),
      addImage: vi.fn(),
      deleteImages: vi.fn().mockResolvedValue({
        requestedCount: 1, deletedCount: 1, ignoredImageIds: [], remainingCount: 12
      })
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.enterManage()
    await gallery.changePage(2)
    gallery.toggleSelection('photo-13')

    await gallery.deleteSelected()

    expect(api.listImages).toHaveBeenLastCalledWith({ informationId: 'info-1', page: 1, size: 12 })
    expect(gallery.page.value).toBe(1)
  })

  it('删除最后一张后留在管理模式空状态', async () => {
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 1, page: 1, size: 12, records: [image('photo-1')] })
        .mockResolvedValueOnce({ total: 0, page: 1, size: 12, records: [] }),
      addImage: vi.fn(),
      deleteImages: vi.fn().mockResolvedValue({
        requestedCount: 1, deletedCount: 1, ignoredImageIds: [], remainingCount: 0
      })
    }
    const gallery = createImageGalleryState(api)
    await gallery.open('info-1')
    gallery.enterManage()
    gallery.toggleSelection('photo-1')

    await gallery.deleteSelected()

    expect(gallery.mode.value).toBe('manage')
    expect(gallery.status.value).toBe('empty')
    expect(gallery.total.value).toBe(0)
    expect(gallery.mutation.value).toBe('idle')
  })
})
