export const SEARCH_FILTERS = [
  { value: 'all', label: 'Todo' }, { value: 'events', label: 'Eventos' }, { value: 'locations', label: 'Ubicaciones' }, { value: 'tribes', label: 'Tribus' },
  { value: 'users', label: 'Personas' }, { value: 'hosts', label: 'Creadores y anfitriones' },
] as const;
export type SearchType = typeof SEARCH_FILTERS[number]['value'];
export type GlobalSearchResult = { id: string; type: 'event' | 'user' | 'tribe'; title: string; description?: string; image?: string;
  metadata?: { date?: string; location?: string; username?: string; role?: string; isHost?: boolean; memberCount?: number; category?: string; price?: number | { amount: number; currency: string } } };
export type SearchPage = { results: GlobalSearchResult[]; pagination: { page: number; total: number; hasMore: boolean } };
export function readSearchPage(payload: unknown): SearchPage {
  const value = payload as { success?: boolean; results?: GlobalSearchResult[]; pagination?: SearchPage['pagination'] } | null;
  if (value?.success !== true || !Array.isArray(value.results) || value.results.some(item => !item || !/^[a-f0-9]{24}$/i.test(item.id) || !['event', 'user', 'tribe'].includes(item.type) || typeof item.title !== 'string')) throw new Error('Respuesta de búsqueda inválida');
  const page = value.pagination;
  return { results: value.results, pagination: { page: Number.isSafeInteger(page?.page) && page!.page > 0 ? page!.page : 1,
    total: Number.isSafeInteger(page?.total) && page!.total >= 0 ? page!.total : value.results.length, hasMore: page?.hasMore === true } };
}
export function searchResultPath(result: GlobalSearchResult, native = false) {
  if (!/^[a-f0-9]{24}$/i.test(result.id)) return null;
  return `${result.type === 'event' ? native ? '/event/' : '/events/' : result.type === 'tribe' ? native ? '/tribe/' : '/tribes/' : native ? '/user/' : '/users/'}${result.id}`;
}
