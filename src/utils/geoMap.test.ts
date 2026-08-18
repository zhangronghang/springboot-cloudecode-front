import { describe, expect, it } from 'vitest'
import { createMapPaths } from './geoMap'

describe('GeoJSON 地图路径', () => {
  it('将行政区多边形转换为 SVG 路径和标注坐标', () => {
    const map = createMapPaths({
      type: 'FeatureCollection',
      features: [{
        properties: { adcode: 1, name: '测试市', center: [5, 5] },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] }
      }]
    })

    expect(map.paths).toHaveLength(1)
    expect(map.paths[0]).toMatchObject({ name: '测试市', labelX: 500, labelY: 500, fontSize: expect.any(Number) })
    expect(map.paths[0].d).toContain('M')
  })

  it('在凹形行政区中不采用落在轮廓外的中心点作为标签位置', () => {
    const map = createMapPaths({
      type: 'FeatureCollection',
      features: [{
        properties: { adcode: 1, name: '乌兰察布市', center: [4, 4] },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [8, 0], [8, 1], [1, 1], [1, 8], [0, 8], [0, 0]]] }
      }]
    })

    expect(map.paths[0]).not.toMatchObject({ labelX: 500, labelY: 500 })
  })

  it('在县级紧凑模式下保留较小区域的标签', () => {
    const map = createMapPaths({
      type: 'FeatureCollection',
      features: [
        {
          properties: { adcode: 1, name: '合江县', center: [3, 3] },
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [6, 0], [6, 6], [0, 6], [0, 0]]] }
        },
        {
          properties: { adcode: 2, name: '大区', center: [50, 50] },
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]] }
        }
      ]
    })

    expect(map.paths[0]).toMatchObject({ fontSize: 13, showLabel: true })
  })
})
