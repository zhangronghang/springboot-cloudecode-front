import { ref } from 'vue'
import type { DivisionScope } from './memoryTags'

type PanelStatus = 'loading' | 'ready' | 'empty' | 'error'

export interface MemoryPageLoader<T> {
  load(division: string | DivisionScope, page: number, size: number): Promise<{ total: number; page: number; size: number; records: T[] }>
}

export const createMemoryPanelState = <T>(loader: MemoryPageLoader<T>, division: string | DivisionScope, pageSize = 10) => {
  const state = ref<PanelStatus>('loading')
  const records = ref<T[]>([])
  const page = ref(1)
  const total = ref(0)
  const error = ref('')

  const load = async (nextPage = page.value) => {
    state.value = 'loading'
    records.value = []
    error.value = ''
    try {
      const result = await loader.load(division, nextPage, pageSize)
      page.value = result.page
      total.value = result.total
      records.value = result.records
      state.value = result.records.length ? 'ready' : 'empty'
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '无法加载城市足迹。'
      state.value = 'error'
    }
  }

  return { state, records, page, total, error, load, retry: () => load(page.value) }
}
