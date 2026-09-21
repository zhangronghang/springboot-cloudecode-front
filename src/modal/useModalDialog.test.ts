// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { trapTab, useModalDialog } from './useModalDialog'

const keydown = (key: string, shiftKey = false) =>
  new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })

const createContainer = (html: string) => {
  const container = document.createElement('div')
  container.tabIndex = -1
  container.innerHTML = html
  document.body.append(container)
  return container
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('trapTab', () => {
  it('把末尾元素的 Tab 焦点循环到首个元素', () => {
    const container = createContainer('<button id="first">first</button><button id="last">last</button>')
    const last = container.querySelector<HTMLElement>('#last')!
    last.focus()
    const event = keydown('Tab')

    trapTab(event, container)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(container.querySelector('#first'))
  })

  it('把首个元素的 Shift+Tab 焦点循环到末尾元素', () => {
    const container = createContainer('<button id="first">first</button><button id="last">last</button>')
    const first = container.querySelector<HTMLElement>('#first')!
    first.focus()
    const event = keydown('Tab', true)

    trapTab(event, container)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(container.querySelector('#last'))
  })

  it('焦点在容器本身时 Shift+Tab 循环到末尾元素', () => {
    const container = createContainer('<button id="first">first</button><button id="last">last</button>')
    container.focus()

    trapTab(keydown('Tab', true), container)

    expect(document.activeElement).toBe(container.querySelector('#last'))
  })

  it('没有可聚焦元素时把焦点留在容器上', () => {
    const container = createContainer('<p>nothing focusable</p>')
    const event = keydown('Tab')

    trapTab(event, container)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(container)
  })

  it('把被禁用的按钮排除在循环之外', () => {
    const container = createContainer('<button id="first">first</button><button id="last" disabled>last</button>')
    container.querySelector<HTMLElement>('#first')!.focus()
    const event = keydown('Tab')

    trapTab(event, container)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(container.querySelector('#first'))
  })

  it('焦点不在边界元素时不拦截 Tab', () => {
    const container = createContainer('<button id="first">first</button><button id="mid">mid</button><button id="last">last</button>')
    container.querySelector<HTMLElement>('#mid')!.focus()
    const event = keydown('Tab')

    trapTab(event, container)

    expect(event.defaultPrevented).toBe(false)
  })
})

const mountDialog = (options: Parameters<typeof useModalDialog>[0]) => {
  let dialog!: ReturnType<typeof useModalDialog>
  const wrapper = mount(defineComponent({
    setup() {
      dialog = useModalDialog(options)
      return () => h(
        'div',
        { ref: dialog.dialogRef, tabindex: -1, onKeydown: dialog.handleKeydown },
        [h('button', { id: 'inside' }, 'inside')]
      )
    }
  }), { attachTo: document.body })
  return { wrapper, dialog }
}

describe('useModalDialog', () => {
  it('按下 Escape 时请求关闭', async () => {
    const onClose = vi.fn()
    const { wrapper, dialog } = mountDialog({ onClose })
    await wrapper.vm.$nextTick()

    dialog.handleKeydown(keydown('Escape'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('在 canClose 拒绝时不关闭', async () => {
    const onClose = vi.fn()
    const { wrapper, dialog } = mountDialog({ onClose, canClose: () => false })
    await wrapper.vm.$nextTick()
    const event = keydown('Escape')

    dialog.handleKeydown(event)

    expect(onClose).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('requestClose 在 canClose 拒绝时不关闭', async () => {
    const onClose = vi.fn()
    const { wrapper, dialog } = mountDialog({ onClose, canClose: () => false })
    await wrapper.vm.$nextTick()

    dialog.requestClose()

    expect(onClose).not.toHaveBeenCalled()
  })

  it('把 Tab 焦点限制在弹窗内', async () => {
    const { wrapper, dialog } = mountDialog({ onClose: vi.fn() })
    await wrapper.vm.$nextTick()
    // wrapper.element 由内联渲染函数推断而来的类型是 any，无法接受类型参数，这里显式收窄。
    const inside = (wrapper.element as HTMLElement).querySelector<HTMLElement>('#inside')!
    inside.focus()
    const event = keydown('Tab')

    dialog.handleKeydown(event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(inside)
  })

  it('挂载时把焦点移入弹窗', async () => {
    const { wrapper } = mountDialog({ onClose: vi.fn() })
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(wrapper.element)
  })

  it('打开时锁定页面滚动并在卸载后恢复', async () => {
    document.body.style.overflow = 'auto'
    const { wrapper } = mountDialog({ onClose: vi.fn() })
    await wrapper.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()

    expect(document.body.style.overflow).toBe('auto')
  })

  it('卸载后把焦点归还到打开弹窗的元素', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const { wrapper } = mountDialog({ onClose: vi.fn() })
    await wrapper.vm.$nextTick()
    expect(document.activeElement).not.toBe(trigger)

    wrapper.unmount()

    expect(document.activeElement).toBe(trigger)
  })

  it('触发元素已从文档移除时回退到指定的兜底元素', async () => {
    const fallback = document.createElement('div')
    fallback.tabIndex = -1
    fallback.id = 'fallback'
    document.body.append(fallback)
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const { wrapper } = mountDialog({ onClose: vi.fn(), fallbackSelector: '#fallback' })
    await wrapper.vm.$nextTick()

    trigger.remove()
    wrapper.unmount()

    expect(document.activeElement).toBe(fallback)
  })
})
