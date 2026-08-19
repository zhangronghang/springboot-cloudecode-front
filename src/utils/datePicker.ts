export const openDatePicker = (event: MouseEvent) => {
  const input = event.currentTarget as HTMLInputElement
  input.showPicker?.()
}
