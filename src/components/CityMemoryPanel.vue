<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { imageApi } from '../api/imageApi'
import type { CityMemory } from '../api/imageTypes'
import { createCityMemoryLoader } from '../memories/cityMemoryLoader'
import { createUploadLocation, type MemoryDivision } from '../memories/divisionContext'
import { validateMemoryForm } from '../memories/memoryForm'
import { createMemoryPanelState } from '../memories/memoryPanelState'
import { createMemoryTags } from '../memories/memoryTags'
import { openDatePicker } from '../utils/datePicker'

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
const remove = async (memory: CityMemory) => {
  if (!props.division.abilities.delete || !window.confirm(`删除“${memory.title}”吗？此操作无法恢复。`)) return
  deletingId.value = memory.id
  try {
    await imageApi.delete(memory.id)
    await panel.refreshAfterDelete()
  } catch (error) {
    panel.reportActionError(error)
  } finally {
    deletingId.value = undefined
  }
}
const imageSource = (memory: CityMemory) => memory.imageBase64?.startsWith('data:')
  ? memory.imageBase64
  : `data:image/*;base64,${memory.imageBase64}`

onMounted(() => panel.load())
</script>

<template>
  <section class="memory-panel" aria-labelledby="memory-title">
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
        <img v-if="memory.imageBase64" :src="imageSource(memory)" :alt="memory.title">
        <div v-else class="memory-photo-placeholder">{{ memory.imageLoadFailed ? '照片暂时无法载入' : '正在载入照片' }}</div>
        <p v-if="division.level === 'city'" class="memory-district">{{ memory.districtName }}</p>
        <p class="memory-date">{{ memory.visitedAt }}</p>
        <h3>{{ memory.title }}</h3>
        <p>{{ memory.feeling || '未填写感受。' }}</p>
        <p class="memory-tags">{{ memory.tags.join(' · ') }}</p>
        <div>
          <button v-if="division.abilities.update" :disabled="deletingId === memory.id" @click="openEdit(memory)">编辑</button>
          <button v-if="division.abilities.delete" :disabled="deletingId === memory.id" @click="remove(memory)">{{ deletingId === memory.id ? '删除中…' : '删除' }}</button>
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
      <label>照片 <input type="file" accept="image/*" :required="!editing" @change="selectFile"></label>
      <label>标题 <input v-model="title" required></label>
      <label>游玩日期 <input v-model="visitedAt" type="date" required aria-label="选择游玩日期" @click="openDatePicker" @keydown.prevent @paste.prevent></label>
      <label>感受 <textarea v-model="feeling" rows="3"></textarea></label>
      <label>标签（逗号分隔）<input v-model="userTags"></label>
      <p v-if="formError" class="memory-error">{{ formError }}</p>
      <div><button type="button" @click="formOpen = false">取消</button><button class="memory-action" :disabled="submitting" type="submit">{{ submitting ? '保存中…' : '保存足迹' }}</button></div>
    </form>
  </section>
</template>
