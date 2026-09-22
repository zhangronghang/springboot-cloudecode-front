import { describe, expect, it } from 'vitest'
import { buildTagDisplay } from './tags'

describe('标签展示结构', () => {
  it('按次数降序排列并给出相对于最高次数的比例', () => {
    expect(buildTagDisplay([{ tag: '自驾', count: 4 }, { tag: '风景', count: 9 }, { tag: '美食', count: 2 }]))
      .toEqual([
        { tag: '风景', count: 9, ratio: 1 },
        { tag: '自驾', count: 4, ratio: 4 / 9 },
        { tag: '美食', count: 2, ratio: 2 / 9 }
      ])
  })

  it('次数相同时按标签字典序升序', () => {
    expect(buildTagDisplay([{ tag: 'b', count: 1 }, { tag: 'a', count: 1 }]).map((entry) => entry.tag))
      .toEqual(['a', 'b'])
  })

  it('没有用户标签时返回空数组', () => {
    expect(buildTagDisplay([])).toEqual([])
  })
})
