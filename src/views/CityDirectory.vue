<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProvinceCityMap from '../components/ProvinceCityMap.vue'
import { findProvince } from '../data/china'
import { getCountyRoute } from '../utils/countyNavigation'

const route = useRoute()
const router = useRouter()
const province = computed(() => findProvince(String(route.params.name)))
const openCity = (city: { code: string }) => {
  if (!province.value) return
  const target = getCountyRoute(province.value.name, city.code)
  if (target) router.push(target)
}
</script>

<template>
  <section class="directory-page">
    <button class="back-link" @click="router.push({ name: 'atlas' })">← 返回中国地图</button>
    <template v-if="province">
      <header class="directory-header">
        <p class="eyebrow">PROVINCE DIRECTORY</p>
        <h1>{{ province.name }}</h1>
        <p>{{ province.fullName }} · {{ province.cities.length }} 个下级行政区</p>
      </header>
      <ProvinceCityMap :province-code="province.code" @select="openCity" />
    </template>
    <section v-else class="not-found">
      <h1>未找到该省份</h1>
      <button @click="router.push({ name: 'atlas' })">回到中国地图</button>
    </section>
  </section>
</template>
