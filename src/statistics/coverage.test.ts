import { describe, expect, it } from 'vitest'
import { summarizeCoverage } from './coverage'

describe('区县覆盖率', () => {
  it('用区划表区县总数作分母、与统计编码求交集作分子', () => {
    expect(summarizeCoverage('513400', ['513401', '513402', '513422', '513423', '513424']))
      .toEqual({ visitedCount: 5, totalCount: 17, percentage: 29 })
  })

  it('剔除不在区划表内的编码且不改变分母', () => {
    expect(summarizeCoverage('513400', ['513401', '999999']))
      .toEqual({ visitedCount: 1, totalCount: 17, percentage: 6 })
  })

  it('重复编码只计一次', () => {
    expect(summarizeCoverage('513400', ['513401', '513401', '513401']))
      .toEqual({ visitedCount: 1, totalCount: 17, percentage: 6 })
  })

  it('区划表没有下级行政区时返回零覆盖率而不是除零', () => {
    expect(summarizeCoverage('999999', ['513401']))
      .toEqual({ visitedCount: 0, totalCount: 0, percentage: 0 })
  })
})
