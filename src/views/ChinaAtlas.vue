<script setup lang="ts">
import { useRouter } from 'vue-router'
import ChinaMap from '../components/ChinaMap.vue'
import { provinceDirectory } from '../data/china'

const router = useRouter()
const openProvince = (name: string) => router.push({ name: 'province', params: { name } })
</script>

<template>
  <section class="atlas-page">
    <header class="site-header">
      <p class="eyebrow">CHINA · ADMINISTRATIVE ATLAS</p>
      <h1>中国省市图册</h1>
      <p class="intro">从一片土地开始，进入每一座城市。</p>
    </header>

    <div class="atlas-layout">
      <aside class="atlas-aside">
        <p class="aside-number">34</p>
        <p>省级行政区</p>
        <span class="rule"></span>
        <p class="aside-copy">选择地图上的省份，查看其下级行政区名称。</p>
      </aside>
      <ChinaMap @select="openProvince" />
    </div>

    <nav class="province-index" aria-label="省份快速入口">
      <button v-for="province in provinceDirectory" :key="province.code" @click="openProvince(province.name)">
        {{ province.name }}
      </button>
    </nav>
  </section>
</template>
