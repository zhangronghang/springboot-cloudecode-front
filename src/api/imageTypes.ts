export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface ImageMetadata {
  id: string
  title: string
  description?: string
  tags?: string
  uploader?: string
  createdAt?: string
}

export interface ImageDetail extends ImageMetadata {
  imageBase64: string
}

export interface PaginatedImages<T> {
  total: number
  page: number
  size: number
  records: T[]
}

export interface CityMemory {
  id: string
  cityCode: string
  title: string
  feeling: string
  visitedAt: string
  tags: string[]
  imageBase64?: string
  imageLoadFailed?: boolean
}
