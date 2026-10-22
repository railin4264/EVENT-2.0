import { test, expect } from '@playwright/test'

test('two-factor login requests a code and keeps invalid challenges unauthenticated', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({ json: { requiresTwoFactor: true, tempToken: 'test-challenge' } }))
  await page.route('**/api/auth/verify-2fa', async route => {
    expect(route.request().postDataJSON()).toMatchObject({ tempToken: 'test-challenge', code: '123456' })
    await route.fulfill({ status: 400, json: { message: 'Código inválido' } })
  })
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('test@example.com')
  await page.locator('input[type="password"]').fill('StrongPass1!')
  await page.locator('button[type="submit"]').click()
  await expect(page.getByLabel('Código de verificación')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeDisabled()
  await page.getByLabel('Código de verificación').fill('123456')
  await page.locator('button[type="submit"]').click()
  await expect(page.getByText('Código inválido').first()).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

const fixture = {
  _id: '507f1f77bcf86cd799439011', title: 'Encuentro de música en el parque', description: 'Actividad de prueba',
  category: 'music', date: '2030-10-10T20:00:00Z', status: 'published', isPrivate: false,
  location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Santo Domingo' },
  attendees: [], attendeesCount: 3, images: [], createdAt: '2030-01-01', price: { amount: 0, currency: 'DOP' },
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/events?**', route => route.fulfill({ json: { success: true, events: [fixture] } }))
  await page.route('**/health', route => route.fulfill({ json: { status: 'ok' } }))
})

test('event links open real routes and filters recover from empty results', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver evento', exact: true })).toHaveAttribute('href', `/events/${fixture._id}`)
  await page.getByRole('button', { name: 'Deportes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Probemos con otro plan' })).toBeVisible()
  await page.getByRole('button', { name: 'Quitar filtros' }).click()
  await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible()
  expect(errors).toEqual([])
})

test('mobile discovery fits viewport and the map initializes without runtime errors', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Vista de mapa' }).click()
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await page.getByRole('button', { name: 'Vista de lista' }).click()
  await page.getByRole('button', { name: 'Vista de mapa' }).click()
  await expect(page.locator('.leaflet-container')).toBeVisible()
  expect(errors).toEqual([])
  await page.screenshot({ path: 'test-results/discovery-mobile.png', fullPage: true })
})

test('failed event loading displays a retry instead of pretending there are no events', async ({ page }) => {
  await page.route('**/api/events?**', route => route.fulfill({ status: 500, json: { success: false } }))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Volver a intentar' })).toBeVisible({ timeout: 15000 })
  await page.route('**/api/events?**', route => route.fulfill({ json: { success: true, events: [fixture] } }))
  await page.getByRole('button', { name: 'Volver a intentar' }).click()
  await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible()
})

test('event creation sends guests through login and password recovery has a destination', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Crear evento', exact: true }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await page.goto('/reset-password')
  await expect(page.getByText(/enlace.*(válido|caducado)|token|solicita/i).first()).toBeVisible()
})

test('organizer admission form records a group and reports repeat scans', async ({ page, context }) => {
  // Keep unrelated navigation requests inside this isolated browser fixture.
  await page.route('**/api/**', route => route.fulfill({ json: { success: true, data: [], unreadCount: 0 } }))
  await context.addCookies([{ name: 'auth-token', value: 'test-session', domain: 'localhost', path: '/' }])
  await page.addInitScript(() => {
    sessionStorage.setItem('auth-token', 'test-session')
    sessionStorage.setItem('auth-storage', JSON.stringify({ state: { user: { id: 'organizer', firstName: 'Test' }, token: 'test-session', isAuthenticated: true }, version: 0 }))
  })
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, user: { id: 'organizer', firstName: 'Test' } } }))
  let scans = 0
  await page.route('**/api/tickets/validate-qr', route => {
    expect(route.request().postDataJSON()).toEqual({ eventId: fixture._id, qrCode: 'EC:test' })
    return route.fulfill(++scans === 1
      ? { json: { success: true, data: { quantity: 2, orderNumber: 'EC-TEST' } } }
      : { status: 409, json: { success: false, message: 'Entrada ya utilizada' } })
  })
  await page.goto(`/events/${fixture._id}/check-in`)
  await page.getByLabel('Código de la entrada').fill('EC:test')
  await page.getByRole('button', { name: 'Validar y registrar entrada' }).click()
  await expect(page.getByRole('status').filter({ hasText: '2 personas' })).toBeVisible()
  await expect(page.getByLabel('Código de la entrada')).toHaveValue('')
  await page.getByLabel('Código de la entrada').fill('EC:test')
  await page.getByRole('button', { name: 'Validar y registrar entrada' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Entrada ya utilizada' })).toBeVisible()
})
