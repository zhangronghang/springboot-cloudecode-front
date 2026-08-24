<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CityMemoryPanel from '../components/CityMemoryPanel.vue'
import ProvinceCityMap from '../components/ProvinceCityMap.vue'
import { findProvince, isDirectMunicipality } from '../data/china'
import { createDirectDistrictScope, type DistrictInformationScope } from '../memories/divisionContext'
import { getCountyRoute } from '../utils/countyNavigation'

const route = useRoute()
const router = useRouter()
const province = computed(() => findProvince(String(route.params.name)))
const selectedDistrict = ref<DistrictInformationScope>()
watch(() => route.params.name, () => { selectedDistrict.value = undefined })

const openCity = (city: { code: string; name: string }) => {
  if (!province.value) return
  if (isDirectMunicipality(province.value.code)) {
    selectedDistrict.value = createDirectDistrictScope({
      provinceCode: province.value.code,
      districtCode: city.code,
      name: city.name
    })
    return
  }
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
      <button
        v-if="selectedDistrict"
        class="back-link clear-district-selection"
        @click="selectedDistrict = undefined"
      >← 取消区县选择</button>
      <CityMemoryPanel
        v-if="selectedDistrict"
        :key="selectedDistrict.districtCode"
        :division="selectedDistrict"
      />
    </template>
    <section v-else class="not-found">
      <h1>未找到该省份</h1>
      <button @click="router.push({ name: 'atlas' })">回到中国地图</button>
    </section>
  </section>
</template>
