import { expect, it } from 'vitest'
import { analyticsProperties } from './privacy'
it('removes personal fields, private links and nested credentials before analytics can persist', () => {
  const data = analyticsProperties({ email: 'private@example.test', name: 'Private name', coordinates: [1, 2], url: 'https://example.test/reset?token=secret', context: { password: 'secret', category: 'music' }, error: 'Request https://example.test/auth?token=secret from private@example.test' })
  expect(data).toMatchObject({ url: '/reset', context: { category: 'music' } })
  expect(JSON.stringify(data)).not.toMatch(/private@example|Private name|secret|coordinates/)
})
