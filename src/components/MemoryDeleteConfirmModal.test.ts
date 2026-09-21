// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { CityMemory } from '../api/imageTypes'
import MemoryDeleteConfirmModal from './MemoryDeleteConfirmModal.vue'

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

const createApi = () => ({ delete: vi.fn().mockResolvedValue(null) })

const mountModal = (overrides: Record<string, unknown> = {}) => {
  const api = createApi()
  const wrapper = mount(MemoryDeleteConfirmModal, {
    props: { memory, api, ...overrides },
    attachTo: document.body,
    global: { stubs: { Teleport: true } }
  })
  return { wrapper, api }
}

const confirmButton = (wrapper: ReturnType<typeof mountModal>['wrapper']) =>
  wrapper.get('button[aria-label="确认删除足迹"]')

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

describe('MemoryDeleteConfirmModal 的确认内容', () => {
  it('展示足迹标题、图片数量与不可恢复提示', () => {
    const { wrapper } = mountModal()

    const confirm = wrapper.get('[role="alertdialog"]')
    expect(confirm.text()).toContain('泸沽湖')
    expect(confirm.text()).toContain('2 张图片')
    expect(confirm.text()).toContain('不可恢复')
  })
})

describe('MemoryDeleteConfirmModal 的取消', () => {
  it('点击取消时不发送删除请求并请求关闭', async () => {
    const { wrapper, api } = mountModal()

    await wrapper.get('button[aria-label="取消删除足迹"]').trigger('click')

    expect(api.delete).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('按下 Escape 时不发送删除请求并请求关闭', async () => {
    const { wrapper, api } = mountModal()

    await wrapper.get('[role="alertdialog"]').trigger('keydown', { key: 'Escape' })

    expect(api.delete).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('关闭后把焦点归还到触发删除的按钮', async () => {
    const trigger = document.createElement('button')
    trigger.setAttribute('aria-label', '删除足迹')
    document.body.append(trigger)
    trigger.focus()
    const { wrapper } = mountModal()
    await nextTick()
    expect(document.activeElement).not.toBe(trigger)

    await wrapper.get('button[aria-label="取消删除足迹"]').trigger('click')
    wrapper.unmount()

    expect(document.activeElement).toBe(trigger)
  })
})

describe('MemoryDeleteConfirmModal 的确认', () => {
  it('确认时删除该足迹并通知父组件', async () => {
    const { wrapper, api } = mountModal()

    await confirmButton(wrapper).trigger('click')
    await flushPromises()

    expect(api.delete).toHaveBeenCalledWith('memory-1')
    expect(wrapper.emitted('deleted')).toHaveLength(1)
  })

  it('删除失败时保留弹窗并显示错误', async () => {
    const { wrapper, api } = mountModal()
    api.delete.mockRejectedValueOnce(new Error('删除足迹失败'))

    await confirmButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alertdialog"]').text()).toContain('删除足迹失败')
    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('删除进行中重复点击只发送一次请求', async () => {
    const { wrapper, api } = mountModal()
    let release: ((value: unknown) => void) | undefined
    api.delete.mockImplementation(() => new Promise((resolve) => { release = resolve }))

    await confirmButton(wrapper).trigger('click')
    await confirmButton(wrapper).trigger('click')

    expect(api.delete).toHaveBeenCalledTimes(1)

    release?.(null)
    await flushPromises()
  })

  it('删除进行中按下 Escape 不关闭弹窗', async () => {
    const { wrapper, api } = mountModal()
    let release: ((value: unknown) => void) | undefined
    api.delete.mockImplementation(() => new Promise((resolve) => { release = resolve }))

    await confirmButton(wrapper).trigger('click')
    await wrapper.get('[role="alertdialog"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toBeUndefined()

    release?.(null)
    await flushPromises()
  })
})
