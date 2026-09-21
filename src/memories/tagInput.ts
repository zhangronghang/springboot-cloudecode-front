import { ref } from 'vue'

export const COMMON_MEMORY_TAGS = [
  '古都',
  '美食',
  '自然风光',
  '夜景',
  '亲子',
  '徒步',
  '博物馆',
  '海边'
] as const

export const createTagInput = (initial: string[] = []) => {
  const tags = ref<string[]>([])
  const draft = ref('')

  const hasTag = (tag: string) => tags.value.includes(tag)

  const addTag = (raw: string) => {
    const tag = raw.trim()
    if (!tag || hasTag(tag)) return false
    tags.value = [...tags.value, tag]
    return true
  }

  const removeTag = (tag: string) => {
    tags.value = tags.value.filter((existing) => existing !== tag)
  }

  const resolve = () => {
    addTag(draft.value)
    draft.value = ''
    return [...tags.value]
  }

  for (const tag of initial) addTag(tag)

  return { tags, draft, addTag, removeTag, hasTag, resolve }
}
