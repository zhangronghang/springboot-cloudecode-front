// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { CityMemory } from '../api/imageTypes'
import { createDirectDistrictScope } from '../memories/divisionContext'
import { COMMON_MEMORY_TAGS } from '../memories/tagInput'
import MemoryFormModal from './MemoryFormModal.vue'

const division = createDirectDistrictScope({
  provinceCode: '510000',
  cityCode: '513400',
  districtCode: '513422',
  name: '木里藏族自治县'
})

const memory: CityMemory = {
  id: 'memory-1',
  provinceCode: '510000',
  cityCode: '513400',
  districtCode: '513422',
  districtName: '木里藏族自治县',
  title: '泸沽湖',
  feeling: '清晨很安静',
  visitedAt: '2026-08-19',
  tags: ['古都', '美食'],
  imageCount: 2,
  coverImage: null
}

const createApi = () => ({
  upload: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({})
})

const mountModal = (overrides: Record<string, unknown> = {}) => {
  const api = createApi()
  const wrapper = mount(MemoryFormModal, {
    props: { division, api, ...overrides },
    attachTo: document.body,
    global: { stubs: { Teleport: true } }
  })
  return { wrapper, api }
}

const chipLabels = (wrapper: ReturnType<typeof mountModal>['wrapper']) =>
  wrapper.findAll('.memory-tag-chip').map((chip) => chip.get('span').text())

const createObjectURL = vi.fn(() => 'blob:preview-1')
const revokeObjectURL = vi.fn()

beforeAll(() => {
  Object.assign(URL, { createObjectURL, revokeObjectURL })
})

beforeEach(() => {
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
})

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

const photoFile = (name: string, type: string) => new File(['x'], name, { type })

const chooseFile = async (wrapper: ReturnType<typeof mountModal>['wrapper'], file: File) => {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}

const dropFile = async (wrapper: ReturnType<typeof mountModal>['wrapper'], file: File) => {
  const drop = wrapper.get('.memory-photo-drop')
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.assign(event, { dataTransfer: { files: [file] } })
  drop.element.dispatchEvent(event)
  await nextTick()
}

const fillRequired = async (wrapper: ReturnType<typeof mountModal>['wrapper']) => {
  await chooseFile(wrapper, photoFile('IMG_2043.jpg', 'image/jpeg'))
  await wrapper.get('input[aria-label="足迹标题"]').setValue('泸沽湖')
  await wrapper.get('input[aria-label="选择游玩日期"]').setValue('2026-08-19')
}

describe('MemoryFormModal 的模式', () => {
  it('创建模式显示创建标题且字段为空', () => {
    const { wrapper } = mountModal()

    expect(wrapper.get('[role="dialog"]').text()).toContain('留下足迹')
    expect(wrapper.get<HTMLInputElement>('input[aria-label="足迹标题"]').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('input[aria-label="选择游玩日期"]').element.value).toBe('')
  })

  it('编辑模式预填该足迹的当前值', () => {
    const { wrapper } = mountModal({ editing: memory })

    expect(wrapper.get('[role="dialog"]').text()).toContain('编辑足迹')
    expect(wrapper.get<HTMLInputElement>('input[aria-label="足迹标题"]').element.value).toBe('泸沽湖')
    expect(wrapper.get<HTMLInputElement>('input[aria-label="选择游玩日期"]').element.value).toBe('2026-08-19')
    expect(wrapper.get<HTMLTextAreaElement>('textarea[aria-label="足迹感受"]').element.value).toBe('清晨很安静')
    expect(chipLabels(wrapper)).toEqual(['古都', '美食'])
  })

  it('编辑模式不渲染任何照片选择控件', () => {
    const { wrapper } = mountModal({ editing: memory })

    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    expect(wrapper.find('.memory-photo-drop').exists()).toBe(false)
  })

  it('创建模式渲染照片投放区', () => {
    const { wrapper } = mountModal()

    expect(wrapper.find('.memory-photo-drop').exists()).toBe(true)
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })
})

describe('MemoryFormModal 的关闭路径', () => {
  it('点击关闭按钮只请求关闭且不发送保存请求', async () => {
    const { wrapper, api } = mountModal()

    await wrapper.get('button[aria-label="关闭表单"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(api.upload).not.toHaveBeenCalled()
    expect(api.update).not.toHaveBeenCalled()
  })

  it('按下 Escape 只请求关闭且不发送保存请求', async () => {
    const { wrapper, api } = mountModal()

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(api.upload).not.toHaveBeenCalled()
  })

  it('点击遮罩只请求关闭且不发送保存请求', async () => {
    const { wrapper, api } = mountModal()

    await wrapper.get('.modal-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(api.upload).not.toHaveBeenCalled()
  })

  it('点击弹窗内部不关闭', async () => {
    const { wrapper } = mountModal()

    await wrapper.get('[role="dialog"]').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
  })
})

describe('MemoryFormModal 的焦点', () => {
  it('打开时把焦点移入弹窗', async () => {
    const { wrapper } = mountModal()

    await nextTick()

    expect(wrapper.get('[role="dialog"]').element.contains(document.activeElement)).toBe(true)
  })

  it('卸载后把焦点归还到打开表单的入口', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const { wrapper } = mountModal()
    await nextTick()
    expect(document.activeElement).not.toBe(trigger)

    wrapper.unmount()

    expect(document.activeElement).toBe(trigger)
  })
})

describe('MemoryFormModal 的照片投放区', () => {
  it('选中合法照片后显示预览与文件名', async () => {
    const { wrapper } = mountModal()

    await chooseFile(wrapper, photoFile('IMG_2043.jpg', 'image/jpeg'))

    expect(wrapper.get('.memory-photo-preview').text()).toContain('IMG_2043.jpg')
    expect(wrapper.get('.memory-photo-preview').find('img').exists()).toBe(true)
  })

  it('接受 PNG 照片', async () => {
    const { wrapper } = mountModal()

    await chooseFile(wrapper, photoFile('map.png', 'image/png'))

    expect(wrapper.get('.memory-photo-preview').text()).toContain('map.png')
  })

  it('拒绝非 JPEG/PNG 的文件并显示校验错误', async () => {
    const { wrapper } = mountModal()

    await chooseFile(wrapper, photoFile('note.txt', 'text/plain'))

    expect(wrapper.get('.memory-error').text()).toContain('JPEG')
    expect(wrapper.find('.memory-photo-preview').exists()).toBe(false)
  })

  it('拒绝超过 50MB 的文件并显示校验错误', async () => {
    const { wrapper } = mountModal()
    const huge = { name: 'huge.jpg', type: 'image/jpeg', size: 51 * 1024 * 1024 } as File

    await chooseFile(wrapper, huge)

    expect(wrapper.get('.memory-error').text()).toContain('50MB')
    expect(wrapper.find('.memory-photo-preview').exists()).toBe(false)
  })

  it('在投放区上阻止 dragover 的默认行为', () => {
    const { wrapper } = mountModal()
    const event = new Event('dragover', { bubbles: true, cancelable: true })

    wrapper.get('.memory-photo-drop').element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('拖入照片后显示预览与文件名', async () => {
    const { wrapper } = mountModal()

    await dropFile(wrapper, photoFile('dropped.jpg', 'image/jpeg'))

    expect(wrapper.get('.memory-photo-preview').text()).toContain('dropped.jpg')
  })

  it('拖入无效文件时显示校验错误', async () => {
    const { wrapper } = mountModal()

    await dropFile(wrapper, photoFile('note.txt', 'text/plain'))

    expect(wrapper.get('.memory-error').text()).toContain('JPEG')
  })

  it('拖拽高亮在指针经过子元素时保持，离开投放区后才消失', async () => {
    const { wrapper } = mountModal()
    // Teleport 被 stub 时 Vue 每次重渲染都会重建子树，缓存的 DOMWrapper 会指向
    // 已被丢弃的旧节点，因此每次触发与断言都要重新查询。
    const drop = () => wrapper.get('.memory-photo-drop')
    const inner = () => wrapper.get('.memory-photo-drop input[type="file"]')
    const fireDrag = async (element: Element, type: string) => {
      element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
      await nextTick()
    }

    await fireDrag(drop().element, 'dragenter')
    expect(drop().classes()).toContain('is-dragging')

    await fireDrag(inner().element, 'dragenter')
    await fireDrag(inner().element, 'dragleave')
    expect(drop().classes()).toContain('is-dragging')

    await fireDrag(drop().element, 'dragleave')
    expect(drop().classes()).not.toContain('is-dragging')
  })

  it('重新选择照片会替换已有预览', async () => {
    const { wrapper } = mountModal()
    await chooseFile(wrapper, photoFile('first.jpg', 'image/jpeg'))

    await chooseFile(wrapper, photoFile('second.jpg', 'image/jpeg'))

    expect(wrapper.get('.memory-photo-preview').text()).toContain('second.jpg')
    expect(wrapper.get('.memory-photo-preview').text()).not.toContain('first.jpg')
  })
})

describe('MemoryFormModal 的标签输入', () => {
  const firstCommonTag = COMMON_MEMORY_TAGS[0]

  it('渲染内置常用词供点选', () => {
    const { wrapper } = mountModal()

    expect(wrapper.findAll('.memory-tag-suggestion')).toHaveLength(COMMON_MEMORY_TAGS.length)
  })

  it('点选常用词后该词成为可移除的标签项', async () => {
    const { wrapper } = mountModal()

    await wrapper.get('.memory-tag-suggestion').trigger('click')

    expect(chipLabels(wrapper)).toEqual([firstCommonTag])
    expect(wrapper.find(`button[aria-label="移除标签 ${firstCommonTag}"]`).exists()).toBe(true)
  })

  it('重复点选同一个常用词不会重复添加', async () => {
    const { wrapper } = mountModal()

    await wrapper.get('.memory-tag-suggestion').trigger('click')
    await wrapper.get('.memory-tag-suggestion').trigger('click')

    expect(chipLabels(wrapper)).toEqual([firstCommonTag])
  })

  it('点击标签项的移除按钮后该标签消失', async () => {
    const { wrapper } = mountModal()
    await wrapper.get('.memory-tag-suggestion').trigger('click')

    await wrapper.get(`button[aria-label="移除标签 ${firstCommonTag}"]`).trigger('click')

    expect(chipLabels(wrapper)).toEqual([])
  })

  it('移除一个标签不影响其他标签', async () => {
    const { wrapper } = mountModal({ editing: memory })

    await wrapper.get('button[aria-label="移除标签 美食"]').trigger('click')

    expect(chipLabels(wrapper)).toEqual(['古都'])
  })

  it('在标签输入框回车新增标签并清空输入框', async () => {
    const { wrapper } = mountModal()
    const input = wrapper.get('input[aria-label="添加标签"]')

    await input.setValue('徒步')
    await input.trigger('keydown', { key: 'Enter' })

    expect(chipLabels(wrapper)).toEqual(['徒步'])
    expect(wrapper.get<HTMLInputElement>('input[aria-label="添加标签"]').element.value).toBe('')
  })

  it('已选中的常用词标记为不可再添加', async () => {
    const { wrapper } = mountModal()

    await wrapper.get('.memory-tag-suggestion').trigger('click')

    expect(wrapper.get('.memory-tag-suggestion').attributes('disabled')).toBeDefined()
  })
})

describe('MemoryFormModal 的提交', () => {
  it('创建时提交标题、感受、标签与行政编码', async () => {
    const { wrapper, api } = mountModal()
    await fillRequired(wrapper)
    await wrapper.get('.memory-tag-suggestion').trigger('click')

    await wrapper.get('form').trigger('submit')

    expect(api.upload).toHaveBeenCalledWith({
      title: '泸沽湖',
      description: '',
      tags: `visited:2026-08-19,${COMMON_MEMORY_TAGS[0]}`,
      file: expect.any(File),
      provinceCode: '510000',
      cityCode: '513400',
      districtCode: '513422'
    })
  })

  it('提交时把未回车的草稿词并入标签', async () => {
    const { wrapper, api } = mountModal()
    await fillRequired(wrapper)
    await wrapper.get('input[aria-label="添加标签"]').setValue('徒步')

    await wrapper.get('form').trigger('submit')

    expect(api.upload).toHaveBeenCalledWith(
      expect.objectContaining({ tags: 'visited:2026-08-19,徒步' })
    )
  })

  it('编辑时只更新元数据且不提交文件', async () => {
    const { wrapper, api } = mountModal({ editing: memory })

    await wrapper.get('input[aria-label="足迹标题"]').setValue('泸沽湖西岸')
    await wrapper.get('form').trigger('submit')

    expect(api.update).toHaveBeenCalledWith({
      id: 'memory-1',
      title: '泸沽湖西岸',
      description: '清晨很安静',
      tags: 'visited:2026-08-19,古都,美食'
    })
    expect(api.upload).not.toHaveBeenCalled()
  })

  it('编辑弹窗中移除标签后提交不再包含该词', async () => {
    const { wrapper, api } = mountModal({ editing: memory })

    await wrapper.get('button[aria-label="移除标签 美食"]').trigger('click')
    await wrapper.get('form').trigger('submit')

    expect(api.update).toHaveBeenCalledWith(
      expect.objectContaining({ tags: 'visited:2026-08-19,古都' })
    )
  })

  it('保存成功后通知父组件', async () => {
    const { wrapper } = mountModal()
    await fillRequired(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('保存失败时保留已填内容并显示错误', async () => {
    const { wrapper, api } = mountModal()
    await fillRequired(wrapper)
    api.upload.mockRejectedValueOnce(new Error('服务暂时不可用'))

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.memory-error').text()).toContain('服务暂时不可用')
    expect(wrapper.get<HTMLInputElement>('input[aria-label="足迹标题"]').element.value).toBe('泸沽湖')
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('未选择照片时不发送创建请求', async () => {
    const { wrapper, api } = mountModal()
    await wrapper.get('input[aria-label="足迹标题"]').setValue('泸沽湖')
    await wrapper.get('input[aria-label="选择游玩日期"]').setValue('2026-08-19')

    await wrapper.get('form').trigger('submit')

    expect(api.upload).not.toHaveBeenCalled()
    expect(wrapper.get('.memory-error').text()).toContain('照片')
  })
})

describe('MemoryFormModal 的预览地址释放', () => {
  it('重新选择照片时释放上一个预览地址', async () => {
    const { wrapper } = mountModal()
    await chooseFile(wrapper, photoFile('first.jpg', 'image/jpeg'))
    expect(revokeObjectURL).not.toHaveBeenCalled()

    await chooseFile(wrapper, photoFile('second.jpg', 'image/jpeg'))

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
  })

  it('卸载弹窗时释放预览地址', async () => {
    const { wrapper } = mountModal()
    await chooseFile(wrapper, photoFile('first.jpg', 'image/jpeg'))

    wrapper.unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
  })

  it('从未选择照片时卸载不释放任何地址', () => {
    const { wrapper } = mountModal()

    wrapper.unmount()

    expect(revokeObjectURL).not.toHaveBeenCalled()
  })
})
