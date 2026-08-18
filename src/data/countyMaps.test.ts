import { afterEach, describe, expect, it, vi } from 'vitest'
import { CountyMapLoadError, createCountyMapLoader } from './countyMaps'

const validGeoJson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { adcode: 440304, name: '福田区', center: [114.05, 22.54] },
    geometry: { type: 'Polygon', coordinates: [[[114, 22], [115, 22], [115, 23], [114, 22]]] }
  }]
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('县级地图远程加载器', () => {
  it('按市级编码请求外部接口并缓存已成功的数据', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validGeoJson), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const loader = createCountyMapLoader('https://example.test/bound')

    await expect(loader.load('440300')).resolves.toMatchObject({
      type: 'FeatureCollection',
      features: [expect.objectContaining({ properties: expect.objectContaining({ adcode: 440304, name: '福田区' }) })]
    })
    await loader.load('440300')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/bound/440300_full.json', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('将无效响应转换为可重试的加载错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), { status: 200 })))
    const loader = createCountyMapLoader('https://example.test/bound')

    await expect(loader.load('440300')).rejects.toBeInstanceOf(CountyMapLoadError)
  })

  it('拒绝包含非六位行政区编码的 GeoJSON', async () => {
    const invalidGeoJson = {
      ...validGeoJson,
      features: [{ ...validGeoJson.features[0], properties: { ...validGeoJson.features[0].properties, adcode: 'not-an-adcode' } }]
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(invalidGeoJson), { status: 200 })))
    const loader = createCountyMapLoader('https://example.test/bound')

    await expect(loader.load('440300')).rejects.toBeInstanceOf(CountyMapLoadError)
  })

  it('拒绝没有有效坐标环的 GeoJSON', async () => {
    const invalidGeoJson = {
      ...validGeoJson,
      features: [{ ...validGeoJson.features[0], geometry: { type: 'Polygon', coordinates: [] } }]
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(invalidGeoJson), { status: 200 })))
    const loader = createCountyMapLoader('https://example.test/bound')

    await expect(loader.load('440300')).rejects.toBeInstanceOf(CountyMapLoadError)
  })

  it('向调用方保留取消请求的 AbortError', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    const loader = createCountyMapLoader('https://example.test/bound')

    await expect(loader.load('440300', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('在接口超时时结束请求并返回可重试错误', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('timed out', 'AbortError')))
    })))
    const loader = createCountyMapLoader('https://example.test/bound', 25)
    const pending = loader.load('440300')
    const rejection = expect(pending).rejects.toBeInstanceOf(CountyMapLoadError)

    await vi.advanceTimersByTimeAsync(25)

    await rejection
  })
})
