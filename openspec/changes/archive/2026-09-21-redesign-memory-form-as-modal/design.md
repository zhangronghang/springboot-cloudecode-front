## Context

动机与范围见 `proposal.md`，行为契约见本变更的 `specs/city-photo-memories/spec.md`。

现状约束：

- `CityMemoryPanel.vue`（214 行）同时承载列表、内嵌表单（`formOpen`）和内嵌删除确认块（`deletingMemory`）。表单与确认块位于页面流中，靠 `border-top` 与列表分隔。
- `FootprintGalleryModal.vue`（603 行）已经是本项目的弹窗范式：`Teleport to="body"`、`position: fixed` 遮罩 + `@click.self` 关闭、`role="dialog"` + `aria-modal`、`Tab` 焦点陷阱、`ESC` 关闭、打开时锁 `body` 滚动、卸载时把焦点归还到触发元素（带回退选择器 `[data-gallery-focus-fallback]`），并有配套测试。
- 样式分两处：`styles.css` 是全局样式（含 `.memory-form`、`.memory-delete-confirm`），`FootprintGalleryModal.vue` 用 `<style scoped>`。设计语言为深蓝底 `#071a33`、金色强调 `#d8b45b`、直角无圆角、衬线标题 + Consolas 数字。
- 表单校验集中在 `memoryForm.ts`（纯函数，已被单测覆盖），标签协议在 `memoryTags.ts`（`visited:` / `city:` / `county:` 为受管理标签，提交时过滤）。

## Goals / Non-Goals

**Goals:**

- 三个浮层（创建/编辑表单、删除确认、既有的图片集）共享同一套行为契约：遮罩、`ESC`、焦点陷阱、焦点归还、滚动锁。
- 把"表单在页面流中"改为"表单在浮层中"，且不改变任何字段语义、校验规则或请求体。
- 把照片选择与标签输入这两处最弱的交互提升为可预览、可点选、可回删的形态。

**Non-Goals:**

- 不改动后端接口、请求体字段或行政区归属逻辑。
- 不改动足迹卡片、列表分页、图片集弹窗的内部行为（本次只让图片集弹窗参与共享焦点工具）。
- 不引入 UI 组件库或第三方拖拽库，沿用原生 DOM 事件与现有设计语言。
- 不实现"从历史足迹聚合常用词"或让常用词持久化、可编辑——本次为内置固定词表。
- 不改动表单的字段集合与必填规则。

## Decisions

### 1. 抽取 `useModalDialog`，而非复制三份弹窗逻辑

新增 `src/modal/useModalDialog.ts`，封装与业务无关的浮层行为：`dialogRef`、`requestClose`、`handleKeydown`（`Tab` 陷阱 + `ESC` 关闭）、挂载时记录触发元素并锁定 `body` 滚动、卸载时恢复滚动并把焦点归还（回退到调用方提供的选择器或 `document.body`）。同时导出纯函数 `trapTab(event, container)` 供嵌套场景复用。

- 创建/编辑表单弹窗与删除确认弹窗直接使用该 composable。
- `FootprintGalleryModal.vue` 本次只做等价替换：用共享的 `trapTab` 替换其私有实现，保留它自己的嵌套确认层逻辑（`deleteConfirmOpen` 的 `ESC` 优先级与 `guardDeleteConfirmation` 点击拦截）与 `[data-gallery-trigger-id]` 回退选择器。它已有测试覆盖，全面改写收益不抵回归风险。

**考虑过的替代方案**：直接复制 `FootprintGalleryModal` 的写法到新组件——三处重复焦点陷阱与焦点归还，后续必然漂移；或一次性把图片集弹窗也迁到 composable——改动面过大，且其嵌套确认层需要 composable 支持多层栈，属于本次不需要的复杂度。

### 2. 删除确认独立成组件，而非留在面板内

`MemoryDeleteConfirmModal.vue` 接收足迹标题与图片数量，保留 `role="alertdialog"` 与既有确认文案，用同一套浮层样式。这样 `CityMemoryPanel.vue` 不再持有第二个内嵌状态块，两个浮层组件形态一致。

**考虑过的替代方案**：把删除确认做成表单弹窗内的嵌套层——语义错误，删除确认并非表单的一部分。

### 3. 照片预览用 `URL.createObjectURL`，并在三处显式释放

选择或拖入文件后生成对象 URL 作缩略图预览，在**重新选择**、**弹窗关闭**、**组件卸载**三个路径调用 `URL.revokeObjectURL`。相比 `FileReader` + base64，对象 URL 不占用额外内存且不需要异步读取。

### 4. 标签状态由 `string` 改为 `string[]`，草稿词在提交时自动提交

`CityMemoryPanel.vue` 现有的 `userTags: string`（逗号分隔）改为标签数组。输入框中尚未回车的草稿词，在提交时自动作为标签加入——否则用户输入后直接点保存会静默丢失。

`memoryTags.ts` 的协议职责不变：提交仍走 `createMemoryTags(visitedAt, userTagList)`，受管理标签的过滤与去重仍在提交这一层，不在输入层拦截。点选常用词时，已在标签中的词不重复添加。

**考虑过的替代方案**：在输入层拦截 `visited:` / `city:` / `county:` 格式——会让 `isManagedTag` 的私有过滤规则泄漏到 UI 层，且改变既有行为。

### 5. 常用词为内置固定词表

在与标签输入同目录下定义常量词表（如美食、古都、自然风光、夜景、亲子）。零后端依赖、任何地区表现一致、行为可预期。

### 6. 样式随组件走

新建的浮层组件用 `<style scoped>`（与 `FootprintGalleryModal.vue` 一致），同时从 `styles.css` 移除 `.memory-form` 与 `.memory-delete-confirm` 系列规则。窄屏沿用既有的 `@media (max-width: 720px)` 断点，弹窗改为全宽并收紧内边距。

## Risks / Trade-offs

- **触碰已有弹窗组件** → `FootprintGalleryModal.vue` 的改动限定为 `trapTab` 的等价替换，先在既有组件测试通过后再改，不触碰其嵌套确认层与焦点归还逻辑。
- **对象 URL 泄漏** → 三条释放路径（重选、关闭、卸载）在测试中显式断言 `revokeObjectURL` 被调用。
- **`happy-dom` 对拖拽事件与 `DataTransfer` 支持有限** → 测试中以构造的 `Event` 携带 `dataTransfer.files` 触发，或在组件内保留一个直接接收 `File` 的入口，测试断言该入口而不依赖真实拖拽序列。具体做法在实施时以能通过测试为准。
- **`dragover` 不阻止默认行为则永远不触发 `drop`，且 `dragenter`/`dragleave` 会因子元素冒泡而抖动** → 投放区在 `dragover` 上阻止默认行为，并用计数器抵消子元素冒泡带来的高亮闪烁。
- **样式从全局迁入 scoped 可能漏掉选择器** → 迁移时逐个比对 `.memory-form`、`.memory-delete-confirm`、`.memory-error` 及窄屏断点中的相关规则，确认无残留后才删除全局声明。
- **弹窗内表单在窄屏可能超出视口高度** → 弹窗主体设最大高度并独立滚动，避免遮罩内出现无法触达的字段。

## Open Questions

- 窄屏（`max-width: 720px`）下弹窗是保持居中全宽，还是改为从底部升起的面板，可留待实施时按实际观感定夺——两种形态都不改变本变更任何规格场景。
