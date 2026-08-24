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
  provinceCode?: string | null
  cityCode?: string | null
  districtCode?: string | null
  createTime?: string | null
  uploadTime?: string | null
  fileSize?: string | null
  fileName?: string | null
  gridFsFileId?: string | null
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
  provinceCode: string
  cityCode?: string
  districtCode: string
  districtName: string
  title: string
  feeling: string
  visitedAt: string
  tags: string[]
  imageBase64?: string
  imageLoadFailed?: boolean
}
