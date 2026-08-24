// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import CityDirectory from './CityDirectory.vue'
import CountyDirectory from './CountyDirectory.vue'

const imageApi = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), upload: vi.fn(), update: vi.fn(), delete: vi.fn() }))
const countyMapLoader = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('../api/imageApi', () => ({ imageApi }))
vi.mock('../data/countyMaps', () => ({ countyMapLoader }))

const countyMap = {
  type: 'FeatureCollection' as const,
  features: [{
    properties: { adcode: 513422, name: '木里藏族自治县' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[101, 27], [102, 27], [102, 28], [101, 27]]]
    }
  }]
}

beforeEach(() => {
  vi.clearAllMocks()
  imageApi.list.mockResolvedValue({ total: 0, page: 1, size: 10, records: [] })
  countyMapLoader.load.mockResolvedValue(countyMap)
})

describe('普通省市区县信息数据流', () => {
  it('普通省级页面不展示信息面板', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/province/:name', name: 'province', component: CityDirectory }]
    })
    await router.push('/province/四川')
    await router.isReady()

    const wrapper = mount(CityDirectory, {
      global: {
        plugins: [router],
        stubs: { ProvinceCityMap: { template: '<div class="province-map-stub" />' } }
      }
    })

    expect(wrapper.find('.province-map-stub').exists()).toBe(true)
    expect(wrapper.find('.memory-panel').exists()).toBe(false)
  })

  it('市级页面按 cityCode 查询并在选择区县后改按 districtCode 查询', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'atlas', component: { template: '<div />' } },
        { path: '/province/:name', name: 'province', component: { template: '<div />' } },
        { path: '/province/:province/city/:cityCode', name: 'county', component: CountyDirectory }
      ]
    })
    await router.push('/province/四川/city/513400')
    await router.isReady()

    const wrapper = mount(CountyDirectory, { global: { plugins: [router] } })
    await flushPromises()

    expect(imageApi.list).toHaveBeenCalledWith({ page: 1, size: 10, cityCode: '513400' })
    expect(wrapper.find('.memory-heading .memory-action').exists()).toBe(false)

    await wrapper.get('path.county-shape').trigger('click')
    await flushPromises()

    expect(imageApi.list).toHaveBeenLastCalledWith({ page: 1, size: 10, districtCode: '513422' })
    expect(wrapper.get('.memory-heading .memory-action').text()).toBe('上传照片')
  })
})

describe('直辖市区县信息数据流', () => {
  it('选择直辖市区县后直接进入无 cityCode 的可编辑状态', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/province/:name', name: 'province', component: CityDirectory }]
    })
    await router.push('/province/北京')
    await router.isReady()

    const wrapper = mount(CityDirectory, {
      global: {
        plugins: [router],
        stubs: {
          ProvinceCityMap: {
            emits: ['select'],
            template: '<button class="direct-district" @click="$emit(\'select\', { code: \'110101\', name: \'东城区\' })">东城区</button>'
          }
        }
      }
    })
    expect(wrapper.find('.memory-panel').exists()).toBe(false)
    expect(imageApi.list).not.toHaveBeenCalled()

    await wrapper.get('.direct-district').trigger('click')
    await flushPromises()

    expect(imageApi.list).toHaveBeenCalledWith({ page: 1, size: 10, districtCode: '110101' })
    expect(wrapper.get('.memory-heading .memory-action').text()).toBe('上传照片')
    expect(countyMapLoader.load).not.toHaveBeenCalled()
  })

  it('取消选择或切换省份时清除直辖市区县信息上下文', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/province/:name', name: 'province', component: CityDirectory }]
    })
    await router.push('/province/北京')
    await router.isReady()

    const wrapper = mount(CityDirectory, {
      global: {
        plugins: [router],
        stubs: {
          ProvinceCityMap: {
            emits: ['select'],
            template: '<button class="direct-district" @click="$emit(\'select\', { code: \'110101\', name: \'东城区\' })">东城区</button>'
          }
        }
      }
    })

    await wrapper.get('.direct-district').trigger('click')
    await flushPromises()
    expect(wrapper.find('.memory-panel').exists()).toBe(true)

    await wrapper.get('.clear-district-selection').trigger('click')
    expect(wrapper.find('.memory-panel').exists()).toBe(false)

    await wrapper.get('.direct-district').trigger('click')
    await flushPromises()
    await router.push('/province/上海')
    await flushPromises()

    expect(wrapper.find('.memory-panel').exists()).toBe(false)
  })

  it('从一个直辖市区县切换到另一区县时重新查询新作用域', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/province/:name', name: 'province', component: CityDirectory }]
    })
    await router.push('/province/北京')
    await router.isReady()

    const wrapper = mount(CityDirectory, {
      global: {
        plugins: [router],
        stubs: {
          ProvinceCityMap: {
            emits: ['select'],
            template: `<div>
              <button class="east-district" @click="$emit('select', { code: '110101', name: '东城区' })">东城区</button>
              <button class="west-district" @click="$emit('select', { code: '110102', name: '西城区' })">西城区</button>
            </div>`
          }
        }
      }
    })

    await wrapper.get('.east-district').trigger('click')
    await flushPromises()
    expect(imageApi.list).toHaveBeenLastCalledWith({ page: 1, size: 10, districtCode: '110101' })

    await wrapper.get('.west-district').trigger('click')
    await flushPromises()

    expect(imageApi.list).toHaveBeenLastCalledWith({ page: 1, size: 10, districtCode: '110102' })
    expect(wrapper.get('#memory-title').text()).toContain('西城区')
  })
})
