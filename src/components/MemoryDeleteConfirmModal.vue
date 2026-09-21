<script lang="ts">
export interface MemoryDeleteApi {
  delete(id: string): Promise<unknown>
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import type { CityMemory } from '../api/imageTypes'
import { useModalDialog } from '../modal/useModalDialog'

const props = defineProps<{
  memory: CityMemory
  api: MemoryDeleteApi
}>()

const emit = defineEmits<{ close: []; deleted: [] }>()

const deleting = ref(false)
const error = ref('')

// 删除请求进行中不允许关闭：此时记录正在消失，关掉弹窗会让用户无从判断结果。
const { dialogRef, requestClose, handleKeydown } = useModalDialog({
  onClose: () => emit('close'),
  canClose: () => !deleting.value
})

const confirmRemove = async () => {
  if (deleting.value) return
  deleting.value = true
  error.value = ''
  try {
    await props.api.delete(props.memory.id)
    emit('deleted')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '无法删除这条足迹。'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="requestClose">
      <section
        ref="dialogRef"
        class="modal-dialog memory-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="memory-delete-title"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <h2 id="memory-delete-title">删除足迹“{{ memory.title }}”</h2>
        <p>这会删除整条足迹及其 {{ memory.imageCount }} 张图片，操作不可恢复。</p>
        <p v-if="error" class="memory-error">{{ error }}</p>

        <div class="memory-delete-actions">
          <button type="button" aria-label="取消删除足迹" :disabled="deleting" @click="requestClose">取消</button>
          <button
            type="button"
            class="memory-delete-confirm-action"
            aria-label="确认删除足迹"
            :disabled="deleting"
            @click="confirmRemove"
          >{{ deleting ? '删除中…' : '确认删除足迹' }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
/* 遮罩与弹窗外壳来自 styles.css 的 .modal-backdrop / .modal-dialog，与表单弹窗共用同一套浮层样式。 */
.memory-delete-dialog h2 {
  margin: 0 0 12px;
  color: #fffdf6;
  font-family: 'STSong', 'SimSun', serif;
  font-size: clamp(20px, 2.6vw, 26px);
  letter-spacing: .04em;
}

.memory-delete-dialog > p {
  margin: 0;
  color: #c2d5e0;
}

.memory-delete-dialog .memory-error {
  margin-top: 14px;
  border-left: 3px solid #ffb4a3;
  padding: 9px 12px;
  color: #ffb4a3;
  background: rgba(255, 180, 163, .1);
}

.memory-delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #29485e;
  margin-top: 18px;
  padding-top: 16px;
}

/* 不可恢复的操作与金色主按钮区分开，避免误认成普通确认 */
.memory-delete-dialog .memory-delete-confirm-action {
  border-color: #a8534b;
  color: #ffd8cf;
  background: rgba(168, 83, 75, .28);
  font-weight: 600;
}

.memory-delete-dialog .memory-delete-confirm-action:hover:not(:disabled) {
  border-color: #d0625a;
  color: #fff4f1;
  background: #a8534b;
}

@media (max-width: 720px) {
  .memory-delete-actions {
    flex-direction: column-reverse;
  }

  .memory-delete-dialog .memory-delete-actions button {
    width: 100%;
  }
}
</style>
