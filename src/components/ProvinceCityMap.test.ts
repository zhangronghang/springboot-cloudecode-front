// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ProvinceCityMap from './ProvinceCityMap.vue'

const loadProvinceMap = vi.hoisted(() => vi.fn().mockResolvedValue({
  type: 'FeatureCollection',
  features: [{
    properties: { adcode: 110101, name: '东城区' },
    geometry: { type: 'Polygon', coordinates: [[[116, 39], [117, 39], [117, 40], [116, 39]]] }
  }]
}))
vi.mock('../data/provinceMaps', () => ({ getProvinceMapLoader: () => loadProvinceMap }))

describe('省级下级行政区地图选择', () => {
  it('直辖市区县支持鼠标和键盘选择', async () => {
    const wrapper = mount(ProvinceCityMap, { props: { provinceCode: '110000' } })
    await flushPromises()
    const district = wrapper.get('path.city-shape')

    expect(district.attributes('role')).toBe('button')
    await district.trigger('click')
    await district.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('select')).toEqual([
      [{ code: '110101', name: '东城区' }],
      [{ code: '110101', name: '东城区' }]
    ])
  })
})
