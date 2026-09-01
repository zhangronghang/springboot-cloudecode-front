// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCityScope, createDirectDistrictScope, type MemoryDivision } from '../memories/divisionContext'
import CityMemoryPanel from './CityMemoryPanel.vue'
import FootprintGalleryModal from './FootprintGalleryModal.vue'

const imageApi = vi.hoisted(() => ({
  list: vi.fn(),
  listImages: vi.fn(),
  addImage: vi.fn(),
  deleteImages: vi.fn(),
  upload: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}))
vi.mock('../api/imageApi', () => ({ imageApi }))

const cityScope = createCityScope({ provinceCode: '510000', cityCode: '513400', name: '凉山彝族自治州' })
const districtScope = createDirectDistrictScope({
  provinceCode: '510000',
  cityCode: '513400',
  districtCode: '513422',
  name: '木里藏族自治县'
})
const coverImage = {
  imageId: 'photo-1',
  fileName: 'photo.jpg',
  fileSize: 1024,
  contentType: 'image/jpeg',
  width: 1200,
  height: 800,
  createTime: '2026-08-19 10:00:00',
  thumbnailUrl: '/api/information/memory-1/images/photo-1/thumbnail',
  originalUrl: '/api/information/memory-1/images/photo-1/original'
}
const metadata = {
  id: 'memory-1',
  title: '泸沽湖',
  description: '清晨很安静',
  tags: 'visited:2026-08-19,旅行',
  uploader: '',
  provinceCode: '510000',
  cityCode: '513400',
  districtCode: '513422',
  createTime: null,
  uploadTime: '2026-08-19 10:00:00',
  imageCount: 2,
  coverImage
}

const fileWithSize = (name: string, type: string, size: number) => {
  const file = new File(['photo'], name, { type })
  Object.defineProperty(file, 'size', { configurable: true, value: size })
  return file
}

const mountPanel = async (division: MemoryDivision = cityScope) => {
  const wrapper = mount(CityMemoryPanel, { attachTo: document.body, props: { division } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  imageApi.list.mockResolvedValue({ total: 1, page: 1, size: 10, records: [metadata] })
  imageApi.listImages.mockResolvedValue({ total: 2, page: 1, size: 12, records: [coverImage] })
  imageApi.addImage.mockResolvedValue(coverImage)
  imageApi.deleteImages.mockResolvedValue({ requestedCount: 1, deletedCount: 1, ignoredImageIds: [], remainingCount: 1 })
  imageApi.upload.mockResolvedValue(metadata)
  imageApi.update.mockResolvedValue(metadata)
  imageApi.delete.mockResolvedValue(null)
})

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

describe('行政区足迹区域', () => {
  it('市级隐藏创建入口但保留编辑和删除', async () => {
    const wrapper = await mountPanel(cityScope)

    expect(wrapper.find('.memory-heading .memory-action').exists()).toBe(false)
    expect(wrapper.get('article').text()).toContain('编辑')
    expect(wrapper.get('article').text()).toContain('删除')
  })

  it('市级信息卡片展示所属区县名称', async () => {
    const wrapper = await mountPanel(cityScope)

    expect(wrapper.get('article').text()).toContain('木里藏族自治县')
  })

  it('卡片直接展示列表封面地址和图片数量', async () => {
    const wrapper = await mountPanel(cityScope)

    expect(wrapper.get('.memory-cover img').attributes('src')).toBe(coverImage.thumbnailUrl)
    expect(wrapper.get('.memory-image-count').text()).toContain('2 张')
  })

  it.each([
    ['市级', cityScope],
    ['区县级', districtScope]
  ])('%s已有足迹均可打开图片管理弹窗', async (_label, scope) => {
    const wrapper = await mountPanel(scope)

    await wrapper.get('.memory-cover').trigger('click')
    await flushPromises()

    expect(imageApi.listImages).toHaveBeenCalledWith({ informationId: 'memory-1', page: 1, size: 12 })
    expect(document.body.textContent).toContain('管理图片')
  })

  it('空封面仍可打开图片集重新添加图片', async () => {
    imageApi.list.mockResolvedValue({
      total: 1, page: 1, size: 10, records: [{ ...metadata, imageCount: 0, coverImage: null }]
    })
    imageApi.listImages.mockResolvedValue({ total: 0, page: 1, size: 12, records: [] })
    const wrapper = await mountPanel(districtScope)

    await wrapper.get('.memory-cover').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('该足迹暂无图片')
  })

  it('封面加载失败后保留卡片并可打开图片集', async () => {
    const wrapper = await mountPanel(cityScope)
    await wrapper.get('.memory-cover img').trigger('error')

    expect(wrapper.text()).toContain('封面加载失败')
    await wrapper.get('.memory-cover').trigger('click')
    await flushPromises()
    expect(imageApi.listImages).toHaveBeenCalled()
  })

  it('市级列表不展示无法识别所属区县的记录', async () => {
    imageApi.list.mockResolvedValue({
      total: 1,
      page: 1,
      size: 10,
      records: [{ ...metadata, districtCode: '519999' }]
    })

    const wrapper = await mountPanel(cityScope)

    expect(wrapper.find('article').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('泸沽湖')
  })

  it('普通区县创建时提交三级行政区字段', async () => {
    imageApi.list.mockResolvedValue({ total: 0, page: 1, size: 10, records: [] })
    const wrapper = await mountPanel(districtScope)
    await wrapper.get('.memory-heading .memory-action').trigger('click')

    const inputs = wrapper.findAll('form input')
    Object.defineProperty(inputs[0]!.element, 'files', { configurable: true, value: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] })
    await inputs[0]!.trigger('change')
    await inputs[1]!.setValue('雪山')
    await inputs[2]!.setValue('2026-08-20')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(imageApi.upload).toHaveBeenCalledWith(expect.objectContaining({
      title: '雪山',
      provinceCode: '510000',
      cityCode: '513400',
      districtCode: '513422',
      tags: 'visited:2026-08-20'
    }))
  })

  it.each([
    ['非图片文件', new File(['text'], 'note.txt', { type: 'text/plain' })],
    ['超过 50MB 的图片', fileWithSize('huge.jpg', 'image/jpeg', 50 * 1024 * 1024 + 1)]
  ])('创建时拒绝%s', async (_label, file) => {
    imageApi.list.mockResolvedValue({ total: 0, page: 1, size: 10, records: [] })
    const wrapper = await mountPanel(districtScope)
    await wrapper.get('.memory-heading .memory-action').trigger('click')
    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', { configurable: true, value: [file] })
    await fileInput.trigger('change')
    await wrapper.get('input[aria-label="足迹标题"]').setValue('雪山')
    await wrapper.get('input[aria-label="选择游玩日期"]').setValue('2026-08-20')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(imageApi.upload).not.toHaveBeenCalled()
    expect(wrapper.text()).toMatch(/JPEG|50MB/)
  })

  it('编辑表单不提供照片选择或替换入口', async () => {
    const wrapper = await mountPanel(cityScope)
    await wrapper.get('button[aria-label="编辑足迹"]').trigger('click')

    expect(wrapper.find('form input[type="file"]').exists()).toBe(false)
    await wrapper.get('input[aria-label="足迹标题"]').setValue('新标题')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(imageApi.update).toHaveBeenCalledWith({
      id: 'memory-1',
      title: '新标题',
      description: '清晨很安静',
      tags: 'visited:2026-08-19,旅行'
    })
  })

  it('编辑请求不提交行政区字段', async () => {
    const wrapper = await mountPanel(cityScope)
    await wrapper.get('button[aria-label="编辑足迹"]').trigger('click')
    await wrapper.get('input[aria-label="足迹标题"]').setValue('新标题')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(imageApi.update).toHaveBeenCalledWith({
      id: 'memory-1',
      title: '新标题',
      description: '清晨很安静',
      tags: 'visited:2026-08-19,旅行'
    })
  })

  it('编辑失败时保留表单内容并显示错误', async () => {
    imageApi.update.mockRejectedValue(new Error('更新失败'))
    const wrapper = await mountPanel(cityScope)
    await wrapper.get('button[aria-label="编辑足迹"]').trigger('click')
    const titleInput = wrapper.get('input[aria-label="足迹标题"]')
    await titleInput.setValue('保留的标题')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(true)
    expect((titleInput.element as HTMLInputElement).value).toBe('保留的标题')
    expect(wrapper.text()).toContain('更新失败')
  })

  it('删除足迹前展示标题、图片数量和不可恢复提示，取消时不发送请求', async () => {
    const wrapper = await mountPanel(cityScope)

    await wrapper.get('button[aria-label="删除足迹"]').trigger('click')

    const confirm = wrapper.get('[role="alertdialog"]')
    expect(confirm.text()).toContain('泸沽湖')
    expect(confirm.text()).toContain('2 张图片')
    expect(confirm.text()).toContain('不可恢复')
    await wrapper.get('button[aria-label="取消删除足迹"]').trigger('click')
    expect(imageApi.delete).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('删除足迹失败时保留当前卡片并显示错误', async () => {
    imageApi.delete.mockRejectedValue(new Error('删除足迹失败'))
    const wrapper = await mountPanel(cityScope)
    await wrapper.get('button[aria-label="删除足迹"]').trigger('click')

    await wrapper.get('button[aria-label="确认删除足迹"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.memory-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('删除足迹失败')
  })

  it('删除非首页最后一条足迹后回到上一页', async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => ({ ...metadata, id: `memory-${index + 1}`, title: `足迹 ${index + 1}` }))
    imageApi.list
      .mockResolvedValueOnce({ total: 11, page: 1, size: 10, records: firstPage })
      .mockResolvedValueOnce({ total: 11, page: 2, size: 10, records: [{ ...metadata, id: 'memory-11', title: '末页足迹' }] })
      .mockResolvedValueOnce({ total: 10, page: 1, size: 10, records: firstPage })
    const wrapper = await mountPanel(cityScope)
    await wrapper.get('.memory-pagination button:last-child').trigger('click')
    await flushPromises()
    await wrapper.get('button[aria-label="删除足迹"]').trigger('click')

    await wrapper.get('button[aria-label="确认删除足迹"]').trigger('click')
    await flushPromises()

    expect(imageApi.list.mock.calls[imageApi.list.mock.calls.length - 1]?.[0]).toMatchObject({ page: 1 })
    expect(wrapper.text()).toContain('足迹 1')
  })

  it('图片集变化后刷新第一页并替换陈旧封面和数量', async () => {
    const updatedCover = { ...coverImage, imageId: 'photo-new', thumbnailUrl: '/api/information/memory-1/images/photo-new/thumbnail' }
    imageApi.list
      .mockResolvedValueOnce({ total: 11, page: 1, size: 10, records: [metadata] })
      .mockResolvedValueOnce({ total: 11, page: 2, size: 10, records: [{ ...metadata, id: 'memory-11', title: '末页足迹' }] })
      .mockResolvedValueOnce({ total: 11, page: 1, size: 10, records: [{ ...metadata, imageCount: 3, coverImage: updatedCover }] })
    const wrapper = await mountPanel(cityScope)
    await wrapper.get('.memory-pagination button:last-child').trigger('click')
    await flushPromises()
    await wrapper.get('.memory-cover').trigger('click')
    await flushPromises()

    wrapper.findComponent(FootprintGalleryModal).vm.$emit('changed')
    await flushPromises()

    expect(imageApi.list.mock.calls[imageApi.list.mock.calls.length - 1]?.[0]).toMatchObject({ page: 1 })
    expect(wrapper.get('.memory-cover img').attributes('src')).toBe(updatedCover.thumbnailUrl)
    expect(wrapper.get('.memory-image-count').text()).toContain('3 张')
  })

  it('图片集刷新替换卡片节点后关闭弹窗仍恢复到同一足迹入口', async () => {
    const updatedCover = { ...coverImage, imageId: 'photo-new' }
    imageApi.list
      .mockResolvedValueOnce({ total: 1, page: 1, size: 10, records: [metadata] })
      .mockResolvedValueOnce({ total: 1, page: 1, size: 10, records: [{ ...metadata, imageCount: 3, coverImage: updatedCover }] })
    const wrapper = await mountPanel(cityScope)
    const oldTrigger = wrapper.get('.memory-cover').element as HTMLElement
    oldTrigger.focus()
    await wrapper.get('.memory-cover').trigger('click')
    await flushPromises()
    const modal = wrapper.findComponent(FootprintGalleryModal)

    modal.vm.$emit('changed')
    await flushPromises()
    expect(oldTrigger.isConnected).toBe(false)
    ;(document.querySelector('button[aria-label="关闭图片集"]') as HTMLButtonElement).click()
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(wrapper.findComponent(FootprintGalleryModal).exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('.memory-cover').element)
  })
})
