<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { imageApi } from '../api/imageApi'
import type { CityStatistics } from '../api/imageTypes'
import { summarizeCoverage } from '../statistics/coverage'
import { breakdownDistricts } from '../statistics/districts'
import { fillMonthRange } from '../statistics/months'
import { buildTagDisplay } from '../statistics/tags'

const props = defineProps<{ cityCode: string; cityName: string }>()
const emit = defineEmits<{ close: []; select: [districtCode: string] }>()

const drawerRef = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const data = ref<CityStatistics>()
let returnFocus: HTMLElement | null = null

const coverage = computed(() =>
  summarizeCoverage(props.cityCode, (data.value?.districts ?? []).map((district) => district.districtCode)))

const breakdown = computed(() => breakdownDistricts(props.cityCode, data.value?.districts ?? []))

const months = computed(() => fillMonthRange(data.value?.months ?? []))
const peakMonthCount = computed(() => Math.max(1, ...months.value.map((bucket) => bucket.footprintCount)))
const monthBarHeight = (footprintCount: number) =>
  `${Math.round((footprintCount / peakMonthCount.value) * 100)}%`

const tags = computed(() => buildTagDisplay(data.value?.tags ?? []))

const load = async () => {
  status.value = 'loading'
  try {
    data.value = await imageApi.statistics({ cityCode: props.cityCode })
    status.value = 'ready'
  } catch {
    data.value = undefined
    status.value = 'error'
  }
}

const requestClose = () => emit('close')
const selectDistrict = (districtCode: string) => emit('select', districtCode)

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  event.preventDefault()
  requestClose()
}

onMounted(() => {
  returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : null
  document.addEventListener('keydown', handleKeydown)
  drawerRef.value?.focus()
  void load()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (returnFocus?.isConnected) returnFocus.focus()
})
</script>

<template>
  <aside ref="drawerRef" class="statistics-drawer" tabindex="-1">
    <header class="statistics-heading">
      <div>
        <p class="eyebrow">CITY STATISTICS</p>
        <h2>足迹统计</h2>
      </div>
      <button class="statistics-close" type="button" @click="requestClose">关闭统计</button>
    </header>
    <p v-if="status === 'loading'" class="statistics-status" aria-live="polite">正在汇总当前市足迹…</p>
    <div v-else-if="status === 'error'" class="statistics-status" role="status">
      <p class="statistics-error">统计加载失败，请重新加载。</p>
      <button class="statistics-retry" type="button" @click="load">重新加载</button>
    </div>
    <template v-else-if="data">
      <p class="statistics-scope">{{ cityName }} · 共 {{ coverage.totalCount }} 个区县</p>
      <ul class="statistics-overview">
        <li class="statistics-metric">
          <span class="metric-value">{{ data.footprintCount }}</span>
          <span class="metric-label">足迹数</span>
        </li>
        <li class="statistics-metric">
          <span class="metric-value">{{ data.imageCount }}</span>
          <span class="metric-label">图片总数</span>
        </li>
        <li class="statistics-metric">
          <span class="metric-value">{{ coverage.visitedCount }}</span>
          <span class="metric-label">打卡区县数</span>
        </li>
        <li class="statistics-metric">
          <span class="metric-value">{{ coverage.percentage }}%</span>
          <span class="metric-label">区县覆盖率</span>
        </li>
      </ul>
      <div class="statistics-coverage" role="img" :aria-label="`区县覆盖率 ${coverage.percentage}%`">
        <div class="statistics-coverage-track">
          <div class="statistics-coverage-fill" :style="{ width: `${coverage.percentage}%` }"></div>
        </div>
      </div>
      <section class="statistics-months">
        <h3>逐月足迹</h3>
        <ol class="statistics-month-strip">
          <li
            v-for="bucket in months"
            :key="bucket.month"
            class="statistics-month-cell"
            :class="{ 'is-empty': bucket.footprintCount === 0 }"
            :data-month="bucket.month"
            :aria-label="`${bucket.month} 共 ${bucket.footprintCount} 条足迹`"
          >
            <span class="statistics-month-bar" :style="{ height: monthBarHeight(bucket.footprintCount) }"></span>
            <span class="statistics-month-label">{{ bucket.month }}</span>
          </li>
        </ol>
      </section>
      <section class="statistics-ranking">
        <h3>打卡区县排行</h3>
        <ol class="statistics-ranking-list">
          <li v-for="entry in breakdown.ranking" :key="entry.districtCode">
            <button class="statistics-ranking-item" type="button" @click="selectDistrict(entry.districtCode)">
              <span class="statistics-row-name">{{ entry.name }}</span>
              <span class="statistics-row-count">{{ entry.footprintCount }}</span>
            </button>
          </li>
        </ol>
      </section>
      <section class="statistics-unvisited">
        <h3>未打卡区县</h3>
        <p v-if="breakdown.unvisited.length === 0" class="statistics-complete">全部区县都已打卡。</p>
        <ul v-else class="statistics-unvisited-list">
          <li v-for="entry in breakdown.unvisited" :key="entry.districtCode">
            <button class="statistics-unvisited-item" type="button" @click="selectDistrict(entry.districtCode)">
              {{ entry.name }}
            </button>
          </li>
        </ul>
      </section>
      <section class="statistics-tags">
        <h3>常用标签</h3>
        <p v-if="tags.length === 0" class="statistics-empty">还没有用户标签。</p>
        <ul v-else class="statistics-tag-list">
          <li v-for="entry in tags" :key="entry.tag" class="statistics-tag-item">
            <span class="statistics-tag-bar" :style="{ width: `${Math.round(entry.ratio * 100)}%` }"></span>
            <span class="statistics-row-name">{{ entry.tag }}</span>
            <span class="statistics-row-count">{{ entry.count }}</span>
          </li>
        </ul>
      </section>
    </template>
  </aside>
</template>
