import { getDivisionChildren, getTopDivisions, isFinalDivision } from '@aurouscia/china-areas/dist/index.js'

export interface AdministrativeDivision {
  code: string
  name: string
}

export interface Province {
  code: string
  name: string
  fullName: string
  cities: AdministrativeDivision[]
}

const suffix = /(?:省|市|自治区|特别行政区)$/
const normalizeName = (name: string) => name.replace(suffix, '')
const directMunicipalityCodes = new Set(['110000', '120000', '310000', '500000'])

export const provinceDirectory: Province[] = getTopDivisions().map((division) => ({
  code: division.code,
  name: normalizeName(division.name),
  fullName: division.name,
  cities: getDivisionChildren(division.code).map((city) => ({ code: city.code, name: city.name }))
}))

export const findProvince = (name: string) =>
  provinceDirectory.find((province) => province.name === normalizeName(name))

export const findCity = (provinceName: string, cityCode: string) =>
  findProvince(provinceName)?.cities.find((city) => city.code === cityCode)

export const findDistrict = (cityCode: string, districtCode: string) =>
  getDivisionChildren(cityCode).find((district) => district.code === districtCode)

export const canDrillDownToCounty = (divisionCode: string) =>
  divisionCode.endsWith('00') && !isFinalDivision(divisionCode)

export const isDirectMunicipality = (provinceCode: string) =>
  directMunicipalityCodes.has(provinceCode)

export const provinceMapNames: Record<string, string> = {
  anhui: '安徽', beijing: '北京', chongqing: '重庆', fujian: '福建', gansu: '甘肃',
  guangdong: '广东', 'guangxi-zhuang': '广西', guizhou: '贵州', hainan: '海南', hebei: '河北',
  heilongjiang: '黑龙江', henan: '河南', 'hong-kong': '香港', hubei: '湖北', hunan: '湖南',
  jiangsu: '江苏', jiangxi: '江西', jilin: '吉林', liaoning: '辽宁', macau: '澳门',
  'nei-mongol': '内蒙古', 'ningxia-hui': '宁夏', quinghai: '青海', shaanxi: '陕西',
  shandong: '山东', shanghai: '上海', shanxi: '山西', sichuan: '四川',
  tianjin: '天津', 'xinjiang-uygur': '新疆', xizang: '西藏', yunnan: '云南', zhejiang: '浙江'
}

export const formatProvinceLabel = (mapId: string) => provinceMapNames[mapId] ?? ''
