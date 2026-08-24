// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCityScope, createDirectDistrictScope, type MemoryDivision } from '../memories/divisionContext'
import CityMemoryPanel from './CityMemoryPanel.vue'

const imageApi = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), upload: vi.fn(), update: vi.fn(), delete: vi.fn() }))
vi.mock('../api/imageApi', () => ({ imageApi }))

const cityScope = createCityScope({ provinceCode: '510000', cityCode: '513400', name: '凉山彝族自治州' })
const districtScope = createDirectDistrictScope({
  provinceCode: '510000',
  cityCode: '513400',
  districtCode: '513422',
  name: '木里藏族自治县'
})
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
  fileSize: '1024',
  fileName: 'photo.jpg',
  gridFsFileId: 'grid-1'
}

const mountPanel = async (division: MemoryDivision = cityScope) => {
  const wrapper = mount(CityMemoryPanel, { props: { division } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  imageApi.list.mockResolvedValue({ total: 1, page: 1, size: 10, records: [metadata] })
  imageApi.detail.mockResolvedValue({ ...metadata, imageBase64: 'aW1hZ2U=' })
  imageApi.upload.mockResolvedValue(metadata)
  imageApi.update.mockResolvedValue(metadata)
  imageApi.delete.mockResolvedValue(null)
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

  it('编辑请求不提交行政区字段', async () => {
    const wrapper = await mountPanel(cityScope)
    await wrapper.get('article button').trigger('click')
    const inputs = wrapper.findAll('form input')
    await inputs[1]!.setValue('新标题')
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
    await wrapper.get('article button').trigger('click')
    const titleInput = wrapper.findAll('form input')[1]!
    await titleInput.setValue('保留的标题')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(true)
    expect((titleInput.element as HTMLInputElement).value).toBe('保留的标题')
    expect(wrapper.text()).toContain('更新失败')
  })
})
