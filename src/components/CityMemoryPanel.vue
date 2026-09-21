<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { imageApi } from '../api/imageApi'
import type { CityMemory } from '../api/imageTypes'
import { createCityMemoryLoader } from '../memories/cityMemoryLoader'
import type { MemoryDivision } from '../memories/divisionContext'
import { createMemoryPanelState } from '../memories/memoryPanelState'
import FootprintGalleryModal from './FootprintGalleryModal.vue'
import MemoryDeleteConfirmModal from './MemoryDeleteConfirmModal.vue'
import MemoryFormModal from './MemoryFormModal.vue'

const props = defineProps<{ division: MemoryDivision }>()
const panel = createMemoryPanelState(createCityMemoryLoader(imageApi), props.division)
const formOpen = ref(false)
const editing = ref<CityMemory>()
const deletingMemory = ref<CityMemory>()
const galleryMemory = ref<CityMemory>()
const panelRoot = ref<HTMLElement>()
const failedCovers = ref<Set<string>>(new Set())
const pageCount = computed(() => Math.max(1, Math.ceil(panel.total.value / 10)))

// 表单字段与提交都归 MemoryFormModal 所有，面板只保留"哪个足迹正在被编辑"与开合状态。
const openCreate = () => {
  if (!props.division.abilities.create) return
  editing.value = undefined
  formOpen.value = true
}
const openEdit = (memory: CityMemory) => {
  if (!props.division.abilities.update) return
  editing.value = memory
  formOpen.value = true
}
const closeForm = () => {
  formOpen.value = false
  editing.value = undefined
}
const handleSaved = async () => {
  closeForm()
  await panel.load()
}
const requestRemove = (memory: CityMemory) => {
  if (props.division.abilities.delete) deletingMemory.value = memory
}
const handleDeleted = async () => {
  deletingMemory.value = undefined
  await panel.refreshAfterDelete()
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
      <button v-if="division.abilities.create" class="memory-action" @click="openCreate">创建足迹</button>
    </header>
    <p v-if="panel.actionError.value" class="memory-error memory-action-error">{{ panel.actionError.value }}</p>
    <p v-if="panel.state.value === 'loading'" class="memory-status">正在整理这里的记忆…</p>
    <div v-else-if="panel.state.value === 'error'" class="memory-status">
      <p>{{ panel.error.value }}</p><button class="memory-action" @click="panel.retry">重新加载</button>
    </div>
    <div v-else-if="panel.state.value === 'empty'" class="memory-status">
      <p>这里还没有你的足迹。</p><button v-if="division.abilities.create" class="memory-action" @click="openCreate">留下第一个足迹</button>
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
          <button v-if="division.abilities.update" aria-label="编辑足迹" @click="openEdit(memory)">编辑</button>
          <button v-if="division.abilities.delete" aria-label="删除足迹" @click="requestRemove(memory)">删除足迹</button>
        </div>
      </article>
    </div>
    <nav v-if="panel.state.value === 'ready' && pageCount > 1" class="memory-pagination">
      <button :disabled="panel.page.value === 1" @click="panel.load(panel.page.value - 1)">上一页</button>
      <span>{{ panel.page.value }} / {{ pageCount }}</span>
      <button :disabled="panel.page.value === pageCount" @click="panel.load(panel.page.value + 1)">下一页</button>
    </nav>
    <MemoryFormModal
      v-if="formOpen"
      :division="division"
      :api="imageApi"
      :editing="editing"
      @close="closeForm"
      @saved="handleSaved"
    />
    <MemoryDeleteConfirmModal
      v-if="deletingMemory"
      :memory="deletingMemory"
      :api="imageApi"
      @close="deletingMemory = undefined"
      @deleted="handleDeleted"
    />
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
