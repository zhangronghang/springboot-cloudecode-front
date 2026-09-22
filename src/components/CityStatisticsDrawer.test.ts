// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDivisionChildren } from '@aurouscia/china-areas/dist/index.js'
import type { CityStatistics } from '../api/imageTypes'
import CityStatisticsDrawer from './CityStatisticsDrawer.vue'

const imageApi = vi.hoisted(() => ({ statistics: vi.fn() }))
vi.mock('../api/imageApi', () => ({ imageApi }))

const emptyStatistics = { footprintCount: 0, imageCount: 0, districts: [], months: [], tags: [] }

const keydown = (key: string) => new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

const mountDrawer = async () => {
  const wrapper = mount(CityStatisticsDrawer, {
    attachTo: document.body,
    props: { cityCode: '513400', cityName: '凉山彝族自治州' }
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  imageApi.statistics.mockResolvedValue(emptyStatistics)
})

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

describe('统计抽屉外壳', () => {
  it('打开时把焦点移入抽屉', async () => {
    const wrapper = await mountDrawer()

    expect(document.activeElement).toBe(wrapper.get('.statistics-drawer').element)
  })

  it('按 ESC 关闭抽屉', async () => {
    const wrapper = await mountDrawer()

    document.body.dispatchEvent(keydown('Escape'))

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('点击关闭按钮关闭抽屉', async () => {
    const wrapper = await mountDrawer()

    await wrapper.get('.statistics-close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('关闭后把焦点归还给打开抽屉的入口按钮', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const wrapper = await mountDrawer()
    expect(document.activeElement).not.toBe(trigger)

    wrapper.unmount()

    expect(document.activeElement).toBe(trigger)
  })

  it('是非模态浮层：不渲染遮罩也不锁定页面滚动', async () => {
    document.body.style.overflow = 'auto'
    const wrapper = await mountDrawer()

    expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('auto')
  })

  it('不把 Tab 焦点限制在抽屉内部', async () => {
    await mountDrawer()
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    const event = keydown('Tab')

    document.body.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(outside)
  })
})

 const visitedCodes = ['513401', '513402', '513422', '513423', '513424']

const statistics = (overrides: Partial<CityStatistics> = {}): CityStatistics => ({
  footprintCount: 7,
  imageCount: 12,
  districts: visitedCodes.map((districtCode, index) => ({
    provinceCode: '510000',
    cityCode: '513400',
    districtCode,
    footprintCount: index === 0 ? 3 : 1,
    imageCount: index === 0 ? 4 : 2,
    lastVisitedAt: '2026-08-19'
  })),
  months: [],
  tags: [],
  ...overrides
})

const metricValue = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('.statistics-metric')
    .find((metric) => metric.get('.metric-label').text() === label)!
    .get('.metric-value').text()

describe('统计抽屉概览', () => {
  it('渲染足迹数、图片总数、打卡区县数与覆盖率', async () => {
    imageApi.statistics.mockResolvedValue(statistics())
    const wrapper = await mountDrawer()

    expect(metricValue(wrapper, '足迹数')).toBe('7')
    expect(metricValue(wrapper, '图片总数')).toBe('12')
    expect(metricValue(wrapper, '打卡区县数')).toBe('5')
    expect(metricValue(wrapper, '区县覆盖率')).toBe('29%')
  })

  it('显示统计范围为当前市与其区县总数', async () => {
    imageApi.statistics.mockResolvedValue(statistics())
    const wrapper = await mountDrawer()

    expect(wrapper.get('.statistics-scope').text()).toContain('凉山彝族自治州')
    expect(wrapper.get('.statistics-scope').text()).toContain('17 个区县')
  })

  it('统计响应含区划表之外的编码时不抬高打卡区县数', async () => {
    imageApi.statistics.mockResolvedValue(statistics({
      districts: [
        { provinceCode: '510000', cityCode: '513400', districtCode: '999999', footprintCount: 4, imageCount: 4, lastVisitedAt: '2026-08-19' }
      ]
    }))
    const wrapper = await mountDrawer()

    expect(metricValue(wrapper, '打卡区县数')).toBe('0')
    expect(metricValue(wrapper, '区县覆盖率')).toBe('0%')
  })
})

const coverageWidth = (wrapper: VueWrapper) =>
  (wrapper.get('.statistics-coverage-fill').element as HTMLElement).style.width

describe('统计抽屉覆盖率进度条', () => {
  it('填充宽度与覆盖率百分比一致', async () => {
    imageApi.statistics.mockResolvedValue(statistics())
    const wrapper = await mountDrawer()

    expect(coverageWidth(wrapper)).toBe('29%')
    expect(wrapper.get('.statistics-coverage').attributes('aria-label')).toContain('29%')
  })

  it('没有足迹时渲染空进度条而不是隐藏区块', async () => {
    imageApi.statistics.mockResolvedValue(statistics({ footprintCount: 0, imageCount: 0, districts: [] }))
    const wrapper = await mountDrawer()

    expect(wrapper.find('.statistics-coverage').exists()).toBe(true)
    expect(coverageWidth(wrapper)).toBe('0%')
  })
})

describe('统计抽屉区县列表', () => {
  it('排行按足迹数降序展示区县名与足迹数', async () => {
    imageApi.statistics.mockResolvedValue(statistics())
    const wrapper = await mountDrawer()

    expect(wrapper.findAll('.statistics-ranking-item .statistics-row-name').map((node) => node.text()))
      .toEqual(['西昌市', '会理市', '木里藏族自治县', '盐源县', '德昌县'])
    expect(wrapper.findAll('.statistics-ranking-item .statistics-row-count').map((node) => node.text()))
      .toEqual(['3', '1', '1', '1', '1'])
  })

  it('点击排行项抛出该区县编码', async () => {
    imageApi.statistics.mockResolvedValue(statistics())
    const wrapper = await mountDrawer()

    await wrapper.findAll('.statistics-ranking-item')[2].trigger('click')

    expect(wrapper.emitted('select')).toEqual([['513422']])
  })

  it('未打卡清单列出区划表内没有足迹的区县并可点击', async () => {
    imageApi.statistics.mockResolvedValue(statistics())
    const wrapper = await mountDrawer()
    const items = wrapper.findAll('.statistics-unvisited-item')

    expect(items).toHaveLength(12)
    expect(items[0].text()).toBe('会东县')

    await items[0].trigger('click')

    expect(wrapper.emitted('select')).toEqual([['513426']])
  })

  it('全部区县都已打卡时显示完成态而不是空列表', async () => {
    imageApi.statistics.mockResolvedValue(statistics({
      districts: getDivisionChildren('513400').map((division) => ({
        provinceCode: '510000',
        cityCode: '513400',
        districtCode: division.code,
        footprintCount: 1,
        imageCount: 1,
        lastVisitedAt: '2026-08-19'
      }))
    }))
    const wrapper = await mountDrawer()

    expect(wrapper.findAll('.statistics-unvisited-item')).toHaveLength(0)
    expect(wrapper.get('.statistics-unvisited').text()).toContain('全部区县都已打卡')
  })
})

const monthCells = (wrapper: VueWrapper) => wrapper.findAll('.statistics-month-cell')
const barHeight = (cell: ReturnType<typeof monthCells>[number]) =>
  (cell.get('.statistics-month-bar').element as HTMLElement).style.height

describe('统计抽屉月份热力条', () => {
  it('把最早与最晚月份之间的空档补齐为连续格子', async () => {
    imageApi.statistics.mockResolvedValue(statistics({
      months: [{ month: '2026-06', footprintCount: 2 }, { month: '2026-09', footprintCount: 1 }]
    }))
    const wrapper = await mountDrawer()
    const cells = monthCells(wrapper)

    expect(cells).toHaveLength(4)
    expect(cells.map((cell) => cell.attributes('data-month')))
      .toEqual(['2026-06', '2026-07', '2026-08', '2026-09'])
    expect(cells.map((cell) => cell.attributes('aria-label'))).toEqual([
      '2026-06 共 2 条足迹',
      '2026-07 共 0 条足迹',
      '2026-08 共 0 条足迹',
      '2026-09 共 1 条足迹'
    ])
  })

  it('零足迹月份与有足迹月份在视觉上可区分', async () => {
    imageApi.statistics.mockResolvedValue(statistics({
      months: [{ month: '2026-06', footprintCount: 2 }, { month: '2026-09', footprintCount: 1 }]
    }))
    const wrapper = await mountDrawer()
    const cells = monthCells(wrapper)

    expect(cells[0].classes()).not.toContain('is-empty')
    expect(cells[1].classes()).toContain('is-empty')
    expect(cells.map(barHeight)).toEqual(['100%', '0%', '0%', '50%'])
  })
})

describe('统计抽屉标签区块', () => {
  it('按次数降序渲染标签、次数与相对条宽', async () => {
    imageApi.statistics.mockResolvedValue(statistics({
      tags: [{ tag: '自驾', count: 4 }, { tag: '风景', count: 9 }]
    }))
    const wrapper = await mountDrawer()
    const items = wrapper.findAll('.statistics-tag-item')

    expect(items.map((item) => item.get('.statistics-row-name').text())).toEqual(['风景', '自驾'])
    expect(items.map((item) => item.get('.statistics-row-count').text())).toEqual(['9', '4'])
    expect(items.map((item) => (item.get('.statistics-tag-bar').element as HTMLElement).style.width))
      .toEqual(['100%', '44%'])
  })

  it('没有用户标签时显示空态提示而不是空区块', async () => {
    imageApi.statistics.mockResolvedValue(statistics({ tags: [] }))
    const wrapper = await mountDrawer()

    expect(wrapper.findAll('.statistics-tag-item')).toHaveLength(0)
    expect(wrapper.get('.statistics-tags').text()).toContain('还没有用户标签')
  })
})

describe('统计抽屉加载与异常状态', () => {
  it('请求进行中显示加载态而不是空数值', async () => {
    imageApi.statistics.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountDrawer()

    expect(wrapper.get('.statistics-status').text()).toContain('正在汇总')
    expect(wrapper.find('.statistics-overview').exists()).toBe(false)
  })

  it('失败时显示错误、重新加载，且不残留任何统计数值', async () => {
    imageApi.statistics.mockRejectedValueOnce(new Error('统计服务不可用'))
    imageApi.statistics.mockResolvedValueOnce(statistics())
    const wrapper = await mountDrawer()

    expect(wrapper.get('.statistics-status').text()).toContain('统计加载失败')
    expect(wrapper.find('.statistics-metric').exists()).toBe(false)

    await wrapper.get('.statistics-retry').trigger('click')
    await flushPromises()

    expect(imageApi.statistics).toHaveBeenCalledTimes(2)
    expect(metricValue(wrapper, '足迹数')).toBe('7')
    expect(wrapper.find('.statistics-status').exists()).toBe(false)
  })

  it('每次打开抽屉都重新请求统计', async () => {
    const first = await mountDrawer()
    expect(imageApi.statistics).toHaveBeenCalledWith({ cityCode: '513400' })
    first.unmount()

    const second = await mountDrawer()

    expect(imageApi.statistics).toHaveBeenCalledTimes(2)
    second.unmount()
  })
})

describe('统计抽屉空数据态', () => {
  it('该市还没有足迹时展示全 0 概览、0% 覆盖率与完整未打卡清单', async () => {
    imageApi.statistics.mockResolvedValue(statistics({
      footprintCount: 0,
      imageCount: 0,
      districts: [],
      months: [],
      tags: []
    }))
    const wrapper = await mountDrawer()

    expect(metricValue(wrapper, '足迹数')).toBe('0')
    expect(metricValue(wrapper, '图片总数')).toBe('0')
    expect(metricValue(wrapper, '打卡区县数')).toBe('0')
    expect(metricValue(wrapper, '区县覆盖率')).toBe('0%')
    expect(wrapper.findAll('.statistics-ranking-item')).toHaveLength(0)
    expect(wrapper.findAll('.statistics-unvisited-item')).toHaveLength(17)
    expect(wrapper.find('.statistics-months').exists()).toBe(true)
    expect(wrapper.findAll('.statistics-month-cell')).toHaveLength(0)
    expect(wrapper.find('.statistics-status').exists()).toBe(false)
  })
})
