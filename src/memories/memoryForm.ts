export interface MemoryFormInput {
  title: string
  visitedAt: string
  hasFile: boolean
  isEditing: boolean
}

export const validateMemoryForm = (input: MemoryFormInput) => {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(input.visitedAt) && !Number.isNaN(Date.parse(input.visitedAt))
  if (!input.title.trim() || !validDate || (!input.isEditing && !input.hasFile)) {
    return '请填写标题和有效游玩日期，并为新足迹选择一张照片。'
  }
}
