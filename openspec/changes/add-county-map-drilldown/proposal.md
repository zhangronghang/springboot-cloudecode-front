## Why

省份详情页只能展示市级轮廓，用户无法继续在空间语境中查看区县分布；若将全国县级边界随应用发布，又会显著增加前端包体。需要在用户选择城市后按需获取县级边界。

## What Changes

- 让省级地图中的可下钻市级区域支持鼠标和键盘导航。
- 新增独立县级地图路由及省、市返回导航。
- 通过可配置的 DataV GeoJSON 数据源按市级行政区编码懒加载、缓存和校验县级边界。
- 为加载、失败重试、超时、路由切换取消和县级标签稀疏提供用户反馈。
- 对直辖市、港澳及已到县级的区域停止继续下钻。

## Capabilities

### New Capabilities

- `county-map-drilldown`: 从省级市界地图进入按需加载的县级行政区地图。

### Modified Capabilities

- 无。

## Impact

- 影响 Vue 路由、行政区目录、SVG 地图组件和样式。
- 新增前端访问阿里云 DataV GeoJSON 公共接口；可通过 `VITE_COUNTY_MAP_API_BASE` 替换服务地址。
- 县级 GeoJSON 不会作为静态资源加入构建产物。
