import type { GeoFeature, ProvinceGeoMap } from '../data/provinceMaps'
import { createContainedMapLabel } from './mapLabels'

export interface MapPath {
  id: number
  name: string
  d: string
  labelX: number
  labelY: number
  fontSize: number
  showLabel: boolean
}

const getRings = (feature: GeoFeature): number[][][] => {
  if (feature.geometry.type === 'Polygon') return feature.geometry.coordinates as number[][][]
  return (feature.geometry.coordinates as number[][][][]).flat()
}

const isPointInRing = ([x, y]: number[], ring: number[][]) => {
  let inside = false
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const [currentX, currentY] = ring[current]
    const [previousX, previousY] = ring[previous]
    if ((currentY > y) !== (previousY > y) && x < (previousX - currentX) * (y - currentY) / (previousY - currentY) + currentX) inside = !inside
  }
  return inside
}

const isPointInRings = (point: number[], rings: number[][][]) => rings.reduce((inside, ring) => isPointInRing(point, ring) ? !inside : inside, false)

const normalizePoint = (point: [number, number] | { lng: number; lat: number }) =>
  Array.isArray(point) ? point : [point.lng, point.lat]

export const createMapPaths = (map: ProvinceGeoMap): { paths: MapPath[]; viewBox: string } => {
  const points = map.features.flatMap((feature) => getRings(feature).flat())
  const longitudes = points.map(([longitude]) => longitude)
  const latitudes = points.map(([, latitude]) => latitude)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const width = maxLongitude - minLongitude || 1
  const height = maxLatitude - minLatitude || 1
  const scale = Math.min(920 / width, 920 / height)
  const offsetX = (1000 - width * scale) / 2
  const offsetY = (1000 - height * scale) / 2
  const project = ([longitude, latitude]: number[]) => [
    offsetX + (longitude - minLongitude) * scale,
    offsetY + (maxLatitude - latitude) * scale
  ]
  const pathForRing = (ring: number[][]) => ring.map((point, index) => {
    const [x, y] = project(point)
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
  }).join('') + 'Z'

  return {
    viewBox: '0 0 1000 1000',
    paths: map.features.map((feature) => {
      const rings = getRings(feature)
      const projectedPoints = rings.flat().map(project)
      const xValues = projectedPoints.map(([x]) => x)
      const yValues = projectedPoints.map(([, y]) => y)
      const shapeWidth = Math.max(...xValues) - Math.min(...xValues)
      const shapeHeight = Math.max(...yValues) - Math.min(...yValues)
      const preferredSource = feature.properties.centroid ?? feature.properties.center
      const preferredPoint = project(preferredSource ? normalizePoint(preferredSource) : rings[0][0])
      const projectedRings = rings.map((ring) => ring.map(project))
      const label = createContainedMapLabel({
        id: String(feature.properties.adcode),
        name: feature.properties.name,
        bounds: { x: Math.min(...xValues), y: Math.min(...yValues), width: shapeWidth, height: shapeHeight },
        contains: (x, y) => isPointInRings([x, y], projectedRings),
        preferredPoint: { x: preferredPoint[0], y: preferredPoint[1] },
        maxFontSize: 28
      })
      const fontSize = label?.fontSize ?? 5
      const showLabel = Boolean(label)
      return {
        id: feature.properties.adcode,
        name: feature.properties.name,
        d: rings.map(pathForRing).join(''),
        labelX: label?.x ?? preferredPoint[0],
        labelY: label?.y ?? preferredPoint[1],
        fontSize,
        showLabel
      }
    })
  }
}
