import { ref } from 'vue'
import type { MemoryDivision } from './divisionContext'

type PanelStatus = 'loading' | 'ready' | 'empty' | 'error'

export interface MemoryPageLoader<T> {
  load(scope: MemoryDivision, page: number, size: number): Promise<{ total: number; page: number; size: number; records: T[] }>
}

export const createMemoryPanelState = <T>(loader: MemoryPageLoader<T>, scope: MemoryDivision, pageSize = 10) => {
  const state = ref<PanelStatus>('loading')
  const records = ref<T[]>([])
  const page = ref(1)
  const total = ref(0)
  const error = ref('')
  const actionError = ref('')

  const load = async (nextPage = page.value) => {
    state.value = 'loading'
    records.value = []
    error.value = ''
    actionError.value = ''
    try {
      const result = await loader.load(scope, nextPage, pageSize)
      page.value = result.page
      total.value = result.total
      records.value = result.records
      state.value = result.records.length ? 'ready' : 'empty'
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '无法加载足迹。'
      state.value = 'error'
    }
  }

  const refreshAfterDelete = () => load(page.value > 1 && records.value.length <= 1 ? page.value - 1 : page.value)
  const reportActionError = (cause: unknown) => {
    actionError.value = cause instanceof Error ? cause.message : '操作失败，请重试。'
  }

  return {
    state,
    records,
    page,
    total,
    error,
    actionError,
    load,
    retry: () => load(page.value),
    refreshAfterDelete,
    reportActionError
  }
}
