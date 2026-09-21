import { describe, expect, it } from 'vitest'
import { COMMON_MEMORY_TAGS, createTagInput } from './tagInput'

describe('createTagInput', () => {
  it('把加入的词作为标签保留', () => {
    const input = createTagInput()

    input.addTag('古都')

    expect(input.tags.value).toEqual(['古都'])
  })

  it('去掉词两端的空白', () => {
    const input = createTagInput()

    input.addTag('  古都  ')

    expect(input.tags.value).toEqual(['古都'])
  })

  it('忽略空白词', () => {
    const input = createTagInput()

    expect(input.addTag('')).toBe(false)
    expect(input.addTag('   ')).toBe(false)

    expect(input.tags.value).toEqual([])
  })

  it('不重复添加已经存在的词', () => {
    const input = createTagInput()

    expect(input.addTag('古都')).toBe(true)
    expect(input.addTag('古都')).toBe(false)

    expect(input.tags.value).toEqual(['古都'])
  })

  it('移除一个标签不影响其他标签', () => {
    const input = createTagInput(['古都', '美食', '夜景'])

    input.removeTag('美食')

    expect(input.tags.value).toEqual(['古都', '夜景'])
  })

  it('移除不存在的标签时保持原样', () => {
    const input = createTagInput(['古都'])

    input.removeTag('美食')

    expect(input.tags.value).toEqual(['古都'])
  })

  it('初始标签去重并清理空白', () => {
    const input = createTagInput([' 古都 ', '古都', '美食', ''])

    expect(input.tags.value).toEqual(['古都', '美食'])
  })

  it('提交时把未回车的草稿词并入标签', () => {
    const input = createTagInput(['古都'])
    input.draft.value = '美食'

    expect(input.resolve()).toEqual(['古都', '美食'])
  })

  it('草稿词并入后清空输入框', () => {
    const input = createTagInput()
    input.draft.value = '美食'

    input.resolve()

    expect(input.draft.value).toBe('')
  })

  it('草稿词为空时提交不产生空标签', () => {
    const input = createTagInput(['古都'])
    input.draft.value = '   '

    expect(input.resolve()).toEqual(['古都'])
  })

  it('提交时草稿词与已有标签重复则不重复加入', () => {
    const input = createTagInput(['古都'])
    input.draft.value = '古都'

    expect(input.resolve()).toEqual(['古都'])
  })

  it('已经提交过的草稿词不会在下次提交时再次加入', () => {
    const input = createTagInput()
    input.draft.value = '美食'
    input.resolve()
    input.draft.value = '夜景'

    expect(input.resolve()).toEqual(['美食', '夜景'])
  })

  it('不在输入层过滤受管理标签', () => {
    const input = createTagInput()

    input.addTag('visited:2026-08-19')
    input.addTag('city:513400')

    expect(input.tags.value).toEqual(['visited:2026-08-19', 'city:513400'])
  })

  it('识别已经选中的词', () => {
    const input = createTagInput(['古都'])

    expect(input.hasTag('古都')).toBe(true)
    expect(input.hasTag('美食')).toBe(false)
  })

  it('提供一组不含受管理标签的内置常用词', () => {
    expect(COMMON_MEMORY_TAGS.length).toBeGreaterThan(0)
    expect(COMMON_MEMORY_TAGS.every((tag) => !/^(visited|city|county):/.test(tag))).toBe(true)
  })
})
