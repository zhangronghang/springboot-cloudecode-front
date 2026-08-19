// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CityMemoryPanel from './CityMemoryPanel.vue'

const imageApi = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), upload: vi.fn(), update: vi.fn(), delete: vi.fn() }))
vi.mock('../api/imageApi', () => ({ imageApi }))

const division = { level: 'city' as const, code: '513400', name: '凉山彝族自治州' }
const memory = { id: 'memory-1', title: '泸沽湖', description: '清晨很安静', tags: 'city:513400,visited:2026-08-19' }

const mountPanel = async () => {
  const wrapper = mount(CityMemoryPanel, { props: { division } })
  await flushPromises()
  return wrapper
}

afterEach(() => vi.restoreAllMocks())

describe('城市足迹区域', () => {
  it('展示当前行政区的足迹标题和图片加载失败占位', async () => {
    imageApi.list.mockResolvedValue({ total: 1, page: 1, size: 10, records: [memory] })
    imageApi.detail.mockRejectedValue(new Error('详情不可用'))

    const wrapper = await mountPanel()

    expect(wrapper.get('#memory-title').text()).toBe('我的 凉山彝族自治州 足迹')
    expect(wrapper.text()).toContain('照片暂时无法载入')
  })

  it('阻止缺少必填照片的新建提交', async () => {
    imageApi.list.mockResolvedValue({ total: 0, page: 1, size: 10, records: [] })
    const wrapper = await mountPanel()

    await wrapper.get('button').trigger('click')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('请填写标题和有效游玩日期，并为新足迹选择一张照片。')
    expect(imageApi.upload).not.toHaveBeenCalled()
  })

  it('删除确认后显示删除中状态直到请求完成', async () => {
    imageApi.list.mockResolvedValue({ total: 1, page: 1, size: 10, records: [memory] })
    imageApi.detail.mockResolvedValue({ ...memory, imageBase64: 'aW1hZ2U=' })
    let finishDelete: () => void = () => undefined
    imageApi.delete.mockImplementation(() => new Promise<void>((resolve) => { finishDelete = resolve }))
    window.confirm = vi.fn().mockReturnValue(true)
    const wrapper = await mountPanel()

    await wrapper.get('article button:nth-of-type(2)').trigger('click')

    expect(wrapper.get('article button:nth-of-type(2)').text()).toBe('删除中…')
    expect((wrapper.get('article button:nth-of-type(2)').element as HTMLButtonElement).disabled).toBe(true)
    finishDelete()
  })
})
