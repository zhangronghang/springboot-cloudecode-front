export interface MemoryFormInput {
  title: string
  visitedAt: string
  hasFile: boolean
  isEditing: boolean
}

const MAX_IMAGE_FILE_SIZE = 50 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png'])

export const validateImageFile = (file: Pick<File, 'type' | 'size'>) => {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) return '请选择 JPEG 或 PNG 图片。'
  if (file.size > MAX_IMAGE_FILE_SIZE) return '图片大小不能超过 50MB。'
}

export const validateMemoryForm = (input: MemoryFormInput) => {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(input.visitedAt) && !Number.isNaN(Date.parse(input.visitedAt))
  if (!input.title.trim() || !validDate || (!input.isEditing && !input.hasFile)) {
    return '请填写标题和有效游玩日期，并为新足迹选择一张照片。'
  }
}
