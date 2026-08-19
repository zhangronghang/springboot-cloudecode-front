import type { ApiResponse, ImageDetail, ImageMetadata, PaginatedImages } from './imageTypes'

export class ImageApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageApiError'
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface ImageListInput {
  page: number
  size: number
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

const readResponse = async <T>(response: Response): Promise<T> => {
  let payload: ApiResponse<T>
  try {
    payload = await response.json() as ApiResponse<T>
  } catch {
    throw new ImageApiError('图片服务返回了无法解析的响应。')
  }
  if (!response.ok || payload.code !== 200) throw new ImageApiError(payload.message || '图片服务请求失败。')
  return payload.data
}

const createForm = (input: ImageWriteInput, includeId: boolean) => {
  const form = new FormData()
  if (includeId && input.id) form.append('id', input.id)
  if (input.file) form.append('file', input.file)
  for (const key of ['title', 'description', 'tags', 'uploader'] as const) {
    if (input[key] !== undefined) form.append(key, input[key])
  }
  return form
}

export const createImageApi = (fetcher: Fetcher = fetch) => ({
  async list(input: ImageListInput) {
    const response = await fetcher('/api/images/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    return readResponse<PaginatedImages<ImageMetadata>>(response)
  },
  async detail(id: string) {
    const response = await fetcher('/api/images/detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const detail = await readResponse<{ imageBase64: string; metadata: ImageMetadata }>(response)
    return { ...detail.metadata, imageBase64: detail.imageBase64 } as ImageDetail
  },
  async upload(input: ImageWriteInput & { file: File; title: string }) {
    const response = await fetcher('/api/images/upload', { method: 'POST', body: createForm(input, false) })
    return readResponse<ImageMetadata>(response)
  },
  async update(input: ImageWriteInput & { id: string }) {
    const response = await fetcher('/api/images/update', { method: 'POST', body: createForm(input, true) })
    return readResponse<ImageMetadata>(response)
  },
  async delete(id: string) {
    const response = await fetcher('/api/images/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    return readResponse<null>(response)
  }
})

export const imageApi = createImageApi()
