import { describe, expect, it } from 'vitest'
import { getCountyRoute } from './countyNavigation'

describe('县级地图导航', () => {
  it('为省份中的市级编码生成稳定的县级路由', () => {
    expect(getCountyRoute('广东', '440300')).toEqual({
      name: 'county',
      params: { province: '广东', cityCode: '440300' }
    })
  })

  it('拒绝不属于省份或已经到县级的行政区编码', () => {
    expect(getCountyRoute('广东', '110101')).toBeUndefined()
    expect(getCountyRoute('北京', '110101')).toBeUndefined()
  })
})
