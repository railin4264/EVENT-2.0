// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SiteSections } from './SiteSections'
import { SITE_SECTIONS } from '@/lib/site-sections'
vi.mock('next/navigation', () => ({ usePathname: () => '/planning-tools' }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ isAuthenticated: false }) }))
afterEach(cleanup)
it('exposes every public section and indicates the active tool', () => {
  render(<SiteSections className="flex" />)
  for (const section of SITE_SECTIONS) expect(screen.getByRole('link', { name: section.label, hidden: true }).getAttribute('href')).toBe(section.href)
  expect(screen.getByRole('link', { name: 'Tengo un rato libre', hidden: true }).getAttribute('aria-current')).toBe('page')
})
it('closes the menu with Escape and restores keyboard focus', () => {
  const { container } = render(<SiteSections className="flex" />)
  const details = container.querySelector('details')!
  details.open = true
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(details.open).toBe(false)
  expect(document.activeElement).toBe(container.querySelector('summary'))
})
