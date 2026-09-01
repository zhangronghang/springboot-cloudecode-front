// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublicImage } from '../api/imageTypes'
import FootprintGalleryModal from './FootprintGalleryModal.vue'

const image = (imageId: string): PublicImage => ({
  imageId,
  fileName: `${imageId}.jpg`,
  fileSize: 1024,
  contentType: 'image/jpeg',
  width: 1200,
  height: 800,
  createTime: '2026-08-31 10:00:00',
  thumbnailUrl: `/api/information/info-1/images/${imageId}/thumbnail`,
  originalUrl: `/api/information/info-1/images/${imageId}/original`
})

const createApi = (records: PublicImage[] = [image('photo-1')], total = records.length) => ({
  listImages: vi.fn().mockResolvedValue({ total, page: 1, size: 12, records }),
  addImage: vi.fn(),
  deleteImages: vi.fn()
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((onResolve) => { resolve = onResolve })
  return { promise, resolve }
}

const mountGallery = async (api = createApi()) => {
  const wrapper = mount(FootprintGalleryModal, {
    attachTo: document.body,
    props: { informationId: 'info-1', title: '泸沽湖', api },
    global: { stubs: { Teleport: true } }
  })
  await flushPromises()
  return wrapper
}

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

describe('足迹图片集弹窗', () => {
  it('默认以纯浏览网格展示图片总数和页码', async () => {
    const wrapper = await mountGallery(createApi([image('photo-1')], 13))

    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('泸沽湖')
    expect(wrapper.text()).toContain('共 13 张 · 第 1 / 2 页')
    expect(wrapper.findAll('.gallery-thumbnail')).toHaveLength(1)
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('删除所选图片')
  })

  it('空图片足迹显示空状态和添加入口', async () => {
    const wrapper = await mountGallery(createApi([], 0))

    expect(wrapper.text()).toContain('该足迹暂无图片')
    expect(wrapper.get('button[aria-label="添加图片"]')).toBeTruthy()
  })

  it('缩略图失败后保留网格位置并显示失败占位', async () => {
    const wrapper = await mountGallery()

    await wrapper.get('.gallery-thumbnail img').trigger('error')

    expect(wrapper.findAll('.gallery-thumbnail')).toHaveLength(1)
    expect(wrapper.text()).toContain('缩略图加载失败')
  })

  it('权威刷新图片列表后允许临时失败的缩略图重新加载', async () => {
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 1, page: 1, size: 12, records: [image('photo-1')] })
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')] }),
      addImage: vi.fn().mockResolvedValue(image('photo-2')),
      deleteImages: vi.fn()
    }
    const wrapper = await mountGallery(api)
    await wrapper.get('.gallery-thumbnail img').trigger('error')
    await wrapper.get('button[aria-label="管理图片"]').trigger('click')
    const file = new File(['photo'], 'photo-2.jpg', { type: 'image/jpeg' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')

    await wrapper.get('button[aria-label="上传所选图片"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('button[aria-label="预览 photo-1.jpg"] img').exists()).toBe(true)
  })

  it('仅在显式进入管理后显示选择、上传和删除控件', async () => {
    const wrapper = await mountGallery()

    await wrapper.get('button[aria-label="管理图片"]').trigger('click')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    expect(wrapper.get('button[aria-label="添加图片"]')).toBeTruthy()
    expect(wrapper.text()).toContain('删除所选图片')

    await wrapper.get('button[aria-label="完成图片管理"]').trigger('click')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('删除所选图片')
  })

  it('在弹窗内预览原图并切换上一张和下一张', async () => {
    const wrapper = await mountGallery(createApi([image('photo-1'), image('photo-2')], 2))

    await wrapper.get('button[aria-label="预览 photo-1.jpg"]').trigger('click')
    expect(wrapper.get('.gallery-original').attributes('src')).toBe(image('photo-1').originalUrl)
    expect((wrapper.get('button[aria-label="上一张"]').element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('button[aria-label="下一张"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.gallery-original').attributes('src')).toBe(image('photo-2').originalUrl)

    await wrapper.get('button[aria-label="上一张"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.gallery-original').attributes('src')).toBe(image('photo-1').originalUrl)
  })

  it('原图预览仅通过上一张和下一张跨页，不显示普通分页', async () => {
    const wrapper = await mountGallery(createApi([image('photo-12')], 13))

    expect(wrapper.find('.gallery-pagination').exists()).toBe(true)
    await wrapper.get('button[aria-label="预览 photo-12.jpg"]').trigger('click')

    expect(wrapper.find('.gallery-pagination').exists()).toBe(false)
  })

  it('使用后端原图地址在新窗口打开', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const wrapper = await mountGallery()
    await wrapper.get('button[aria-label="预览 photo-1.jpg"]').trigger('click')

    await wrapper.get('button[aria-label="新窗口打开原图"]').trigger('click')

    expect(open).toHaveBeenCalledWith(image('photo-1').originalUrl, '_blank', 'noopener,noreferrer')
  })

  it('原图失败时保留预览并提供重试和返回入口', async () => {
    const wrapper = await mountGallery()
    await wrapper.get('button[aria-label="预览 photo-1.jpg"]').trigger('click')

    await wrapper.get('.gallery-original').trigger('error')
    expect(wrapper.text()).toContain('原图加载失败')
    await wrapper.get('button[aria-label="重试原图"]').trigger('click')
    expect(wrapper.find('.gallery-original').exists()).toBe(true)

    await wrapper.get('button[aria-label="返回图片集"]').trigger('click')
    expect(wrapper.find('.gallery-grid').exists()).toBe(true)
  })

  it('选择单张图片后显示文件名和上传中状态', async () => {
    const pending = deferred<PublicImage>()
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 1, page: 1, size: 12, records: [image('photo-1')] })
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')] }),
      addImage: vi.fn().mockReturnValue(pending.promise),
      deleteImages: vi.fn()
    }
    const wrapper = await mountGallery(api)
    await wrapper.get('button[aria-label="管理图片"]').trigger('click')
    const file = new File(['photo'], 'photo-2.png', { type: 'image/png' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')
    expect(wrapper.text()).toContain('photo-2.png')

    await wrapper.get('button[aria-label="上传所选图片"]').trigger('click')
    expect(wrapper.text()).toContain('正在上传 photo-2.png')
    pending.resolve(image('photo-2'))
    await flushPromises()

    expect(api.addImage).toHaveBeenCalledWith({ informationId: 'info-1', file })
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('达到图片上限时禁用添加并显示上限提示', async () => {
    const wrapper = await mountGallery(createApi([image('photo-1')], 50))
    await wrapper.get('button[aria-label="管理图片"]').trigger('click')

    expect((wrapper.get('button[aria-label="添加图片"]').element as HTMLButtonElement).disabled).toBe(true)
    expect(wrapper.text()).toContain('每个足迹最多 50 张图片')
  })

  it('确认删除所选图片后显示实际删除和忽略结果', async () => {
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')] })
        .mockResolvedValueOnce({ total: 1, page: 1, size: 12, records: [image('photo-2')] }),
      addImage: vi.fn(),
      deleteImages: vi.fn().mockResolvedValue({
        requestedCount: 2, deletedCount: 1, ignoredImageIds: ['photo-2'], remainingCount: 1
      })
    }
    const wrapper = await mountGallery(api)
    await wrapper.get('button[aria-label="管理图片"]').trigger('click')
    for (const checkbox of wrapper.findAll('input[type="checkbox"]')) await checkbox.setValue(true)

    await wrapper.get('button[aria-label="删除所选图片"]').trigger('click')
    expect(wrapper.text()).toContain('确认删除 2 张所选图片')
    await wrapper.get('button[aria-label="确认删除所选图片"]').trigger('click')
    await flushPromises()

    expect(api.deleteImages).toHaveBeenCalledWith({ informationId: 'info-1', imageIds: ['photo-1', 'photo-2'] })
    expect(wrapper.text()).toContain('已删除 1 张，忽略 1 张')
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('删除确认打开时冻结待删除图片集合', async () => {
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')] })
        .mockResolvedValueOnce({ total: 0, page: 1, size: 12, records: [] }),
      addImage: vi.fn(),
      deleteImages: vi.fn().mockResolvedValue({
        requestedCount: 2, deletedCount: 2, ignoredImageIds: [], remainingCount: 0
      })
    }
    const wrapper = await mountGallery(api)
    await wrapper.get('button[aria-label="管理图片"]').trigger('click')
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    for (const checkbox of checkboxes) await checkbox.setValue(true)
    await wrapper.get('button[aria-label="删除所选图片"]').trigger('click')

    await checkboxes[0]!.setValue(false)
    await wrapper.get('button[aria-label="确认删除所选图片"]').trigger('click')
    await flushPromises()

    expect(api.deleteImages).toHaveBeenCalledWith({ informationId: 'info-1', imageIds: ['photo-1', 'photo-2'] })
  })

  it('删除确认接管焦点与 Esc，且不允许操作外层图库', async () => {
    const wrapper = await mountGallery(createApi([image('photo-1')], 1))
    await wrapper.get('button[aria-label="管理图片"]').trigger('click')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('button[aria-label="删除所选图片"]').trigger('click')
    await flushPromises()

    const confirmation = wrapper.get('[role="alertdialog"]')
    expect(confirmation.attributes('aria-labelledby')).toBe('gallery-delete-title')
    expect(wrapper.get('#gallery-delete-title').text()).toContain('确认删除 1 张所选图片')
    expect(confirmation.element.contains(document.activeElement)).toBe(true)
    await wrapper.get('button[aria-label="完成图片管理"]').trigger('click')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('打开时锁定滚动并将焦点限制在弹窗，卸载后恢复触发元素', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const wrapper = await mountGallery()
    const dialog = wrapper.get('[role="dialog"]')

    expect(document.body.style.overflow).toBe('hidden')
    expect(dialog.element.contains(document.activeElement)).toBe(true)

    const focusable = dialog.element.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
    focusable[focusable.length - 1]!.focus()
    await dialog.trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(focusable[0])

    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger)
  })

  it('图片列表仍在慢速加载时立即将焦点移入弹窗', async () => {
    const pending = deferred<{ total: number; page: number; size: number; records: PublicImage[] }>()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const api = {
      listImages: vi.fn().mockReturnValue(pending.promise),
      addImage: vi.fn(),
      deleteImages: vi.fn()
    }
    const wrapper = mount(FootprintGalleryModal, {
      attachTo: document.body,
      props: { informationId: 'info-1', title: '泸沽湖', api },
      global: { stubs: { Teleport: true } }
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="dialog"]').element.contains(document.activeElement)).toBe(true)

    pending.resolve({ total: 0, page: 1, size: 12, records: [] })
    await flushPromises()
    wrapper.unmount()
  })

  it('空闲时 Esc 和遮罩点击均请求关闭', async () => {
    const wrapper = await mountGallery()

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await wrapper.get('.gallery-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('上传期间锁定关闭按钮、Esc 和遮罩关闭', async () => {
    const pending = deferred<PublicImage>()
    const api = {
      listImages: vi.fn()
        .mockResolvedValueOnce({ total: 1, page: 1, size: 12, records: [image('photo-1')] })
        .mockResolvedValueOnce({ total: 2, page: 1, size: 12, records: [image('photo-1'), image('photo-2')] }),
      addImage: vi.fn().mockReturnValue(pending.promise),
      deleteImages: vi.fn()
    }
    const wrapper = await mountGallery(api)
    await wrapper.get('button[aria-label="管理图片"]').trigger('click')
    const file = new File(['photo'], 'photo-2.jpg', { type: 'image/jpeg' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')
    await wrapper.get('button[aria-label="上传所选图片"]').trigger('click')

    expect((wrapper.get('button[aria-label="关闭图片集"]').element as HTMLButtonElement).disabled).toBe(true)
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await wrapper.get('.gallery-backdrop').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()

    pending.resolve(image('photo-2'))
    await flushPromises()
  })

  it('使用固定遮罩、四列联系印样网格和完整原图适配', async () => {
    const wrapper = await mountGallery(createApi([image('photo-1'), image('photo-2')], 2))

    expect(getComputedStyle(wrapper.get('.gallery-backdrop').element).position).toBe('fixed')
    const gridStyle = getComputedStyle(wrapper.get('.gallery-grid').element)
    expect(gridStyle.display).toBe('grid')
    expect(gridStyle.gridTemplateColumns).toContain('repeat(4')

    await wrapper.get('button[aria-label="预览 photo-1.jpg"]').trigger('click')
    const originalStyle = getComputedStyle(wrapper.get('.gallery-original').element)
    expect(originalStyle.objectFit).toBe('contain')
  })
})
