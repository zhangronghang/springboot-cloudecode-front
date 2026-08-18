import { describe, expect, it } from 'vitest'
import chinaMap from '@svg-maps/china'
import { canDrillDownToCounty, findCity, findProvince, formatProvinceLabel, provinceDirectory, provinceMapNames } from './china'

describe('省市目录', () => {
  it('包含全部省级行政区且名称不重复', () => {
    expect(provinceDirectory).toHaveLength(34)
    expect(new Set(provinceDirectory.map((item) => item.name)).size).toBe(34)
  })

  it('能按地图点击传入的省份名称返回城市列表', () => {
    expect(findProvince('广东')).toMatchObject({
      name: '广东',
      cities: expect.arrayContaining([
        expect.objectContaining({ code: '440100', name: '广州市' }),
        expect.objectContaining({ code: '440300', name: '深圳市' })
      ])
    })
  })

  it('为离线地图中的每个省份轮廓提供中文导航名称', () => {
    expect(chinaMap.locations.every((location: { id: string }) => provinceMapNames[location.id])).toBe(true)
  })

  it('将地图轮廓标识转换为页面中显示的省份名称', () => {
    expect(formatProvinceLabel('xinjiang-uygur')).toBe('新疆')
  })

  it('保留市级编码以构造稳定的县级地图路由', () => {
    expect(findCity('广东', '440300')).toMatchObject({ code: '440300', name: '深圳市' })
    expect(findCity('广东', '999999')).toBeUndefined()
  })

  it('仅允许仍有下级行政区的市级区域继续下钻', () => {
    expect(canDrillDownToCounty('440300')).toBe(true)
    expect(canDrillDownToCounty('110101')).toBe(false)
  })
})
