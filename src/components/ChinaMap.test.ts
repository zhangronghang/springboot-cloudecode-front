// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import ChinaMap from './ChinaMap.vue'

beforeAll(() => {
  Object.defineProperty(SVGGraphicsElement.prototype, 'getBBox', {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 100, height: 100 })
  })
  Object.defineProperty(SVGGeometryElement.prototype, 'isPointInFill', {
    configurable: true,
    value: () => true
  })
})

describe('中国省级行政区地图', () => {
  it('台湾轮廓支持鼠标和键盘选择', async () => {
    const wrapper = mount(ChinaMap)
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-province-id="taiwan"]').exists()).toBe(true))

    const taiwan = wrapper.get('[data-province-id="taiwan"]')

    await taiwan.trigger('click')
    await taiwan.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('select')).toEqual([['台湾'], ['台湾']])
  })
})
