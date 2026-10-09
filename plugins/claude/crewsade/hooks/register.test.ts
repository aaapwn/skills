import { expect, test } from 'claude-code/testing'

// The hide toggle lives in the hooks, so these go through the engine, not logic.ts
test('the band command hides, shows, and toggles', async $ => {
  const hide = await $.command.run({ command: 'crewsade-band', args: 'hide' })
  expect(hide.text).toContain('hidden')
  // hide twice stays hidden: a bare toggle would show it again here
  const again = await $.command.run({ command: 'crewsade-band', args: 'hide' })
  expect(again.text).toContain('hidden')
  const show = await $.command.run({ command: 'crewsade-band', args: 'show' })
  expect(show.text).toBe('crewsade band shown')
  const toggled = await $.command.run({ command: 'crewsade-band', args: '' })
  expect(toggled.text).toContain('hidden')
})
