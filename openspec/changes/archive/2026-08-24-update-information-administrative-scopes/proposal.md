## Why

图片服务已经从旧的 `/api/images/*` 接口迁移到 `/api/information/*`，并使用省、市、区县行政区编码保存和查询归属。现有前端仍依赖位置标签并允许在市级创建信息，既无法调用最新接口，也不符合新的分层操作规则。

## What Changes

- **BREAKING**：将前端图片客户端切换到 `/api/information/list`、`detail`、`upload`、`update` 和 `delete`，同步最新请求与响应字段。
- **BREAKING**：停止使用 `city:*`、`county:*` 标签保存行政区归属，改用 `provinceCode`、可选 `cityCode` 和 `districtCode`；标签仅保留游玩日期和用户标签。
- 省级页面不展示或查询上传信息。
- 地级市页面按 `cityCode` 分页查询全部下属区县信息，允许编辑和删除，但不允许创建。
- 区县状态按 `districtCode` 查询并支持创建、编辑和删除；编辑不得改变行政区归属。
- 普通区县创建时提交省、市、区县三级编码；直辖市区县创建时省略 `cityCode`。
- 允许在北京、上海、天津、重庆的省级地图上直接选择区县并进入区县可编辑状态，不新增中间市级页面或路由。
- 完善删除末页回退、单图详情失败降级及写操作失败保留当前数据等行为。
- 不迁移行政区字段为空的历史记录，不处理图片性能优化及缺少可下钻数据的其他特殊地区。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `city-photo-memories`：改用结构化行政区字段，并重新定义省级、市级和区县级页面的查询及增删改能力。
- `county-map-drilldown`：允许直辖市从省级地图直接选择区县并进入区县信息状态。

## Impact

- 影响图片 API 客户端、类型定义、足迹标签与加载逻辑、信息面板状态和相关测试。
- 影响省级地图、市级区县地图及直辖市区县选择交互。
- 开发环境继续通过 Vite 将 `/api` 代理到 `http://localhost:8081`。
- 依赖后端 OpenAPI：`http://localhost:8081/v2/api-docs`，其中上传的三级行政区字段均为可选，列表支持按 `cityCode` 和 `districtCode` 精确匹配。
