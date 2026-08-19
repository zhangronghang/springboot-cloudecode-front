import { describe, expect, it } from 'vitest'
import { createDivisionContext } from './divisionContext'

describe('足迹行政区上下文', () => {
  it('在区县被选中时切换足迹归属和标题', () => {
    const context = createDivisionContext({ code: '513400', name: '凉山彝族自治州' })
    expect(context.current.value).toEqual({ level: 'city', code: '513400', name: '凉山彝族自治州' })

    context.selectCounty({ code: '513422', name: '木里藏族自治县' })
    expect(context.current.value).toEqual({ level: 'county', code: '513422', name: '木里藏族自治县' })

    context.selectCity()
    expect(context.current.value).toEqual({ level: 'city', code: '513400', name: '凉山彝族自治州' })
  })

  it('路由切换到另一城市时重置为新城市足迹', () => {
    const context = createDivisionContext({ code: '513400', name: '凉山彝族自治州' })
    context.selectCounty({ code: '513422', name: '木里藏族自治县' })

    context.changeCity({ code: '511400', name: '眉山市' })

    expect(context.current.value).toEqual({ level: 'city', code: '511400', name: '眉山市' })
  })
})
