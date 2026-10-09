import { describe, expect, test } from 'claude-code/testing'

import { logCard, textWidth, wrap } from './logcard'
import type { LogRow } from './logic'

const row = (over: Partial<LogRow>): LogRow => ({
  time: '13:18',
  icon: '🧪',
  who: 'auditor',
  role: 'auditor',
  text: 'ตรวจงานที่ developer แก้มา · เขียน slugify พร้อมเทส',
  outcome: { text: '✗ ไม่ผ่าน', tone: 'error' },
  details: [],
  ...over,
})

describe('textWidth', () => {
  test('Thai vowel and tone marks take no width', async () => {
    expect(textWidth('ที่', 10)).toBe(textWidth('ท', 10))
    expect(textWidth('แก้', 10)).toBe(textWidth('แก', 10))
  })
})

describe('wrap', () => {
  test('every line fits, and nothing is lost', async () => {
    const text = 'Latin letters without decomposition are dropped when slugified'
    const lines = wrap(text, 120, 13)
    expect(lines.length > 1).toBe(true)
    for (const line of lines) expect(textWidth(line, 13) <= 120).toBe(true)
    expect(lines.join(' ')).toBe(text)
  })

  test('a Thai run with no spaces breaks between characters, never before a mark', async () => {
    const text = 'ตรวจงานที่ผู้พัฒนาแก้มาแล้วทั้งหมดอีกครั้งหนึ่ง'
    const lines = wrap(text, 80, 13)
    expect(lines.length > 1).toBe(true)
    expect(lines.join('')).toBe(text)
    for (const line of lines.slice(1)) expect(/^[ัิ-ฺ็-๎]/.test(line)).toBe(false)
  })
})

describe('logCard', () => {
  test('escapes text, so a title with < or & cannot break the SVG', async () => {
    const card = logCard(row({ details: ['Symbol meaning is lost (&, <, #)'] }), 320)
    expect(card.source.includes('(&amp;, &lt;, #)')).toBe(true)
    expect(card.source.includes('(&, <')).toBe(false)
  })

  test('grows with its fixes, and draws one pill for the outcome', async () => {
    const bare = logCard(row({}), 320)
    const withFixes = logCard(row({ details: ['Latin letters without decomposition are dropped', 'Apostrophes split words'] }), 320)
    expect(withFixes.height > bare.height).toBe(true)
    expect(bare.source.match(/rx="10"/g)?.length).toBe(1)
    expect(logCard(row({ outcome: null }), 320).source.includes('rx="10"')).toBe(false)
  })

  test('stays within the SVG size the desktop accepts', async () => {
    const long = logCard(row({ details: Array.from({ length: 40 }, (_, i) => `fix number ${i} with a fairly long title`) }), 320)
    expect(long.source.length < 131072).toBe(true)
  })
})
