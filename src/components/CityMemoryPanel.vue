<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { imageApi } from '../api/imageApi'
import type { CityMemory } from '../api/imageTypes'
import { createCityMemoryLoader } from '../memories/cityMemoryLoader'
import { createUploadLocation, type MemoryDivision } from '../memories/divisionContext'
import { validateImageFile, validateMemoryForm } from '../memories/memoryForm'
import { createMemoryPanelState } from '../memories/memoryPanelState'
import { createMemoryTags } from '../memories/memoryTags'
import { openDatePicker } from '../utils/datePicker'
import FootprintGalleryModal from './FootprintGalleryModal.vue'

const props = defineProps<{ division: MemoryDivision }>()
const panel = createMemoryPanelState(createCityMemoryLoader(imageApi), props.division)
const formOpen = ref(false)
const editing = ref<CityMemory>()
const title = ref('')
const visitedAt = ref('')
const feeling = ref('')
const userTags = ref('')
const file = ref<File>()
const formError = ref('')
const submitting = ref(false)
const deletingId = ref<string>()
const deletingMemory = ref<CityMemory>()
const galleryMemory = ref<CityMemory>()
const panelRoot = ref<HTMLElement>()
const failedCovers = ref<Set<string>>(new Set())
const pageCount = computed(() => Math.max(1, Math.ceil(panel.total.value / 10)))

const reset = () => {
  editing.value = undefined
  title.value = ''
  visitedAt.value = ''
  feeling.value = ''
  userTags.value = ''
  file.value = undefined
  formError.value = ''
}
const openCreate = () => {
  if (!props.division.abilities.create) return
  reset()
  formOpen.value = true
}
const openEdit = (memory: CityMemory) => {
  if (!props.division.abilities.update) return
  editing.value = memory
  title.value = memory.title
  visitedAt.value = memory.visitedAt
  feeling.value = memory.feeling
  userTags.value = memory.tags.join(', ')
  file.value = undefined
  formError.value = ''
  formOpen.value = true
}
const selectFile = (event: Event) => { file.value = (event.target as HTMLInputElement).files?.[0] }
const tags = () => createMemoryTags(visitedAt.value, userTags.value.split(',').map((tag) => tag.trim())).join(',')
const submit = async () => {
  const validationError = validateMemoryForm({
    title: title.value,
    visitedAt: visitedAt.value,
    hasFile: Boolean(file.value),
    isEditing: Boolean(editing.value)
  })
  if (validationError) { formError.value = validationError; return }
  if (file.value) {
    const fileError = validateImageFile(file.value)
    if (fileError) { formError.value = fileError; return }
  }

  submitting.value = true
  formError.value = ''
  try {
    const input = {
      title: title.value.trim(),
      description: feeling.value.trim(),
      tags: tags(),
      ...(file.value ? { file: file.value } : {})
    }
    if (editing.value) {
      await imageApi.update({ id: editing.value.id, ...input })
    } else {
      if (props.division.level !== 'district' || !file.value) return
      await imageApi.upload({ ...input, file: file.value, ...createUploadLocation(props.division) })
    }
    formOpen.value = false
    reset()
    await panel.load()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '无法保存足迹。'
  } finally {
    submitting.value = false
  }
}
const requestRemove = (memory: CityMemory) => {
  if (props.division.abilities.delete) deletingMemory.value = memory
}
const confirmRemove = async () => {
  const memory = deletingMemory.value
  if (!memory) return
  deletingId.value = memory.id
  try {
    await imageApi.delete(memory.id)
    deletingMemory.value = undefined
    await panel.refreshAfterDelete()
  } catch (error) {
    panel.reportActionError(error)
  } finally {
    deletingId.value = undefined
  }
}
const openGallery = (memory: CityMemory) => { galleryMemory.value = memory }
const closeGallery = async () => {
  const informationId = galleryMemory.value?.id
  galleryMemory.value = undefined
  await nextTick()
  const replacementTrigger = informationId
    ? [...(panelRoot.value?.querySelectorAll<HTMLElement>('[data-gallery-trigger-id]') ?? [])]
        .find((element) => element.dataset.galleryTriggerId === informationId)
    : undefined
  const focusTarget = replacementTrigger ?? panelRoot.value
  focusTarget?.focus()
  setTimeout(() => focusTarget?.isConnected && focusTarget.focus(), 0)
}
const markCoverFailed = (memoryId: string) => {
  failedCovers.value = new Set(failedCovers.value).add(memoryId)
}
const handleGalleryChanged = async () => {
  failedCovers.value = new Set()
  await panel.refreshAfterImageChange()
}

onMounted(() => panel.load())
</script>

<template>
  <section ref="panelRoot" class="memory-panel" aria-labelledby="memory-title" data-gallery-focus-fallback tabindex="-1">
    <header class="memory-heading">
      <div><p class="eyebrow">TRAVEL NOTES</p><h2 id="memory-title">我的 {{ division.name }} 足迹</h2></div>
      <button v-if="division.abilities.create" class="memory-action" @click="openCreate">上传照片</button>
    </header>
    <p v-if="panel.actionError.value" class="memory-error memory-action-error">{{ panel.actionError.value }}</p>
    <p v-if="panel.state.value === 'loading'" class="memory-status">正在整理这里的记忆…</p>
    <div v-else-if="panel.state.value === 'error'" class="memory-status">
      <p>{{ panel.error.value }}</p><button class="memory-action" @click="panel.retry">重新加载</button>
    </div>
    <div v-else-if="panel.state.value === 'empty'" class="memory-status">
      <p>这里还没有你的足迹。</p><button v-if="division.abilities.create" class="memory-action" @click="openCreate">留下第一张照片</button>
    </div>
    <div v-else class="memory-grid">
      <article v-for="memory in panel.records.value" :key="memory.id" class="memory-card">
        <button class="memory-cover" type="button" :data-gallery-trigger-id="memory.id" :aria-label="`打开 ${memory.title} 图片集`" @click="openGallery(memory)">
          <img
            v-if="memory.coverImage && !failedCovers.has(memory.id)"
            :src="memory.coverImage.thumbnailUrl"
            :alt="memory.title"
            @error="markCoverFailed(memory.id)"
          >
          <span v-else class="memory-photo-placeholder">
            {{ failedCovers.has(memory.id) ? '封面加载失败' : memory.imageCount === 0 ? '暂无图片' : '封面暂时无法载入' }}
          </span>
          <span class="memory-image-count">{{ memory.imageCount }} 张</span>
        </button>
        <p v-if="division.level === 'city'" class="memory-district">{{ memory.districtName }}</p>
        <p class="memory-date">{{ memory.visitedAt }}</p>
        <h3>{{ memory.title }}</h3>
        <p>{{ memory.feeling || '未填写感受。' }}</p>
        <p class="memory-tags">{{ memory.tags.join(' · ') }}</p>
        <div>
          <button v-if="division.abilities.update" aria-label="编辑足迹" :disabled="deletingId === memory.id" @click="openEdit(memory)">编辑</button>
          <button
            v-if="division.abilities.delete"
            aria-label="删除足迹"
            :disabled="deletingId === memory.id"
            @click="requestRemove(memory)"
          >{{ deletingId === memory.id ? '删除中…' : '删除足迹' }}</button>
        </div>
      </article>
    </div>
    <nav v-if="panel.state.value === 'ready' && pageCount > 1" class="memory-pagination">
      <button :disabled="panel.page.value === 1" @click="panel.load(panel.page.value - 1)">上一页</button>
      <span>{{ panel.page.value }} / {{ pageCount }}</span>
      <button :disabled="panel.page.value === pageCount" @click="panel.load(panel.page.value + 1)">下一页</button>
    </nav>
    <form v-if="formOpen" class="memory-form" @submit.prevent="submit">
      <h3>{{ editing ? '编辑足迹' : '留下足迹' }}</h3>
      <label v-if="!editing">照片 <input type="file" accept="image/jpeg,image/png" required @change="selectFile"></label>
      <label>标题 <input v-model="title" required aria-label="足迹标题"></label>
      <label>游玩日期 <input v-model="visitedAt" type="date" required aria-label="选择游玩日期" @click="openDatePicker" @keydown.prevent @paste.prevent></label>
      <label>感受 <textarea v-model="feeling" rows="3"></textarea></label>
      <label>标签（逗号分隔）<input v-model="userTags"></label>
      <p v-if="formError" class="memory-error">{{ formError }}</p>
      <div><button type="button" @click="formOpen = false">取消</button><button class="memory-action" :disabled="submitting" type="submit">{{ submitting ? '保存中…' : '保存足迹' }}</button></div>
    </form>
    <div v-if="deletingMemory" class="memory-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="memory-delete-title">
      <h3 id="memory-delete-title">删除足迹“{{ deletingMemory.title }}”</h3>
      <p>这会删除整条足迹及其 {{ deletingMemory.imageCount }} 张图片，操作不可恢复。</p>
      <div>
        <button type="button" aria-label="取消删除足迹" :disabled="deletingId === deletingMemory.id" @click="deletingMemory = undefined">取消</button>
        <button type="button" aria-label="确认删除足迹" :disabled="deletingId === deletingMemory.id" @click="confirmRemove">
          {{ deletingId === deletingMemory.id ? '删除中…' : '确认删除足迹' }}
        </button>
      </div>
    </div>
    <FootprintGalleryModal
      v-if="galleryMemory"
      :information-id="galleryMemory.id"
      :title="galleryMemory.title"
      :api="imageApi"
      @close="closeGallery"
      @changed="handleGalleryChanged"
    />
  </section>
</template>
