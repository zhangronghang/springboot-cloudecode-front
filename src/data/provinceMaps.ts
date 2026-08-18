export interface GeoFeature {
  properties: { adcode: number; name: string; center?: [number, number]; centroid?: [number, number] }
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
}

export interface ProvinceGeoMap {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

type ProvinceMapLoader = () => Promise<ProvinceGeoMap>
const asMap = (loader: () => Promise<{ default: unknown }>): ProvinceMapLoader => async () => (await loader()).default as ProvinceGeoMap

const loaders: Record<string, ProvinceMapLoader> = {
  '110000': asMap(() => import('china-province-city-district-geojson/dist/data/110000.json')),
  '120000': asMap(() => import('china-province-city-district-geojson/dist/data/120000.json')),
  '130000': asMap(() => import('china-province-city-district-geojson/dist/data/130000.json')),
  '140000': asMap(() => import('china-province-city-district-geojson/dist/data/140000.json')),
  '150000': asMap(() => import('china-province-city-district-geojson/dist/data/150000.json')),
  '210000': asMap(() => import('china-province-city-district-geojson/dist/data/210000.json')),
  '220000': asMap(() => import('china-province-city-district-geojson/dist/data/220000.json')),
  '230000': asMap(() => import('china-province-city-district-geojson/dist/data/230000.json')),
  '310000': asMap(() => import('china-province-city-district-geojson/dist/data/310000.json')),
  '320000': asMap(() => import('china-province-city-district-geojson/dist/data/320000.json')),
  '330000': asMap(() => import('china-province-city-district-geojson/dist/data/330000.json')),
  '340000': asMap(() => import('china-province-city-district-geojson/dist/data/340000.json')),
  '350000': asMap(() => import('china-province-city-district-geojson/dist/data/350000.json')),
  '360000': asMap(() => import('china-province-city-district-geojson/dist/data/360000.json')),
  '370000': asMap(() => import('china-province-city-district-geojson/dist/data/370000.json')),
  '410000': asMap(() => import('china-province-city-district-geojson/dist/data/410000.json')),
  '420000': asMap(() => import('china-province-city-district-geojson/dist/data/420000.json')),
  '430000': asMap(() => import('china-province-city-district-geojson/dist/data/430000.json')),
  '440000': asMap(() => import('china-province-city-district-geojson/dist/data/440000.json')),
  '450000': asMap(() => import('china-province-city-district-geojson/dist/data/450000.json')),
  '460000': asMap(() => import('china-province-city-district-geojson/dist/data/460000.json')),
  '500000': asMap(() => import('china-province-city-district-geojson/dist/data/500000.json')),
  '510000': asMap(() => import('china-province-city-district-geojson/dist/data/510000.json')),
  '520000': asMap(() => import('china-province-city-district-geojson/dist/data/520000.json')),
  '530000': asMap(() => import('china-province-city-district-geojson/dist/data/530000.json')),
  '540000': asMap(() => import('china-province-city-district-geojson/dist/data/540000.json')),
  '610000': asMap(() => import('china-province-city-district-geojson/dist/data/610000.json')),
  '620000': asMap(() => import('china-province-city-district-geojson/dist/data/620000.json')),
  '630000': asMap(() => import('china-province-city-district-geojson/dist/data/630000.json')),
  '640000': asMap(() => import('china-province-city-district-geojson/dist/data/640000.json')),
  '650000': asMap(() => import('china-province-city-district-geojson/dist/data/650000.json')),
  '710000': asMap(() => import('china-province-city-district-geojson/dist/data/710000.json')),
  '810000': asMap(() => import('china-province-city-district-geojson/dist/data/810000.json')),
  '820000': asMap(() => import('china-province-city-district-geojson/dist/data/820000.json'))
}

export const getProvinceMapLoader = (provinceCode: string) => loaders[provinceCode]
