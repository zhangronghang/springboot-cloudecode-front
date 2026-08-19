import { ref } from 'vue'

export interface NamedDivision {
  code: string
  name: string
}

export interface MemoryDivision extends NamedDivision {
  level: 'city' | 'county'
}

export const createDivisionContext = (city: NamedDivision) => {
  let cityDivision: MemoryDivision = { ...city, level: 'city' }
  const current = ref<MemoryDivision>(cityDivision)
  return {
    current,
    selectCounty: (county: NamedDivision) => { current.value = { ...county, level: 'county' } },
    selectCity: () => { current.value = cityDivision },
    changeCity: (nextCity: NamedDivision) => {
      cityDivision = { ...nextCity, level: 'city' }
      current.value = cityDivision
    }
  }
}
