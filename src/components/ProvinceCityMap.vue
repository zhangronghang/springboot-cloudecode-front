<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { canDrillDownToCounty } from '../data/china'
import { getProvinceMapLoader, type ProvinceGeoMap } from '../data/provinceMaps'
import { createMapPaths, type MapPath } from '../utils/geoMap'

const props = defineProps<{ provinceCode: string }>()
const emit = defineEmits<{ unavailable: []; select: [city: { code: string; name: string }] }>()
const state = defineModel<'loading' | 'ready' | 'unavailable'>('state', { default: 'loading' })
const source = defineModel<ProvinceGeoMap | undefined>('source')
const activeName = ref('')

watchEffect(async () => {
  const loader = getProvinceMapLoader(props.provinceCode)
  if (!loader) {
    source.value = undefined
    state.value = 'unavailable'
    emit('unavailable')
    return
  }
  state.value = 'loading'
  try {
    source.value = await loader()
    state.value = 'ready'
  } catch {
    source.value = undefined
    state.value = 'unavailable'
    emit('unavailable')
  }
})

const drawing = computed(() => source.value ? createMapPaths(source.value) : undefined)
const visiblePaths = computed(() => drawing.value?.paths.filter((path) => path.showLabel) ?? [])
const canSelect = (path: MapPath) => canDrillDownToCounty(String(path.id))
const selectCity = (path: MapPath) => {
  if (canSelect(path)) emit('select', { code: String(path.id), name: path.name })
}
</script>

<template>
  <div class="province-map-frame" :class="`is-${state}`">
    <p v-if="state === 'loading'" class="map-status">正在载入省级地图…</p>
    <p v-else-if="state === 'unavailable'" class="map-status">该省份的下级行政区地图数据暂不可用。</p>
    <svg v-else-if="drawing" class="province-city-map" :viewBox="drawing.viewBox" role="group" aria-label="省级下级行政区地图">
      <path
        v-for="path in drawing.paths"
        :key="path.id"
        class="city-shape"
        :class="{ 'is-clickable': canSelect(path), 'is-active': activeName === path.name }"
        :d="path.d"
        tabindex="0"
        :role="canSelect(path) ? 'button' : 'img'"
        :aria-label="canSelect(path) ? `查看${path.name}下级区县` : `${path.name}已到县级`"
        @mouseenter="activeName = path.name"
        @mouseleave="activeName = ''"
        @focus="activeName = path.name"
        @blur="activeName = ''"
        @click="selectCity(path)"
        @keydown.enter="selectCity(path)"
        @keydown.space.prevent="selectCity(path)"
      ><title>{{ path.name }}</title></path>
      <text v-for="path in visiblePaths" :key="`label-${path.id}`" class="city-label" :x="path.labelX" :y="path.labelY" :style="{ fontSize: `${path.fontSize}px` }">{{ path.name }}</text>
    </svg>
  </div>
</template>
