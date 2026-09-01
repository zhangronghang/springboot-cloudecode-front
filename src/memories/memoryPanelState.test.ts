import { describe, expect, it, vi } from 'vitest'
import { createCityScope } from './divisionContext'
import { createMemoryPanelState } from './memoryPanelState'

const scope = createCityScope({ provinceCode: '440000', cityCode: '440300', name: '深圳市' })

describe('足迹页面状态', () => {
  it('加载、分页并在空结果显示空状态', async () => {
    const loader = { load: vi.fn().mockResolvedValue({ total: 0, page: 1, size: 10, records: [] }) }
    const panel = createMemoryPanelState(loader, scope)

    await panel.load()

    expect(panel.state.value).toBe('empty')
    expect(loader.load).toHaveBeenCalledWith(scope, 1, 10)
  })

  it('列表失败后清除陈旧记录并可重试', async () => {
    const loader = {
      load: vi.fn()
        .mockResolvedValueOnce({ total: 1, page: 1, size: 10, records: [{ id: '1' }] })
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce({ total: 1, page: 1, size: 10, records: [{ id: '2' }] })
    }
    const panel = createMemoryPanelState(loader, scope)
    await panel.load()

    await panel.load()
    expect(panel.state.value).toBe('error')
    expect(panel.records.value).toEqual([])

    await panel.retry()
    expect(panel.state.value).toBe('ready')
    expect(panel.records.value).toEqual([{ id: '2' }])
  })

  it('删除非首页最后一条后加载上一页', async () => {
    const loader = {
      load: vi.fn()
        .mockResolvedValueOnce({ total: 11, page: 2, size: 10, records: [{ id: '11' }] })
        .mockResolvedValueOnce({ total: 10, page: 1, size: 10, records: [{ id: '1' }] })
    }
    const panel = createMemoryPanelState(loader, scope)
    await panel.load(2)

    await panel.refreshAfterDelete()

    expect(loader.load).toHaveBeenLastCalledWith(scope, 1, 10)
    expect(panel.page.value).toBe(1)
  })

  it('图片变更后从当前页刷新到第一页', async () => {
    const loader = {
      load: vi.fn()
        .mockResolvedValueOnce({ total: 20, page: 2, size: 10, records: [{ id: '11' }] })
        .mockResolvedValueOnce({ total: 20, page: 1, size: 10, records: [{ id: '20' }] })
    }
    const panel = createMemoryPanelState(loader, scope)
    await panel.load(2)

    await panel.refreshAfterImageChange()

    expect(loader.load).toHaveBeenLastCalledWith(scope, 1, 10)
    expect(panel.page.value).toBe(1)
    expect(panel.records.value).toEqual([{ id: '20' }])
  })

  it('写操作失败时保留当前记录和就绪状态', async () => {
    const loader = { load: vi.fn().mockResolvedValue({ total: 1, page: 1, size: 10, records: [{ id: '1' }] }) }
    const panel = createMemoryPanelState(loader, scope)
    await panel.load()

    panel.reportActionError(new Error('删除失败'))

    expect(panel.state.value).toBe('ready')
    expect(panel.records.value).toEqual([{ id: '1' }])
    expect(panel.actionError.value).toBe('删除失败')
  })
})
