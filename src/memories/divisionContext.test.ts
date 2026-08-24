import { describe, expect, it } from 'vitest'
import {
  createDirectDistrictScope,
  createDivisionContext,
  createInformationListInput,
  createUploadLocation
} from './divisionContext'

describe('足迹行政区上下文', () => {
  it('市级上下文按 cityCode 查询且只能编辑和删除', () => {
    const context = createDivisionContext({ provinceCode: '510000', cityCode: '513400', name: '凉山彝族自治州' })

    expect(context.current.value).toEqual({
      level: 'city',
      provinceCode: '510000',
      cityCode: '513400',
      name: '凉山彝族自治州',
      abilities: { create: false, update: true, delete: true }
    })
    expect(createInformationListInput(context.current.value, 2, 10)).toEqual({ page: 2, size: 10, cityCode: '513400' })
  })

  it('选择普通区县后提供完整能力和三级上传归属', () => {
    const context = createDivisionContext({ provinceCode: '510000', cityCode: '513400', name: '凉山彝族自治州' })

    context.selectDistrict({ districtCode: '513422', name: '木里藏族自治县' })

    expect(context.current.value).toEqual({
      level: 'district',
      provinceCode: '510000',
      cityCode: '513400',
      districtCode: '513422',
      name: '木里藏族自治县',
      abilities: { create: true, update: true, delete: true }
    })
    const district = context.current.value
    expect(createInformationListInput(district, 1, 10)).toEqual({ page: 1, size: 10, districtCode: '513422' })
    if (district.level !== 'district') throw new Error('选择区县后应生成区县级上下文')
    expect(createUploadLocation(district)).toEqual({
      provinceCode: '510000', cityCode: '513400', districtCode: '513422'
    })

    context.selectCity()
    expect(context.current.value.level).toBe('city')
  })

  it('直辖市区县上传时不生成 cityCode', () => {
    const district = createDirectDistrictScope({ provinceCode: '110000', districtCode: '110101', name: '东城区' })

    expect(createUploadLocation(district)).toEqual({ provinceCode: '110000', districtCode: '110101' })
    expect(district.abilities).toEqual({ create: true, update: true, delete: true })
  })

  it('路由切换到另一城市时重置为新城市足迹', () => {
    const context = createDivisionContext({ provinceCode: '510000', cityCode: '513400', name: '凉山彝族自治州' })
    context.selectDistrict({ districtCode: '513422', name: '木里藏族自治县' })

    context.changeCity({ provinceCode: '510000', cityCode: '511400', name: '眉山市' })

    expect(context.current.value).toMatchObject({ level: 'city', provinceCode: '510000', cityCode: '511400', name: '眉山市' })
  })
})
