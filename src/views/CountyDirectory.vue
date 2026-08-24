<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { canDrillDownToCounty, findCity, findProvince } from '../data/china'
import { countyMapLoader } from '../data/countyMaps'
import type { ProvinceGeoMap } from '../data/provinceMaps'
import { createMapPaths } from '../utils/geoMap'
import CityMemoryPanel from '../components/CityMemoryPanel.vue'
import { createDivisionContext } from '../memories/divisionContext'

const route = useRoute()
const router = useRouter()
const provinceName = computed(() => String(route.params.province))
const cityCode = computed(() => String(route.params.cityCode))
const province = computed(() => findProvince(provinceName.value))
const city = computed(() => findCity(provinceName.value, cityCode.value))
const source = ref<ProvinceGeoMap>()
const state = ref<'loading' | 'ready' | 'error' | 'invalid'>('loading')
const retryKey = ref(0)
const memoryContext = createDivisionContext({
  provinceCode: province.value?.code ?? '',
  cityCode: cityCode.value,
  name: city.value?.name ?? ''
})
const selectCounty = (path: { id: string | number; name: string }) => memoryContext.selectDistrict({
  districtCode: String(path.id),
  name: path.name
})

watch([province, cityCode, city], () => {
  if (province.value && city.value) memoryContext.changeCity({
    provinceCode: province.value.code,
    cityCode: cityCode.value,
    name: city.value.name
  })
}, { immediate: true })

watch([provinceName, cityCode, retryKey], async (_, __, onCleanup) => {
  source.value = undefined
  if (!city.value || !canDrillDownToCounty(cityCode.value)) {
    state.value = 'invalid'
    return
  }

  const controller = new AbortController()
  onCleanup(() => controller.abort())
  state.value = 'loading'
  try {
    source.value = await countyMapLoader.load(cityCode.value, controller.signal)
    if (!controller.signal.aborted) state.value = 'ready'
  } catch (error) {
    if (!controller.signal.aborted && (error as { name?: string }).name !== 'AbortError') state.value = 'error'
  }
}, { immediate: true })

const drawing = computed(() => source.value ? createMapPaths(source.value) : undefined)
const visiblePaths = computed(() => drawing.value?.paths.filter((path) => path.showLabel) ?? [])
const retry = () => { retryKey.value += 1 }
</script>

<template>
  <section class="directory-page">
    <nav class="breadcrumb" aria-label="行政区导航">
      <button @click="router.push({ name: 'atlas' })">中国地图</button><span>/</span>
      <button @click="router.push({ name: 'province', params: { name: provinceName } })">{{ provinceName }}</button><span>/</span>
      <span>{{ city?.name ?? '未知城市' }}</span>
    </nav>
    <template v-if="city && state !== 'invalid'">
      <header class="directory-header">
        <p class="eyebrow">COUNTY DIRECTORY</p>
        <h1>{{ city.name }}</h1>
        <p>区县级行政区地图</p>
      </header>
      <div class="province-map-frame county-map-frame" :class="`is-${state}`">
        <p v-if="state === 'loading'" class="map-status" aria-live="polite">正在载入县级地图…</p>
        <div v-else-if="state === 'error'" class="map-status" role="status">
          <p>县级地图数据暂不可用。</p>
          <button class="retry-button" @click="retry">重新加载</button>
        </div>
        <svg v-else-if="drawing" class="province-city-map county-map" :viewBox="drawing.viewBox" role="group" :aria-label="`${city.name}县级行政区地图`">
          <path v-for="path in drawing.paths" :key="path.id" class="county-shape" :class="{ 'is-active': memoryContext.current.value.level === 'district' && memoryContext.current.value.districtCode === String(path.id) }" :d="path.d" tabindex="0" role="button" :aria-label="`查看${path.name}足迹`" @click="selectCounty(path)" @keydown.enter="selectCounty(path)" @keydown.space.prevent="selectCounty(path)"><title>{{ path.name }}</title></path>
          <text v-for="path in visiblePaths" :key="`label-${path.id}`" class="county-label" :x="path.labelX" :y="path.labelY" :style="{ fontSize: `${path.fontSize}px` }">{{ path.name }}</text>
        </svg>
      </div>
      <button v-if="memoryContext.current.value.level === 'district'" class="back-link memory-reset" @click="memoryContext.selectCity">查看 {{ city.name }} 足迹</button>
      <CityMemoryPanel :key="memoryContext.current.value.level === 'city' ? `city-${memoryContext.current.value.cityCode}` : `district-${memoryContext.current.value.districtCode}`" :division="memoryContext.current.value" />
    </template>
    <section v-else class="not-found">
      <h1>当前已到县级</h1>
      <p>该行政区没有可继续浏览的区县级边界。</p>
      <button @click="router.push({ name: 'province', params: { name: provinceName } })">返回省级地图</button>
    </section>
  </section>
</template>
