## 1. 共享浮层能力

- [x] 1.1 新建 `src/modal/useModalDialog.ts`，导出 `trapTab(event, container)` 纯函数与 `useModalDialog` composable，封装 `dialogRef`、`requestClose`、`handleKeydown`（Tab 陷阱 + ESC 关闭）、挂载时记录触发元素并锁定 body 滚动、卸载时恢复滚动并归还焦点（支持调用方传入回退选择器）。验证：新增单测覆盖焦点在首尾元素时的 Tab 循环、无可聚焦元素时聚焦容器本身、ESC 触发关闭、卸载后焦点回到触发元素，`npm test` 通过。
- [x] 1.2 把 `FootprintGalleryModal.vue` 的私有 `trapTab` 替换为共享实现，保留其嵌套确认层的 ESC 优先级与 `guardDeleteConfirmation` 行为不变。验证：该组件既有测试全部通过且无快照变更。

## 2. 标签输入

- [x] 2.1 新建标签输入模块（含内置固定常用词词表），实现标签数组的增删、去重与草稿词处理。验证：单测覆盖回车新增、重复词不重复添加、移除单项不影响其他项、提交时未回车的草稿词自动加入、受管理标签（`visited:` / `city:` / `county:`）仍只在提交层被过滤。
- [x] 2.2 确认 `memoryTags.ts` 的 `createMemoryTags` 接受标签数组且行为不变。验证：`memoryTags` 既有单测通过，无需改动其实现。

## 3. 表单弹窗组件

- [x] 3.1 新建 `MemoryFormModal.vue` 承载创建与编辑两种模式，使用 `useModalDialog`，按 `editing` 切换标题与是否显示照片区。验证：组件测试覆盖打开时预填编辑值、编辑态不渲染任何照片选择控件、关闭按钮/ESC/遮罩点击三条关闭路径均不发送请求、关闭后焦点归还触发入口。
- [x] 3.2 在表单弹窗中实现照片投放区：支持点选与拖拽两种入口，选中后显示缩略图预览、文件名与重新选择。验证：组件测试覆盖接受合法 JPEG/PNG、拒绝非 JPEG/PNG 与超过 50MB 的文件并显示校验错误、`dragover` 已阻止默认行为、拖拽高亮不因子元素冒泡抖动。
- [x] 3.3 让照片预览的对象 URL 在重新选择、弹窗关闭、组件卸载三条路径上被释放。验证：单测断言 `URL.revokeObjectURL` 在每种场景下均被调用。
- [x] 3.4 接入标签输入：chip 呈现、点选常用词添加、移除按钮、提交时草稿词并入。验证：组件测试覆盖点选常用词后标签项出现、移除后消失、已选常用词不重复添加、提交请求的 `tags` 包含预期词与 `visited:YYYY-MM-DD`。
- [x] 3.5 完成表单弹窗视觉：标题区、字段分组与必填标记、错误态、主次按钮层级，对齐现有深蓝底与金色强调、直角无圆角、衬线标题的设计语言，并设最大高度使长表单在窄屏可滚动。验证：桌面与窄屏各宽度下手动确认字段无遮挡且可触达底部按钮。

## 4. 删除确认弹窗组件

- [x] 4.1 新建 `MemoryDeleteConfirmModal.vue`，使用 `useModalDialog`，保留 `role="alertdialog"` 与既有确认文案（足迹标题、图片数量、不可恢复提示）。验证：组件测试覆盖渲染标题与图片数量、取消不发送删除请求、确认触发删除、取消后焦点归还触发删除的按钮。

## 5. 接入面板

- [x] 5.1 改造 `CityMemoryPanel.vue`：移除内嵌 `<form class="memory-form">` 与 `.memory-delete-confirm` 块，改为按 `formOpen` / `deletingMemory` 条件渲染两个新弹窗组件，`userTags` 由逗号分隔字符串改为标签数组。验证：该组件既有测试更新后全部通过，编辑、删除、分页刷新行为与改造前一致。
- [x] 5.2 把 `.memory-form` 与 `.memory-delete-confirm` 系列样式从 `styles.css` 迁入新组件的 scoped 样式，保留窄屏断点与 `prefers-reduced-motion` 处理。验证：全仓检索无残留的 `.memory-form` / `.memory-delete-confirm` 类名引用，`npm run build` 通过。

## 6. 整体验证

- [x] 6.1 运行完整测试套件，确认全部通过且未降低既有覆盖率。验证：`npm test` 输出无失败用例。
- [x] 6.2 在真实应用里逐条走查本变更规格中的场景：打开/关闭创建弹窗与焦点归还、拖拽投放照片、点选与移除标签、编辑态无照片区、删除确认弹窗的取消与确认。验证：`npm run dev` 启动后手动走查，行为与 `specs/city-photo-memories/spec.md` 一致。
