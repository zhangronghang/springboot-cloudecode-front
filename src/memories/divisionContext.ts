import { ref } from 'vue'
import type { ImageListInput, ImageLocationInput } from '../api/imageApi'

export interface InformationAbilities {
  create: boolean
  update: boolean
  delete: boolean
}

export interface CityInformationScope {
  level: 'city'
  provinceCode: string
  cityCode: string
  name: string
  abilities: InformationAbilities & { create: false }
}

export interface DistrictInformationScope {
  level: 'district'
  provinceCode: string
  cityCode?: string
  districtCode: string
  name: string
  abilities: InformationAbilities & { create: true }
}

export type MemoryDivision = CityInformationScope | DistrictInformationScope

export interface CityScopeInput {
  provinceCode: string
  cityCode: string
  name: string
}

export interface DistrictScopeInput {
  provinceCode: string
  cityCode?: string
  districtCode: string
  name: string
}

const cityAbilities = { create: false, update: true, delete: true } as const
const districtAbilities = { create: true, update: true, delete: true } as const

export const createCityScope = (city: CityScopeInput): CityInformationScope => ({
  ...city,
  level: 'city',
  abilities: cityAbilities
})

export const createDirectDistrictScope = (district: DistrictScopeInput): DistrictInformationScope => ({
  ...district,
  level: 'district',
  abilities: districtAbilities
})

export const createInformationListInput = (scope: MemoryDivision, page: number, size: number): ImageListInput => scope.level === 'city'
  ? { page, size, cityCode: scope.cityCode }
  : { page, size, districtCode: scope.districtCode }

export const createUploadLocation = (scope: DistrictInformationScope): ImageLocationInput => ({
  provinceCode: scope.provinceCode,
  ...(scope.cityCode ? { cityCode: scope.cityCode } : {}),
  districtCode: scope.districtCode
})

export const createDivisionContext = (city: CityScopeInput) => {
  let cityDivision = createCityScope(city)
  const current = ref<MemoryDivision>(cityDivision)

  return {
    current,
    selectDistrict: (district: Pick<DistrictScopeInput, 'districtCode' | 'name'>) => {
      current.value = createDirectDistrictScope({
        provinceCode: cityDivision.provinceCode,
        cityCode: cityDivision.cityCode,
        ...district
      })
    },
    selectCity: () => { current.value = cityDivision },
    changeCity: (nextCity: CityScopeInput) => {
      cityDivision = createCityScope(nextCity)
      current.value = cityDivision
    }
  }
}
