// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProvinceCityMap from './ProvinceCityMap.vue'

const validMunicipalityMap = {
  type: 'FeatureCollection',
  features: [{
    properties: { adcode: 110101, name: '东城区' },
    geometry: { type: 'Polygon', coordinates: [[[116, 39], [117, 39], [117, 40], [116, 39]]] }
  }]
}
const loadProvinceMap = vi.hoisted(() => vi.fn())
vi.mock('../data/provinceMaps', () => ({ getProvinceMapLoader: () => loadProvinceMap }))

beforeEach(() => {
  loadProvinceMap.mockReset()
  loadProvinceMap.mockResolvedValue(validMunicipalityMap)
})

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

  it('只有省级轮廓而没有下级行政区时展示区域不可用提示', async () => {
    loadProvinceMap.mockResolvedValue({
      type: 'FeatureCollection',
      features: [{
        properties: { adcode: 710000, name: '台湾省' },
        geometry: { type: 'Polygon', coordinates: [[[120, 22], [122, 22], [122, 25], [120, 22]]] }
      }]
    })

    const wrapper = mount(ProvinceCityMap, { props: { provinceCode: '710000' } })
    await flushPromises()

    expect(wrapper.get('.map-status').text()).toBe('暂时无法获取该区域信息')
    expect(wrapper.find('.province-city-map').exists()).toBe(false)
  })
})
