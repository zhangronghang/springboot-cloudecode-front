import { describe, expect, it } from 'vitest'
import { getProvinceMapLoader } from './provinceMaps'

describe('省级市界资源', () => {
  it('为青海省提供可离线加载的市级边界资源', async () => {
    const map = await getProvinceMapLoader('630000')?.()

    expect(map?.features).toHaveLength(8)
    expect(map?.features.map((feature) => feature.properties.name)).toContain('西宁市')
  })

  it('为未知行政区返回不可用状态', () => {
    expect(getProvinceMapLoader('999999')).toBeUndefined()
  })

  it('为直辖市提供下级行政区边界资源', async () => {
    const map = await getProvinceMapLoader('110000')?.()

    expect(map?.features.map((feature) => feature.properties.name)).toContain('东城区')
  })
})
