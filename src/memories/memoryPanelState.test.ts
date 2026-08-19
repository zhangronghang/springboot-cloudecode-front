import { describe, expect, it, vi } from 'vitest'
import { createMemoryPanelState } from './memoryPanelState'

describe('城市足迹页面状态', () => {
  it('加载、分页并在空结果显示空状态', async () => {
    const loader = { load: vi.fn().mockResolvedValue({ total: 0, page: 1, size: 10, records: [] }) }
    const panel = createMemoryPanelState(loader, '440300')
    expect(panel.state.value).toBe('loading')
    await panel.load()
    expect(panel.state.value).toBe('empty')
    expect(loader.load).toHaveBeenCalledWith('440300', 1, 10)
  })

  it('失败后可重试', async () => {
    const loader = { load: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ total: 1, page: 1, size: 10, records: [{ id: '1' }] }) }
    const panel = createMemoryPanelState(loader, '440300')
    await panel.load()
    expect(panel.state.value).toBe('error')
    await panel.retry()
    expect(panel.state.value).toBe('ready')
  })
})
