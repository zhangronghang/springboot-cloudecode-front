import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import CountyDirectory from './views/CountyDirectory.vue'
import CityDirectory from './views/CityDirectory.vue'
import ChinaAtlas from './views/ChinaAtlas.vue'
import './styles.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'atlas', component: ChinaAtlas },
    { path: '/province/:name', name: 'province', component: CityDirectory },
    { path: '/province/:province/city/:cityCode', name: 'county', component: CountyDirectory }
  ]
})

createApp(App).use(router).mount('#app')
