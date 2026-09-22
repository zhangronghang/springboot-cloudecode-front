// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import CountyDirectory from './CountyDirectory.vue'

const imageApi = vi.hoisted(() => ({ list: vi.fn(), statistics: vi.fn() }))
const countyMapLoader = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('../api/imageApi', () => ({ imageApi }))
vi.mock('../data/countyMaps', () => ({ countyMapLoader }))

const countyMap = (codes: number[]) => ({
  type: 'FeatureCollection' as const,
  features: codes.map((adcode, index) => ({
    properties: { adcode, name: adcode === 513422 ? '木里藏族自治县' : `区县${adcode}` },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[101 + index, 27], [102 + index, 27], [102 + index, 28], [101 + index, 27]]]
    }
  }))
})

const emptyStatistics = { footprintCount: 0, imageCount: 0, districts: [], months: [], tags: [] }

const mountCounty = async (cityCode = '513400') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'atlas', component: { template: '<div />' } },
      { path: '/province/:name', name: 'province', component: { template: '<div />' } },
      { path: '/province/:province/city/:cityCode', name: 'county', component: CountyDirectory }
    ]
  })
  await router.push(`/province/四川/city/${cityCode}`)
  await router.isReady()
  const wrapper = mount(CountyDirectory, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const openDrawer = async (wrapper: VueWrapper) => {
  await wrapper.get('.statistics-toggle').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  imageApi.list.mockResolvedValue({ total: 0, page: 1, size: 10, records: [] })
  imageApi.statistics.mockResolvedValue(emptyStatistics)
  countyMapLoader.load.mockResolvedValue(countyMap([513422]))
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('区县地图页统计入口', () => {
  it('县级地图加载中时入口已经存在', async () => {
    countyMapLoader.load.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountCounty()

    expect(wrapper.find('.map-status').exists()).toBe(true)
    expect(wrapper.find('.statistics-toggle').exists()).toBe(true)
  })

  it('县级地图加载失败时仍可打开统计抽屉', async () => {
    countyMapLoader.load.mockRejectedValue(new Error('地图数据不可用'))
    const { wrapper } = await mountCounty()

    expect(wrapper.get('.map-status').text()).toContain('重新加载')
    await openDrawer(wrapper)

    expect(wrapper.find('.statistics-drawer').exists()).toBe(true)
  })

  it('入口暴露用途说明与展开状态', async () => {
    const { wrapper } = await mountCounty()
    const toggle = wrapper.get('.statistics-toggle')

    expect(toggle.attributes('aria-label')).toBe('查看凉山彝族自治州足迹统计')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await openDrawer(wrapper)

    expect(wrapper.get('.statistics-toggle').attributes('aria-expanded')).toBe('true')
  })

  it('再次点击入口关闭抽屉', async () => {
    const { wrapper } = await mountCounty()
    await openDrawer(wrapper)
    expect(wrapper.find('.statistics-drawer').exists()).toBe(true)

    await wrapper.get('.statistics-toggle').trigger('click')

    expect(wrapper.find('.statistics-drawer').exists()).toBe(false)
  })

  it('不可下钻到区县的市级路由不渲染统计入口', async () => {
    const { wrapper } = await mountCounty('513401')

    expect(wrapper.get('.not-found').text()).toContain('当前已到县级')
    expect(wrapper.find('.statistics-toggle').exists()).toBe(false)
  })
})

const visitedStatistics = (districtCode: string) => ({
  footprintCount: 3,
  imageCount: 4,
  districts: [{
    provinceCode: '510000',
    cityCode: '513400',
    districtCode,
    footprintCount: 3,
    imageCount: 4,
    lastVisitedAt: '2026-09-02'
  }],
  months: [],
  tags: []
})

describe('统计抽屉与地图联动', () => {
  it('抽屉打开时点击地图区县仍能完成选中且抽屉保持打开', async () => {
    const { wrapper } = await mountCounty()
    await openDrawer(wrapper)

    await wrapper.get('path.county-shape').trigger('click')
    await flushPromises()

    expect(wrapper.find('.statistics-drawer').exists()).toBe(true)
    expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
    expect(wrapper.get('path.county-shape').classes()).toContain('is-active')
    expect(imageApi.list).toHaveBeenLastCalledWith({ page: 1, size: 10, districtCode: '513422' })
  })

  it('点击排行项关闭抽屉并在地图上选中该区县', async () => {
    imageApi.statistics.mockResolvedValue(visitedStatistics('513422'))
    const { wrapper } = await mountCounty()
    expect(imageApi.list).toHaveBeenLastCalledWith({ page: 1, size: 10, cityCode: '513400' })

    await openDrawer(wrapper)
    await wrapper.get('.statistics-ranking-item').trigger('click')
    await flushPromises()

    expect(wrapper.find('.statistics-drawer').exists()).toBe(false)
    expect(wrapper.get('path.county-shape').classes()).toContain('is-active')
    expect(imageApi.list).toHaveBeenLastCalledWith({ page: 1, size: 10, districtCode: '513422' })
  })

  it('地图缺少该行政区编码时关闭抽屉、不报错也不改变原有选中', async () => {
    imageApi.statistics.mockResolvedValue(visitedStatistics('513422'))
    const { wrapper } = await mountCounty()
    await wrapper.get('path.county-shape').trigger('click')
    await flushPromises()
    expect(imageApi.list).toHaveBeenLastCalledWith({ page: 1, size: 10, districtCode: '513422' })

    await openDrawer(wrapper)
    const unvisited = wrapper.get('.statistics-unvisited-item')
    expect(unvisited.text()).toBe('西昌市')
    await unvisited.trigger('click')
    await flushPromises()

    expect(wrapper.find('.statistics-drawer').exists()).toBe(false)
    expect(imageApi.list).toHaveBeenLastCalledWith({ page: 1, size: 10, districtCode: '513422' })
    expect(wrapper.get('path.county-shape').classes()).toContain('is-active')
  })

  it('抽屉打开期间切换到其他市时关闭抽屉并丢弃旧数据', async () => {
    const { wrapper, router } = await mountCounty('513400')
    await openDrawer(wrapper)
    expect(wrapper.find('.statistics-drawer').exists()).toBe(true)

    await router.push('/province/四川/city/510100')
    await flushPromises()

    expect(wrapper.find('.statistics-drawer').exists()).toBe(false)

    await openDrawer(wrapper)

    expect(imageApi.statistics).toHaveBeenLastCalledWith({ cityCode: '510100' })
  })
})
