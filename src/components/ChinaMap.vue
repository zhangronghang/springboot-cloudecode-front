<script setup lang="ts">
import chinaMap from '@svg-maps/china'
import { computed, nextTick, onMounted, ref } from 'vue'
import { formatProvinceLabel } from '../data/china'
import { createContainedMapLabel, type MapLabel } from '../utils/mapLabels'

interface MapLocation {
  id: string
  name: string
  path: string
}

const emit = defineEmits<{ select: [name: string] }>()
const activeName = ref('')
const svgRef = ref<SVGSVGElement>()
const labels = ref<MapLabel[]>([])
const locations = computed(() => (chinaMap.locations as MapLocation[]).map((location) => ({
  ...location,
  chineseName: formatProvinceLabel(location.id)
})).filter((location) => location.chineseName))

onMounted(async () => {
  await nextTick()
  labels.value = locations.value.flatMap((location) => {
    const shape = svgRef.value?.querySelector<SVGPathElement>(`[data-province-id="${location.id}"]`)
    if (!shape) return []
    const bounds = shape.getBBox()
    const label = createContainedMapLabel({
      id: location.id,
      name: location.chineseName,
      bounds,
      contains: (x, y) => shape.isPointInFill(new DOMPoint(x, y))
    })
    return label ? [label] : []
  })
})
</script>

<template>
  <div class="map-frame" aria-label="可点击的中国省级行政区地图">
    <svg ref="svgRef" class="china-map" :viewBox="chinaMap.viewBox" role="img" aria-labelledby="map-title">
      <title id="map-title">点击省份查看下级城市</title>
      <path
        v-for="location in locations"
        :key="location.id"
        class="province-shape"
        :class="{ 'is-active': activeName === location.chineseName }"
        :d="location.path"
        :data-province-id="location.id"
        tabindex="0"
        role="button"
        :aria-label="`查看${location.chineseName}下级城市`"
        @mouseenter="activeName = location.chineseName"
        @mouseleave="activeName = ''"
        @focus="activeName = location.chineseName"
        @blur="activeName = ''"
        @click="emit('select', location.chineseName)"
        @keydown.enter="emit('select', location.chineseName)"
        @keydown.space.prevent="emit('select', location.chineseName)"
      >
        <title>{{ location.chineseName }}</title>
      </path>
      <text
        v-for="label in labels"
        :key="`label-${label.id}`"
        class="province-label"
        :x="label.x"
        :y="label.y"
        :style="{ fontSize: `${label.fontSize}px` }"
      >{{ label.name }}</text>
    </svg>
    <div class="map-tip" aria-live="polite">{{ activeName ? `进入 ${activeName}` : '点击任一省份探索城市' }}</div>
  </div>
</template>
