import { canDrillDownToCounty, findCity } from '../data/china'

export const getCountyRoute = (province: string, cityCode: string) => {
  if (!findCity(province, cityCode) || !canDrillDownToCounty(cityCode)) return undefined
  return {
    name: 'county',
    params: { province, cityCode }
  }
}
