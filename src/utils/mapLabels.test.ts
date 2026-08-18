import { describe, expect, it } from 'vitest'
import { createContainedMapLabel } from './mapLabels'

describe('地图标签定位', () => {
  it('将凹形区域的标签移动到轮廓内部，并缩小到可容纳的尺寸', () => {
    const label = createContainedMapLabel({
      id: 'gansu',
      name: '甘肃',
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      contains: (x, y) => x >= 0 && x <= 36 && y >= 40 && y <= 60
    })

    expect(label).toBeDefined()
    if (!label) throw new Error('预期凹形区域存在可容纳标签的位置')
    const halfWidth = label.name.length * label.fontSize / 2
    const halfHeight = label.fontSize * 0.45
    expect(label.x - halfWidth).toBeGreaterThanOrEqual(0)
    expect(label.x + halfWidth).toBeLessThanOrEqual(36)
    expect(label.y - halfHeight).toBeGreaterThanOrEqual(40)
    expect(label.y + halfHeight).toBeLessThanOrEqual(60)
    expect(label.fontSize).toBeLessThanOrEqual(14)
  })
})
