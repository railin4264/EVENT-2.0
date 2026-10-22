export function officialWebPage(path: '/organizers' | '/dashboard' | '/admin', configured = process.env.EXPO_PUBLIC_WEB_URL): string | null {
  try {
    const origin = new URL(configured || '');
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.hostname === 'localhost' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin.hostname) || /\.(test|invalid|local|example)$/.test(origin.hostname)) return null;
    return new URL(path, origin.origin).toString();
  } catch { return null; }
}
