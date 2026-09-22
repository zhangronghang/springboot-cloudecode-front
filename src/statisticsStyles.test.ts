import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

const block = (source: string, selector: string) => {
  const start = source.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`样式表缺少规则：${selector}`)
  const open = source.indexOf('{', start)
  return source.slice(open + 1, source.indexOf('}', open))
}

const property = (source: string, selector: string, name: string) => {
  const match = block(source, selector).match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`))
  if (!match) throw new Error(`规则 ${selector} 缺少属性：${name}`)
  return match[1].trim()
}

const mobileChunks = css.split('@media (max-width: 720px)')
  .filter((chunk) => chunk.includes('.statistics-drawer'))
const mobileDrawerStyles = mobileChunks[mobileChunks.length - 1]
if (!mobileDrawerStyles) throw new Error('样式表缺少窄屏抽屉规则')

describe('统计入口与抽屉样式', () => {
  it('地图框承载右上角的统计入口', () => {
    expect(property(css, '.province-map-frame', 'position')).toBe('relative')
    expect(property(css, '.statistics-toggle', 'position')).toBe('absolute')
    expect(property(css, '.statistics-toggle', 'top')).toBeTruthy()
    expect(property(css, '.statistics-toggle', 'right')).toBeTruthy()
  })

  it('抽屉是右侧固定浮层且不带任何遮罩', () => {
    expect(property(css, '.statistics-drawer', 'position')).toBe('fixed')
    expect(property(css, '.statistics-drawer', 'right')).toBe('0')
    expect(property(css, '.statistics-drawer', 'bottom')).toBe('0')
    expect(css).not.toMatch(/\.statistics-[a-z-]*backdrop/)
  })

  it('窄屏时抽屉从视口底部升起并占七成高度', () => {
    expect(property(mobileDrawerStyles, '.statistics-drawer', 'top')).toBe('auto')
    expect(property(mobileDrawerStyles, '.statistics-drawer', 'left')).toBe('0')
    expect(property(mobileDrawerStyles, '.statistics-drawer', 'height')).toBe('70vh')
    expect(property(mobileDrawerStyles, '.statistics-drawer', 'width')).toBe('100%')
  })

  it('零足迹月份与空进度条在视觉上可区分', () => {
    expect(Number(property(css, '.statistics-month-cell.is-empty', 'opacity'))).toBeLessThan(1)
    expect(property(css, '.statistics-coverage-fill', 'background')).toBeTruthy()
  })

  it('开合动画走 transition，因而被既有减少动态效果规则抑制', () => {
    expect(property(css, '.statistics-drawer', 'transition')).toBeTruthy()
    expect(block(css, '.statistics-drawer')).not.toMatch(/animation\s*:/)
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
