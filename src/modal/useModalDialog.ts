import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

export const trapTab = (event: KeyboardEvent, container: HTMLElement) => {
  const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter((element) => !element.hasAttribute('hidden'))
  if (!focusable.length) {
    event.preventDefault()
    container.focus()
    return
  }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export interface ModalDialogOptions {
  onClose: () => void
  canClose?: () => boolean
  fallbackSelector?: string
}

export const useModalDialog = (options: ModalDialogOptions) => {
  const dialogRef = ref<HTMLElement | null>(null)
  let returnFocus: HTMLElement | null = null
  let previousBodyOverflow = ''

  const canClose = () => options.canClose?.() !== false

  const requestClose = () => {
    if (canClose()) options.onClose()
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (!canClose()) return
      event.preventDefault()
      options.onClose()
      return
    }
    if (event.key !== 'Tab' || !dialogRef.value) return
    trapTab(event, dialogRef.value)
  }

  onMounted(() => {
    returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.value?.focus()
  })

  onBeforeUnmount(() => {
    document.body.style.overflow = previousBodyOverflow
    const fallback = options.fallbackSelector
      ? document.querySelector<HTMLElement>(options.fallbackSelector)
      : null
    const focusTarget = returnFocus?.isConnected ? returnFocus : fallback
    focusTarget?.focus()
    if (focusTarget) void nextTick(() => focusTarget.isConnected && focusTarget.focus())
  })

  return { dialogRef, requestClose, handleKeydown }
}
