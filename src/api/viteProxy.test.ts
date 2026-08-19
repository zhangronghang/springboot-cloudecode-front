import { describe, expect, it } from 'vitest'
import config from '../../vite.config'

describe('图片服务开发代理', () => {
  it('将 /api 转发到本地图片服务', () => {
    expect(config.server?.proxy?.['/api']).toMatchObject({
      target: 'http://localhost:8081',
      changeOrigin: true
    })
  })
})
