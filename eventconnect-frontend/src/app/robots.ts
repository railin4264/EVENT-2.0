import type { MetadataRoute } from 'next'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Public discovery is indexable; account, admin and transactional areas are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/settings', '/profile', '/dashboard', '/messages', '/notifications', '/checkout', '/tickets',
        '/wallet', '/onboarding', '/oauth', '/login', '/register', '/forgot-password', '/reset-password', '/serrucho', '/plans/', '/events/*/edit', '/events/*/check-in']
    }],
    sitemap: `${appUrl}/sitemap.xml`
  }
}
