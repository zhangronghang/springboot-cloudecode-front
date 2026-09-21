<script lang="ts">
import type { ImageLocationInput, ImageWriteInput } from '../api/imageApi'

export interface MemoryFormApi {
  upload(input: ImageWriteInput & ImageLocationInput & { file: File; title: string }): Promise<unknown>
  update(input: Omit<ImageWriteInput, 'file'> & { id: string }): Promise<unknown>
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { CityMemory } from '../api/imageTypes'
import { createUploadLocation, type MemoryDivision } from '../memories/divisionContext'
import { validateImageFile, validateMemoryForm } from '../memories/memoryForm'
import { createMemoryTags } from '../memories/memoryTags'
import { COMMON_MEMORY_TAGS, createTagInput } from '../memories/tagInput'
import { useModalDialog } from '../modal/useModalDialog'
import { openDatePicker } from '../utils/datePicker'

const props = defineProps<{
  division: MemoryDivision
  api: MemoryFormApi
  editing?: CityMemory
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const isEditing = computed(() => Boolean(props.editing))
const title = ref(props.editing?.title ?? '')
const visitedAt = ref(props.editing?.visitedAt ?? '')
const feeling = ref(props.editing?.feeling ?? '')
const {
  tags: tagList,
  draft: tagDraft,
  addTag,
  removeTag,
  hasTag,
  resolve: resolveTags
} = createTagInput(props.editing?.tags ?? [])

const { dialogRef, requestClose, handleKeydown } = useModalDialog({
  onClose: () => emit('close')
})

const file = ref<File>()
const previewUrl = ref('')
const formError = ref('')
const dragging = ref(false)
let dragDepth = 0

const releasePreview = () => {
  if (!previewUrl.value) return
  URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

const setFile = (next?: File) => {
  if (!next) return
  releasePreview()
  // 即使文件不合法也记下来：提交时要能区分"没选照片"和"选了不合法照片"，
  // 否则后者的校验错误会被"请选择一张照片"覆盖掉。
  file.value = next
  const error = validateImageFile(next)
  if (error) {
    formError.value = error
    return
  }
  previewUrl.value = URL.createObjectURL(next)
  formError.value = ''
}

const selectFile = (event: Event) => {
  setFile((event.target as HTMLInputElement).files?.[0])
}

const dragEnter = () => {
  dragDepth += 1
  dragging.value = true
}

const dragLeave = () => {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}

const dropFile = (event: DragEvent) => {
  dragDepth = 0
  dragging.value = false
  setFile(event.dataTransfer?.files?.[0])
}

const openFilePicker = () => {
  dialogRef.value?.querySelector<HTMLInputElement>('input[type="file"]')?.click()
}

// 日期字段沿用改造前的行为：手动输入与粘贴被拦截，只通过日期选择器修改。
// 但必须放行 Tab 与 Escape，否则焦点陷阱无法把焦点移出该字段，弹窗也无法用 ESC 关闭。
const blockDateTyping = (event: KeyboardEvent) => {
  if (event.key !== 'Tab' && event.key !== 'Escape') event.preventDefault()
}

const commitDraftTag = () => {
  addTag(tagDraft.value)
  tagDraft.value = ''
}

const submitting = ref(false)

const submit = async () => {
  const validationError = validateMemoryForm({
    title: title.value,
    visitedAt: visitedAt.value,
    hasFile: Boolean(file.value),
    isEditing: isEditing.value
  })
  if (validationError) {
    formError.value = validationError
    return
  }
  if (!isEditing.value && file.value) {
    const fileError = validateImageFile(file.value)
    if (fileError) {
      formError.value = fileError
      return
    }
  }

  const input = {
    title: title.value.trim(),
    description: feeling.value.trim(),
    tags: createMemoryTags(visitedAt.value, resolveTags()).join(',')
  }

  submitting.value = true
  formError.value = ''
  try {
    if (props.editing) {
      await props.api.update({ id: props.editing.id, ...input })
    } else {
      if (props.division.level !== 'district' || !file.value) return
      await props.api.upload({ ...input, file: file.value, ...createUploadLocation(props.division) })
    }
    emit('saved')
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '无法保存足迹。'
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => releasePreview())
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="requestClose">
      <section
        ref="dialogRef"
        class="modal-dialog memory-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-form-title"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <header class="memory-form-header">
          <div>
            <p class="memory-form-eyebrow">TRAVEL NOTES</p>
            <h2 id="memory-form-title">{{ isEditing ? '编辑足迹' : '留下足迹' }}</h2>
          </div>
          <button type="button" class="memory-form-close" aria-label="关闭表单" @click="requestClose">关闭</button>
        </header>

        <form class="memory-form" @submit.prevent="submit">
          <div class="memory-form-body">
            <div v-if="!isEditing" class="memory-field memory-photo-field">
              <span class="memory-field-label">照片<span class="memory-required">必填</span></span>
              <div
                class="memory-photo-drop"
                :class="{ 'is-dragging': dragging }"
                @dragenter="dragEnter"
                @dragleave="dragLeave"
                @dragover.prevent
                @drop.prevent="dropFile"
              >
                <div v-if="previewUrl" class="memory-photo-preview">
                  <img :src="previewUrl" :alt="file?.name">
                  <div class="memory-photo-meta">
                    <p class="memory-photo-name">{{ file?.name }}</p>
                    <button type="button" aria-label="重新选择照片" @click="openFilePicker">重新选择</button>
                  </div>
                </div>
                <template v-else>
                  <p class="memory-photo-hint">把照片拖到这里</p>
                  <button type="button" aria-label="选择照片文件" @click="openFilePicker">选择照片</button>
                </template>
                <input
                  class="memory-photo-input"
                  type="file"
                  accept="image/jpeg,image/png"
                  aria-label="选择足迹照片"
                  tabindex="-1"
                  @change="selectFile"
                >
              </div>
            </div>

            <label class="memory-field">
              <span class="memory-field-label">标题<span class="memory-required">必填</span></span>
              <input v-model="title" required aria-label="足迹标题">
            </label>

            <label class="memory-field">
              <span class="memory-field-label">游玩日期<span class="memory-required">必填</span></span>
              <input
                v-model="visitedAt"
                type="date"
                required
                aria-label="选择游玩日期"
                @click="openDatePicker"
                @keydown="blockDateTyping"
                @paste.prevent
              >
            </label>

            <label class="memory-field">
              <span class="memory-field-label">感受</span>
              <textarea v-model="feeling" rows="3" aria-label="足迹感受"></textarea>
            </label>

            <div class="memory-field">
              <span class="memory-field-label">标签</span>
              <div class="memory-tag-input">
                <span v-for="tag in tagList" :key="tag" class="memory-tag-chip">
                  <span>{{ tag }}</span>
                  <button type="button" :aria-label="`移除标签 ${tag}`" @click="removeTag(tag)">移除</button>
                </span>
                <input
                  v-model="tagDraft"
                  aria-label="添加标签"
                  placeholder="回车添加"
                  @keydown.enter.prevent="commitDraftTag"
                >
              </div>
              <div class="memory-tag-suggestions">
                <button
                  v-for="tag in COMMON_MEMORY_TAGS"
                  :key="tag"
                  type="button"
                  class="memory-tag-suggestion"
                  :disabled="hasTag(tag)"
                  @click="addTag(tag)"
                >{{ tag }}</button>
              </div>
            </div>
          </div>

          <p v-if="formError" class="memory-error">{{ formError }}</p>

          <footer class="memory-form-actions">
            <button type="button" aria-label="取消填写足迹" @click="requestClose">取消</button>
            <button type="submit" class="memory-action" :disabled="submitting">
              {{ submitting ? '保存中…' : '保存足迹' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
/* 遮罩与弹窗外壳来自 styles.css 的 .modal-backdrop / .modal-dialog，与删除确认弹窗
   共用同一套浮层样式；这里只放表单弹窗自己的内容样式。 */
.memory-form-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid #31536b;
  padding: 0 0 16px;
}

.memory-form-eyebrow {
  margin: 0 0 6px;
  color: #d8b45b;
  font-family: Consolas, monospace;
  font-size: 11px;
  letter-spacing: .16em;
}

.memory-form-header h2 {
  margin: 0;
  color: #fffdf6;
  font-family: 'STSong', 'SimSun', serif;
  font-size: clamp(22px, 3vw, 30px);
  letter-spacing: .04em;
}

.memory-form {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 0;
}

/* 弹窗主体是唯一的滚动区域，长表单在窄屏也不会把底部按钮挤出视口 */
.memory-form-body {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 18px 2px 0;
  overflow-y: auto;
}

.memory-field {
  display: grid;
  gap: 7px;
  margin: 0;
  color: #c2d5e0;
}

.memory-field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #acc1d2;
  font-family: Consolas, monospace;
  font-size: 12px;
  letter-spacing: .08em;
}

.memory-required {
  border: 1px solid #a8792f;
  padding: 1px 6px;
  color: #e6b756;
  background: rgba(216, 180, 91, .12);
  font-size: 10px;
  letter-spacing: .1em;
}

.memory-form-body input,
.memory-form-body textarea {
  border: 1px solid #31536b;
  padding: 9px;
  color: #fffdf6;
  background: #071a33;
  font: inherit;
}

.memory-form-body textarea {
  resize: vertical;
}

.memory-photo-drop {
  display: grid;
  gap: 10px;
  justify-items: center;
  border: 1px dashed #496a81;
  padding: 22px 16px;
  background: rgba(7, 26, 51, .6);
  text-align: center;
  transition: border-color .16s ease, background .16s ease;
}

.memory-photo-drop.is-dragging {
  border-color: #e6b756;
  background: rgba(216, 180, 91, .12);
}

.memory-photo-hint {
  margin: 0;
  color: #acc1d2;
  font-family: Consolas, monospace;
  font-size: 12px;
}

/* 文件输入由投放区按钮代理，移出 Tab 序列以免焦点停在不可见元素上 */
.memory-photo-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  border: 0;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.memory-photo-preview {
  display: grid;
  gap: 10px;
  justify-items: center;
}

.memory-photo-preview img {
  max-width: 100%;
  max-height: 220px;
  border: 1px solid #29485e;
  object-fit: contain;
}

.memory-photo-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.memory-photo-name {
  margin: 0;
  color: #acc1d2;
  font-family: Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.memory-tag-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  border: 1px solid #31536b;
  padding: 8px;
  background: #071a33;
}

.memory-form-dialog .memory-tag-input > input {
  flex: 1 1 110px;
  min-width: 0;
  border: 0;
  padding: 4px 2px;
  background: transparent;
}

.memory-form-dialog .memory-tag-input > input:focus-visible {
  outline: none;
}

.memory-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #a8792f;
  padding: 3px 4px 3px 9px;
  color: #e6b756;
  background: rgba(216, 180, 91, .12);
  font-family: Consolas, monospace;
  font-size: 12px;
}

.memory-form-dialog .memory-tag-chip button {
  border: 0;
  padding: 1px 5px;
  color: #e6b756;
  background: transparent;
  font-size: 11px;
}

.memory-form-dialog .memory-tag-chip button:hover:not(:disabled) {
  border-color: transparent;
  color: #11283d;
  background: #d8b45b;
  transform: none;
}

.memory-tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.memory-form-dialog .memory-tag-suggestion {
  border-color: #29485e;
  padding: 4px 9px;
  color: #acc1d2;
  background: transparent;
  font-size: 12px;
}

.memory-error {
  flex: 0 0 auto;
  margin: 14px 0 0;
  border-left: 3px solid #ffb4a3;
  padding: 9px 12px;
  color: #ffb4a3;
  background: rgba(255, 180, 163, .1);
}

.memory-form-actions {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #29485e;
  margin-top: 16px;
  padding-top: 16px;
}

.memory-form-dialog .memory-action {
  border-color: #d8b45b;
  color: #11283d;
  background: #d8b45b;
  font-weight: 600;
}

.memory-form-dialog .memory-action:hover:not(:disabled) {
  border-color: #e6b756;
  color: #11283d;
  background: #e6b756;
}

@media (max-width: 720px) {
  .memory-form-body {
    gap: 14px;
  }

  .memory-form-actions {
    flex-direction: column-reverse;
  }

  .memory-form-dialog .memory-form-actions button {
    width: 100%;
  }
}
</style>
