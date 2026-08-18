import type { GeoFeature, ProvinceGeoMap } from './provinceMaps'

export class CountyMapLoadError extends Error {
  constructor() {
    super('县级地图数据暂不可用')
    this.name = 'CountyMapLoadError'
  }
}

const isAdcode = (value: unknown) =>
  (typeof value === 'number' && Number.isInteger(value) && value >= 100000 && value <= 999999)
  || (typeof value === 'string' && /^\d{6}$/.test(value))

const isPosition = (value: unknown) =>
  Array.isArray(value) && value.length >= 2 && value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))

const isRing = (value: unknown) =>
  Array.isArray(value) && value.length >= 4 && value.every(isPosition)

const hasValidGeometry = (geometry: { type?: unknown; coordinates?: unknown }) => {
  if (geometry.type === 'Polygon') return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every(isRing)
  return geometry.type === 'MultiPolygon'
    && Array.isArray(geometry.coordinates)
    && geometry.coordinates.length > 0
    && geometry.coordinates.every((polygon) => Array.isArray(polygon) && polygon.length > 0 && polygon.every(isRing))
}

const isGeoFeature = (value: unknown): value is GeoFeature => {
  if (!value || typeof value !== 'object') return false
  const feature = value as { properties?: unknown; geometry?: unknown }
  if (!feature.properties || typeof feature.properties !== 'object') return false
  if (!feature.geometry || typeof feature.geometry !== 'object') return false
  const properties = feature.properties as { adcode?: unknown; name?: unknown }
  const geometry = feature.geometry as { type?: unknown; coordinates?: unknown }
  return isAdcode(properties.adcode)
    && typeof properties.name === 'string'
    && hasValidGeometry(geometry)
}

const normalizeMap = (value: unknown): ProvinceGeoMap => {
  if (!value || typeof value !== 'object') throw new CountyMapLoadError()
  const map = value as { type?: unknown; features?: unknown }
  if (map.type !== 'FeatureCollection' || !Array.isArray(map.features) || map.features.length === 0 || !map.features.every(isGeoFeature)) {
    throw new CountyMapLoadError()
  }
  return {
    type: 'FeatureCollection',
    features: map.features.map((feature) => ({
      properties: {
        ...feature.properties,
        adcode: Number(feature.properties.adcode)
      },
      geometry: feature.geometry
    }))
  }
}

export interface CountyMapLoader {
  load(cityCode: string, signal?: AbortSignal): Promise<ProvinceGeoMap>
}

export const createCountyMapLoader = (baseUrl: string, timeoutMs = 10_000): CountyMapLoader => {
  const cache = new Map<string, ProvinceGeoMap>()
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  return {
    async load(cityCode, signal) {
      const cached = cache.get(cityCode)
      if (cached) return cached

      const timeoutController = new AbortController()
      const requestSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal
      const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)
      try {
        const response = await fetch(`${normalizedBaseUrl}/${cityCode}_full.json`, { signal: requestSignal })
        if (!response.ok) throw new CountyMapLoadError()
        const map = normalizeMap(await response.json())
        cache.set(cityCode, map)
        return map
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError' && signal?.aborted) throw error
        if (error instanceof CountyMapLoadError) throw error
        throw new CountyMapLoadError()
      } finally {
        clearTimeout(timeoutId)
      }
    }
  }
}

export const countyMapLoader = createCountyMapLoader(
  import.meta.env.VITE_COUNTY_MAP_API_BASE ?? 'https://geo.datav.aliyun.com/areas_v3/bound'
)
