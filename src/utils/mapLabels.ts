export interface MapLabel {
  id: string
  name: string
  x: number
  y: number
  fontSize: number
}

export interface LabelShape {
  id: string
  name: string
  bounds: { x: number; y: number; width: number; height: number }
  contains: (x: number, y: number) => boolean
  maxFontSize?: number
  preferredPoint?: { x: number; y: number }
}

const fits = (shape: LabelShape, x: number, y: number, fontSize: number) => {
  const halfWidth = shape.name.length * fontSize / 2
  const halfHeight = fontSize * 0.45
  return [x - halfWidth, x, x + halfWidth].every((sampleX) =>
    [y - halfHeight, y, y + halfHeight].every((sampleY) => shape.contains(sampleX, sampleY))
  )
}

export const createContainedMapLabel = (shape: LabelShape): MapLabel | undefined => {
  const { x, y, width, height } = shape.bounds
  const maxFontSize = Math.max(5, Math.min(shape.maxFontSize ?? 14, width / (shape.name.length + 1), height * 0.42))
  const centerX = x + width / 2
  const centerY = y + height / 2
  const candidates = Array.from({ length: 17 * 17 }, (_, index) => {
    const column = index % 17
    const row = Math.floor(index / 17)
    const candidateX = x + width * column / 16
    const candidateY = y + height * row / 16
    return { x: candidateX, y: candidateY, distance: (candidateX - centerX) ** 2 + (candidateY - centerY) ** 2 }
  })
  if (shape.preferredPoint) candidates.push({ ...shape.preferredPoint, distance: -1 })
  candidates.sort((left, right) => left.distance - right.distance)

  for (const candidate of candidates) {
    for (let fontSize = Math.floor(maxFontSize); fontSize >= 5; fontSize -= 1) {
      if (fits(shape, candidate.x, candidate.y, fontSize)) {
        return { id: shape.id, name: shape.name, x: candidate.x, y: candidate.y, fontSize }
      }
    }
  }
}
