<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ImageGalleryApi } from '../memories/imageGalleryState'
import { createImageGalleryState, IMAGE_GALLERY_PAGE_SIZE } from '../memories/imageGalleryState'

const props = defineProps<{
  informationId: string
  title: string
  api: ImageGalleryApi
}>()

const emit = defineEmits<{
  close: []
  changed: []
}>()

const gallery = createImageGalleryState(props.api, () => emit('changed'))
const {
  mode, status, page, total, records, selectedIds, error, message, busy,
  activeImage, originalFailed, originalRetryKey, canPreviewPrevious, canPreviewNext,
  canAdd, mutation
} = gallery
const failedThumbnails = ref<Set<string>>(new Set())
const dialog = ref<HTMLElement>()
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const deleteConfirmOpen = ref(false)
const pendingDeleteIds = ref<string[]>([])
const deleteConfirm = ref<HTMLElement>()
let returnFocus: HTMLElement | null = null
let deleteReturnFocus: HTMLElement | null = null
let previousBodyOverflow = ''
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / IMAGE_GALLERY_PAGE_SIZE)))

watch(records, () => { failedThumbnails.value = new Set() })

const markThumbnailFailed = (imageId: string) => {
  failedThumbnails.value = new Set(failedThumbnails.value).add(imageId)
}

const openOriginal = () => {
  if (activeImage.value) window.open(activeImage.value.originalUrl, '_blank', 'noopener,noreferrer')
}

const chooseFile = () => {
  if (canAdd.value) fileInput.value?.click()
}

const selectFile = (event: Event) => {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0]
}

const uploadSelected = async () => {
  if (!selectedFile.value) return
  if (await gallery.upload(selectedFile.value)) {
    selectedFile.value = undefined
    if (fileInput.value) fileInput.value.value = ''
  }
}

const setGalleryBackgroundInert = (inert: boolean) => {
  if (!dialog.value) return
  for (const child of [...dialog.value.children]) {
    if (child !== deleteConfirm.value) child.toggleAttribute('inert', inert)
  }
}

const openDeleteConfirm = async () => {
  pendingDeleteIds.value = [...selectedIds.value]
  if (!pendingDeleteIds.value.length) return
  deleteReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  deleteConfirmOpen.value = true
  await nextTick()
  setGalleryBackgroundInert(true)
  deleteConfirm.value?.querySelector<HTMLElement>('button:not([disabled])')?.focus()
}

const cancelDeleteConfirm = () => {
  setGalleryBackgroundInert(false)
  deleteConfirmOpen.value = false
  pendingDeleteIds.value = []
  void nextTick(() => deleteReturnFocus?.focus())
}

const confirmDelete = async () => {
  await gallery.deleteSelected(pendingDeleteIds.value)
  setGalleryBackgroundInert(false)
  deleteConfirmOpen.value = false
  pendingDeleteIds.value = []
}

const requestClose = () => {
  if (!busy.value && !deleteConfirmOpen.value) emit('close')
}

const trapTab = (event: KeyboardEvent, container: HTMLElement) => {
  const focusable = [...container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  )].filter((element) => !element.hasAttribute('hidden'))
  if (!focusable.length) {
    event.preventDefault()
    container.focus()
    return
  }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (deleteConfirmOpen.value) {
    if (event.key === 'Escape' && !busy.value) {
      event.preventDefault()
      cancelDeleteConfirm()
    } else if (event.key === 'Tab' && deleteConfirm.value) {
      trapTab(event, deleteConfirm.value)
    }
    return
  }
  if (event.key === 'Escape') {
    if (!busy.value) {
      event.preventDefault()
      emit('close')
    }
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  trapTab(event, dialog.value)
}

const guardDeleteConfirmation = (event: MouseEvent) => {
  if (deleteConfirmOpen.value && deleteConfirm.value && !deleteConfirm.value.contains(event.target as Node)) {
    event.preventDefault()
    event.stopPropagation()
  }
}

onMounted(async () => {
  returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : null
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  const opening = gallery.open(props.informationId)
  await nextTick()
  dialog.value?.focus()
  await opening
  await nextTick()
  if (dialog.value && !dialog.value.contains(document.activeElement)) dialog.value.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  const replacementTrigger = [...document.querySelectorAll<HTMLElement>('[data-gallery-trigger-id]')]
    .find((element) => element.dataset.galleryTriggerId === props.informationId)
  const focusTarget = returnFocus?.isConnected
    ? returnFocus
    : replacementTrigger ?? document.querySelector<HTMLElement>('[data-gallery-focus-fallback]')
  focusTarget?.focus()
  void nextTick(() => {
    const settledTarget = focusTarget?.isConnected
      ? focusTarget
      : document.querySelector<HTMLElement>('[data-gallery-focus-fallback]')
    settledTarget?.focus()
  })
})
</script>

<template>
  <Teleport to="body">
    <div class="gallery-backdrop" style="position: fixed" @click.self="requestClose">
      <section
        ref="dialog"
        class="gallery-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-title"
        tabindex="-1"
        @click.capture="guardDeleteConfirmation"
        @keydown="handleKeydown"
      >
        <header class="gallery-header">
          <div>
            <p class="gallery-eyebrow">足迹图片集</p>
            <h2 id="gallery-title">{{ title }}</h2>
            <p>共 {{ total }} 张 · 第 {{ page }} / {{ pageCount }} 页</p>
          </div>
          <div class="gallery-header-actions">
            <button
              v-if="mode === 'browse'"
              type="button"
              aria-label="管理图片"
              @click="gallery.enterManage"
            >管理图片</button>
            <button
              v-else-if="mode === 'manage'"
              type="button"
              aria-label="完成图片管理"
              @click="gallery.exitManage"
            >完成</button>
            <button type="button" aria-label="关闭图片集" :disabled="busy" @click="requestClose">关闭</button>
          </div>
        </header>

        <p v-if="error" class="gallery-error">{{ error }}</p>
        <p v-if="message" class="gallery-message">{{ message }}</p>
        <div v-if="mode === 'preview' && activeImage" class="gallery-preview">
          <div class="gallery-preview-actions">
            <button type="button" aria-label="返回图片集" @click="gallery.backToGrid">返回图片集</button>
            <button type="button" aria-label="新窗口打开原图" @click="openOriginal">新窗口打开</button>
          </div>
          <div class="gallery-original-stage">
            <img
              v-if="!originalFailed"
              :key="originalRetryKey"
              class="gallery-original"
              style="object-fit: contain"
              :src="activeImage.originalUrl"
              :alt="activeImage.fileName"
              @error="gallery.markOriginalFailed"
            >
            <div v-else class="gallery-original-failed">
              <p>原图加载失败</p>
              <button type="button" aria-label="重试原图" @click="gallery.retryOriginal">重试</button>
            </div>
          </div>
          <nav class="gallery-preview-navigation" aria-label="原图导航">
            <button
              type="button"
              aria-label="上一张"
              :disabled="!canPreviewPrevious"
              @click="gallery.previewPrevious"
            >上一张</button>
            <button
              type="button"
              aria-label="下一张"
              :disabled="!canPreviewNext"
              @click="gallery.previewNext"
            >下一张</button>
          </nav>
        </div>
        <p v-else-if="status === 'loading'" class="gallery-status">正在加载图片…</p>
        <div v-else-if="status === 'error'" class="gallery-status">
          <p>图片集加载失败。</p>
          <button type="button" @click="gallery.retry">重新加载</button>
        </div>
        <div v-else-if="status === 'empty'" class="gallery-status gallery-empty">
          <p>该足迹暂无图片</p>
          <button
            v-if="mode !== 'manage'"
            type="button"
            aria-label="添加图片"
            @click="gallery.enterManage"
          >添加图片</button>
        </div>

        <div
          v-else-if="status === 'ready'"
          class="gallery-grid"
          style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr))"
        >
          <article v-for="item in records" :key="item.imageId" class="gallery-thumbnail">
            <input
              v-if="mode === 'manage'"
              type="checkbox"
              :aria-label="`选择 ${item.fileName}`"
              :checked="selectedIds.has(item.imageId)"
              @change="gallery.toggleSelection(item.imageId)"
            >
            <button type="button" :aria-label="`预览 ${item.fileName}`" @click="gallery.preview(item.imageId)">
              <img
                v-if="!failedThumbnails.has(item.imageId)"
                :src="item.thumbnailUrl"
                :alt="item.fileName"
                @error="markThumbnailFailed(item.imageId)"
              >
              <span v-else class="gallery-image-failed">缩略图加载失败</span>
            </button>
            <p>{{ item.fileName }}</p>
          </article>
        </div>

        <div v-if="mode === 'manage'" class="gallery-manage-actions">
          <input
            ref="fileInput"
            class="gallery-file-input"
            type="file"
            hidden
            accept="image/jpeg,image/png"
            :disabled="!canAdd"
            @change="selectFile"
          >
          <button type="button" aria-label="添加图片" :disabled="!canAdd" @click="chooseFile">添加图片</button>
          <span v-if="selectedFile" class="gallery-selected-file">{{ selectedFile.name }}</span>
          <button
            v-if="selectedFile"
            type="button"
            aria-label="上传所选图片"
            :disabled="busy"
            @click="uploadSelected"
          >{{ mutation === 'uploading' ? `正在上传 ${selectedFile.name}…` : '上传此图片' }}</button>
          <span v-if="total >= 50">每个足迹最多 50 张图片</span>
          <button
            type="button"
            aria-label="删除所选图片"
            :disabled="selectedIds.size === 0 || busy"
            @click="openDeleteConfirm"
          >删除所选图片</button>
        </div>

        <div v-if="deleteConfirmOpen" ref="deleteConfirm" class="gallery-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="gallery-delete-title" tabindex="-1">
          <div class="gallery-delete-confirm-panel">
            <p id="gallery-delete-title">确认删除 {{ pendingDeleteIds.length }} 张所选图片？此操作无法恢复。</p>
            <button type="button" aria-label="取消删除所选图片" :disabled="busy" @click="cancelDeleteConfirm">取消</button>
            <button
              type="button"
              aria-label="确认删除所选图片"
              :disabled="busy"
              @click="confirmDelete"
            >{{ mutation === 'deleting' ? '删除中…' : '确认删除' }}</button>
          </div>
        </div>

        <nav v-if="mode !== 'preview' && status === 'ready' && pageCount > 1" class="gallery-pagination" aria-label="图片分页">
          <button type="button" :disabled="page === 1" @click="gallery.changePage(page - 1)">上一页</button>
          <span>{{ page }} / {{ pageCount }}</span>
          <button type="button" :disabled="page === pageCount" @click="gallery.changePage(page + 1)">下一页</button>
        </nav>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.gallery-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(1, 10, 23, .86);
  backdrop-filter: blur(8px);
}

.gallery-dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(1180px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  overflow: hidden;
  border: 1px solid #31536b;
  border-top: 3px solid #d8b45b;
  padding: 22px;
  color: #edf3f7;
  background: linear-gradient(145deg, #102c42 0%, #071a33 56%, #031224 100%);
  box-shadow: 24px 28px 0 rgba(0, 5, 14, .34), 0 22px 70px rgba(0, 0, 0, .48);
  outline: none;
}

.gallery-header,
.gallery-header-actions,
.gallery-preview-actions,
.gallery-preview-navigation,
.gallery-manage-actions,
.gallery-pagination {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gallery-header {
  flex: 0 0 auto;
  justify-content: space-between;
  border-bottom: 1px solid #31536b;
  padding: 0 0 16px;
}

.gallery-header h2 {
  margin: 2px 0 5px;
  color: #fffdf6;
  font-family: 'STSong', 'SimSun', serif;
  font-size: clamp(24px, 3vw, 36px);
  letter-spacing: .04em;
}

.gallery-header p {
  margin: 0;
  color: #acc1d2;
  font-family: Consolas, monospace;
  font-size: 12px;
}

.gallery-eyebrow {
  color: #d8b45b !important;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.gallery-dialog button {
  border: 1px solid #496a81;
  padding: 8px 12px;
  color: #dbe8ee;
  background: rgba(7, 26, 51, .78);
  cursor: pointer;
  transition: border-color .16s ease, color .16s ease, background .16s ease, transform .16s ease;
}

.gallery-dialog button:hover:not(:disabled) {
  border-color: #d8b45b;
  color: #fffdf6;
  background: #163f5d;
  transform: translateY(-1px);
}

.gallery-dialog button:focus-visible,
.gallery-dialog input:focus-visible {
  outline: 2px solid #fff0b5;
  outline-offset: 2px;
}

.gallery-dialog button:disabled {
  cursor: not-allowed;
  opacity: .42;
}

.gallery-status {
  display: grid;
  min-height: 280px;
  place-items: center;
  margin: 0;
  color: #acc1d2;
  text-align: center;
}

.gallery-empty {
  align-content: center;
  gap: 14px;
}

.gallery-error,
.gallery-message {
  margin: 12px 0 0;
  border-left: 2px solid #d8b45b;
  padding: 8px 12px;
  background: rgba(3, 18, 36, .68);
}

.gallery-error { color: #ffb4a3; }
.gallery-message { color: #c8e1cf; }

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  min-height: 0;
  margin-top: 18px;
  overflow: auto;
  padding: 0 4px 4px 0;
}

.gallery-thumbnail {
  position: relative;
  min-width: 0;
  border: 1px solid #29485e;
  padding: 7px;
  background: #06182d;
}

.gallery-thumbnail > input[type='checkbox'] {
  position: absolute;
  top: 13px;
  left: 13px;
  z-index: 2;
  width: 18px;
  height: 18px;
  accent-color: #d8b45b;
}

.gallery-thumbnail > button {
  display: block;
  width: 100%;
  border: 0;
  padding: 0;
  overflow: hidden;
  background: #102c42;
}

.gallery-thumbnail img,
.gallery-image-failed {
  display: grid;
  width: 100%;
  aspect-ratio: 4 / 3;
  place-items: center;
  object-fit: cover;
}

.gallery-image-failed {
  padding: 12px;
  color: #acc1d2;
  background: repeating-linear-gradient(135deg, #102c42 0 10px, #0b233b 10px 20px);
}

.gallery-thumbnail p {
  overflow: hidden;
  margin: 7px 2px 0;
  color: #acc1d2;
  font-family: Consolas, monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-manage-actions,
.gallery-pagination {
  flex: 0 0 auto;
  flex-wrap: wrap;
  margin-top: 16px;
}

.gallery-manage-actions span { color: #acc1d2; font-size: 13px; }
.gallery-selected-file { font-family: Consolas, monospace; }
.gallery-pagination { justify-content: center; color: #acc1d2; }

.gallery-preview {
  display: grid;
  min-height: 0;
  gap: 14px;
  margin-top: 18px;
}

.gallery-preview-actions { justify-content: space-between; }
.gallery-original-stage {
  display: grid;
  min-height: 320px;
  max-height: calc(100vh - 260px);
  place-items: center;
  overflow: hidden;
  border: 1px solid #29485e;
  background: #020b17;
}

.gallery-original {
  display: block;
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 260px);
  object-fit: contain;
}

.gallery-original-failed {
  color: #acc1d2;
  text-align: center;
}

.gallery-preview-navigation { justify-content: center; }

.gallery-delete-confirm {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(1, 10, 23, .7);
}

.gallery-delete-confirm-panel {
  width: min(420px, 100%);
  border: 1px solid #d8b45b;
  padding: 22px;
  color: #fffdf6;
  background: #071a33;
  box-shadow: 0 18px 60px rgba(0, 0, 0, .58);
  text-align: center;
}

@media (max-width: 820px) {
  .gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .gallery-header { align-items: flex-start; }
  .gallery-header-actions { flex-wrap: wrap; justify-content: flex-end; }
}

@media (max-width: 520px) {
  .gallery-backdrop { padding: 0; }
  .gallery-dialog { width: 100vw; max-height: 100vh; min-height: 100vh; border-right: 0; border-left: 0; padding: 16px; }
  .gallery-header { flex-direction: column; }
  .gallery-header-actions { width: 100%; justify-content: flex-start; }
  .gallery-grid { grid-template-columns: 1fr !important; }
  .gallery-original-stage { min-height: 240px; }
}

@media (prefers-reduced-motion: reduce) {
  .gallery-dialog button { transition: none; }
}
</style>
