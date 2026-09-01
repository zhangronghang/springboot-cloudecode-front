export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PublicImage {
  imageId: string
  fileName: string
  fileSize: number
  contentType: string
  width: number
  height: number
  createTime: string
  thumbnailUrl: string
  originalUrl: string
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
  imageCount: number
  coverImage: PublicImage | null
  fileSize?: string | null
  fileName?: string | null
  gridFsFileId?: string | null
}

export interface PaginatedImages<T> {
  total: number
  page: number
  size: number
  records: T[]
}

export interface ImageBatchDeleteResult {
  requestedCount: number
  deletedCount: number
  ignoredImageIds: string[]
  remainingCount: number
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
  imageCount: number
  coverImage: PublicImage | null
  coverLoadFailed?: boolean
}
