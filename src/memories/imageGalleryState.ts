import { computed, ref } from 'vue'
import { ImageApiError } from '../api/imageApi'
import type { ImageBatchDeleteResult, PaginatedImages, PublicImage } from '../api/imageTypes'
import { validateImageFile } from './memoryForm'

export const IMAGE_GALLERY_PAGE_SIZE = 12

export interface ImageGalleryApi {
  listImages(input: { informationId: string; page: number; size: number }): Promise<PaginatedImages<PublicImage>>
  addImage(input: { informationId: string; file: File }): Promise<PublicImage>
  deleteImages(input: { informationId: string; imageIds: string[] }): Promise<ImageBatchDeleteResult>
}

type GalleryMode = 'browse' | 'manage' | 'preview'
type GalleryStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
type GalleryMutation = 'idle' | 'uploading' | 'deleting'

export const createImageGalleryState = (api: ImageGalleryApi, onChanged: () => void | Promise<void> = () => {}) => {
  const informationId = ref('')
  const mode = ref<GalleryMode>('browse')
  const status = ref<GalleryStatus>('idle')
  const page = ref(1)
  const total = ref(0)
  const records = ref<PublicImage[]>([])
  const selectedIds = ref<Set<string>>(new Set())
  const error = ref('')
  const message = ref('')
  const mutation = ref<GalleryMutation>('idle')
  const activeImage = ref<PublicImage>()
  const originalFailed = ref(false)
  const originalRetryKey = ref(0)
  const previewNavigationLoading = ref(false)
  let gridMode: Exclude<GalleryMode, 'preview'> = 'browse'
  let requestToken = 0

  const clearSelection = () => { selectedIds.value = new Set() }

  const loadPage = async (nextPage: number, preserveCurrent = false) => {
    const token = ++requestToken
    const previousStatus = status.value
    status.value = 'loading'
    if (!preserveCurrent) records.value = []
    error.value = ''
    message.value = ''
    try {
      const result = await api.listImages({
        informationId: informationId.value,
        page: nextPage,
        size: IMAGE_GALLERY_PAGE_SIZE
      })
      if (token !== requestToken) return false
      page.value = result.page
      total.value = result.total
      records.value = result.records
      status.value = result.records.length ? 'ready' : 'empty'
      return true
    } catch (cause) {
      if (token !== requestToken) return false
      if (!preserveCurrent) records.value = []
      error.value = cause instanceof Error ? cause.message : '无法加载图片集。'
      status.value = preserveCurrent ? previousStatus : 'error'
      return false
    }
  }

  const open = async (nextInformationId: string) => {
    informationId.value = nextInformationId
    mode.value = 'browse'
    page.value = 1
    total.value = 0
    activeImage.value = undefined
    originalFailed.value = false
    originalRetryKey.value = 0
    previewNavigationLoading.value = false
    clearSelection()
    return loadPage(1)
  }

  const enterManage = () => {
    mode.value = 'manage'
    clearSelection()
  }

  const exitManage = () => {
    mode.value = 'browse'
    clearSelection()
  }

  const toggleSelection = (imageId: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(imageId)) next.delete(imageId)
    else next.add(imageId)
    selectedIds.value = next
  }

  const changePage = async (nextPage: number) => {
    if (mode.value === 'preview') return false
    clearSelection()
    return loadPage(nextPage)
  }

  const preview = (imageId: string) => {
    const next = records.value.find((record) => record.imageId === imageId)
    if (!next) return
    gridMode = mode.value === 'manage' ? 'manage' : 'browse'
    activeImage.value = next
    originalFailed.value = false
    mode.value = 'preview'
  }

  const previewNext = async () => {
    if (!activeImage.value || previewNavigationLoading.value) return
    const index = records.value.findIndex((record) => record.imageId === activeImage.value?.imageId)
    if (index >= 0 && index < records.value.length - 1) {
      activeImage.value = records.value[index + 1]
      originalFailed.value = false
      return
    }
    if (page.value * IMAGE_GALLERY_PAGE_SIZE >= total.value) return
    previewNavigationLoading.value = true
    try {
      if (await loadPage(page.value + 1, true)) {
        activeImage.value = records.value[0]
        originalFailed.value = false
      }
    } finally {
      previewNavigationLoading.value = false
    }
  }

  const previewPrevious = async () => {
    if (!activeImage.value || previewNavigationLoading.value) return
    const index = records.value.findIndex((record) => record.imageId === activeImage.value?.imageId)
    if (index > 0) {
      activeImage.value = records.value[index - 1]
      originalFailed.value = false
      return
    }
    if (page.value <= 1) return
    previewNavigationLoading.value = true
    try {
      if (await loadPage(page.value - 1, true)) {
        activeImage.value = records.value[records.value.length - 1]
        originalFailed.value = false
      }
    } finally {
      previewNavigationLoading.value = false
    }
  }

  const backToGrid = () => {
    mode.value = gridMode
    activeImage.value = undefined
    originalFailed.value = false
  }

  const activeIndex = computed(() => records.value.findIndex((record) => record.imageId === activeImage.value?.imageId))
  const canPreviewPrevious = computed(() => !previewNavigationLoading.value && Boolean(activeImage.value) && ((page.value - 1) * IMAGE_GALLERY_PAGE_SIZE + activeIndex.value > 0))
  const canPreviewNext = computed(() => !previewNavigationLoading.value && Boolean(activeImage.value) && ((page.value - 1) * IMAGE_GALLERY_PAGE_SIZE + activeIndex.value < total.value - 1))
  const canAdd = computed(() => total.value < 50 && mutation.value === 'idle')
  const busy = computed(() => mutation.value !== 'idle')

  const upload = async (file: File) => {
    if (mode.value !== 'manage' || mutation.value !== 'idle') return false
    error.value = ''
    message.value = ''
    if (total.value >= 50) {
      error.value = '每个足迹最多 50 张图片。'
      return false
    }
    const validationError = validateImageFile(file)
    if (validationError) {
      error.value = validationError
      return false
    }

    mutation.value = 'uploading'
    try {
      await api.addImage({ informationId: informationId.value, file })
      await Promise.all([loadPage(page.value, true), Promise.resolve(onChanged())])
      message.value = `已添加 ${file.name}。`
      return true
    } catch (cause) {
      if (cause instanceof ImageApiError && !cause.uncertain) {
        error.value = cause.message
        return false
      }
      await Promise.allSettled([loadPage(page.value, true), Promise.resolve(onChanged())])
      message.value = '上传结果无法确认，已刷新图片列表；请检查后再重试。'
      return false
    } finally {
      mutation.value = 'idle'
    }
  }

  const deleteSelected = async (confirmedImageIds?: Iterable<string>) => {
    const imageIds = [...new Set(confirmedImageIds ?? selectedIds.value)]
    if (mode.value !== 'manage' || mutation.value !== 'idle' || imageIds.length === 0) return false
    error.value = ''
    message.value = ''
    mutation.value = 'deleting'
    try {
      const result = await api.deleteImages({ informationId: informationId.value, imageIds })
      clearSelection()
      const lastPage = Math.max(1, Math.ceil(result.remainingCount / IMAGE_GALLERY_PAGE_SIZE))
      const targetPage = Math.min(page.value, lastPage)
      await Promise.all([loadPage(targetPage, true), Promise.resolve(onChanged())])
      message.value = `已删除 ${result.deletedCount} 张，忽略 ${result.ignoredImageIds.length} 张。`
      return true
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '无法删除所选图片。'
      return false
    } finally {
      mutation.value = 'idle'
    }
  }

  return {
    informationId,
    mode,
    status,
    page,
    total,
    records,
    selectedIds,
    error,
    message,
    mutation,
    canAdd,
    busy,
    activeImage,
    originalFailed,
    originalRetryKey,
    previewNavigationLoading,
    canPreviewPrevious,
    canPreviewNext,
    open,
    changePage,
    enterManage,
    exitManage,
    toggleSelection,
    clearSelection,
    preview,
    previewNext,
    previewPrevious,
    backToGrid,
    upload,
    deleteSelected,
    markOriginalFailed: () => { originalFailed.value = true },
    retryOriginal: () => {
      originalFailed.value = false
      originalRetryKey.value += 1
    },
    retry: () => loadPage(page.value)
  }
}
