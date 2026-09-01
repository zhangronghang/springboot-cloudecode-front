import type {
  ApiResponse,
  ImageBatchDeleteResult,
  ImageMetadata,
  PaginatedImages,
  PublicImage
} from './imageTypes'

export class ImageApiError extends Error {
  constructor(message: string, public readonly uncertain = false) {
    super(message)
    this.name = 'ImageApiError'
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface ImageListInput {
  page: number
  size: number
  provinceCode?: string
  cityCode?: string
  districtCode?: string
  tag?: string
  uploader?: string
}

export interface ImageWriteInput {
  id?: string
  file?: File
  title?: string
  description?: string
  tags?: string
  uploader?: string
}

export interface ImageLocationInput {
  provinceCode?: string
  cityCode?: string
  districtCode?: string
}

export interface InformationImageListInput {
  informationId: string
  page: number
  size: number
}

export interface InformationImageAddInput {
  informationId: string
  file: File
}

export interface InformationImageDeleteInput {
  informationId: string
  imageIds: string[]
}

const readResponse = async <T>(response: Response): Promise<T> => {
  let payload: ApiResponse<T>
  try {
    payload = await response.json() as ApiResponse<T>
  } catch {
    throw new ImageApiError('图片服务返回了无法解析的响应。', true)
  }
  if (!response.ok || payload.code !== 200) {
    throw new ImageApiError(payload.message || '图片服务请求失败。', response.status >= 500)
  }
  return payload.data
}

const createForm = (
  input: ImageWriteInput & ImageLocationInput,
  includeId: boolean,
  includeLocation: boolean,
  includeFile: boolean
) => {
  const form = new FormData()
  if (includeId && input.id) form.append('id', input.id)
  if (includeFile && input.file) form.append('file', input.file)
  for (const key of ['title', 'description', 'tags', 'uploader'] as const) {
    if (input[key] !== undefined) form.append(key, input[key])
  }
  if (includeLocation) {
    for (const key of ['provinceCode', 'cityCode', 'districtCode'] as const) {
      if (input[key] !== undefined) form.append(key, input[key])
    }
  }
  return form
}

export const createImageApi = (fetcher: Fetcher = fetch) => ({
  async list(input: ImageListInput) {
    const response = await fetcher('/api/information/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    return readResponse<PaginatedImages<ImageMetadata>>(response)
  },
  async listImages(input: InformationImageListInput) {
    const response = await fetcher('/api/information/image/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    return readResponse<PaginatedImages<PublicImage>>(response)
  },
  async addImage(input: InformationImageAddInput) {
    const form = new FormData()
    form.append('informationId', input.informationId)
    form.append('file', input.file)
    const response = await fetcher('/api/information/image/add', { method: 'POST', body: form })
    return readResponse<PublicImage>(response)
  },
  async deleteImages(input: InformationImageDeleteInput) {
    const response = await fetcher('/api/information/image/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, imageIds: [...new Set(input.imageIds)] })
    })
    return readResponse<ImageBatchDeleteResult>(response)
  },
  async upload(input: ImageWriteInput & ImageLocationInput & { file: File; title: string }) {
    const response = await fetcher('/api/information/upload', { method: 'POST', body: createForm(input, false, true, true) })
    return readResponse<ImageMetadata>(response)
  },
  async update(input: Omit<ImageWriteInput, 'file'> & { id: string }) {
    const response = await fetcher('/api/information/update', { method: 'POST', body: createForm(input, true, false, false) })
    return readResponse<ImageMetadata>(response)
  },
  async delete(id: string) {
    const response = await fetcher('/api/information/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    return readResponse<null>(response)
  }
})

export const imageApi = createImageApi()
