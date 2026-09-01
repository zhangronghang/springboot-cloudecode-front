// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import ChinaAtlas from './ChinaAtlas.vue'

describe('首页标题', () => {
  it('在图册名称后展示足迹题签', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'atlas', component: ChinaAtlas }]
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(ChinaAtlas, {
      global: {
        plugins: [router],
        stubs: { ChinaMap: { template: '<div />' } }
      }
    })

    expect(wrapper.get('h1').text()).toBe('中国省市图册足迹')
  })
})
