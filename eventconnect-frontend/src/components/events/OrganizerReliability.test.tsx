// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrganizerReliability from './OrganizerReliability'
const mock = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), user: null as { id: string } | null, review: null as { rating: number; comment: string } | null }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mock.get, put: mock.put } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (selector?: (state: { user: typeof mock.user }) => unknown) => selector ? selector({ user: mock.user }) : { user: mock.user } }))
const stats = { scheduled: 0, cancelled: 0, markedCompleted: 0, withCheckIns: 0, cancellationRate: null, reviews: { count: 0, average: null }, methodology: 'Sólo registros reales.' }
let client: QueryClient
const show = (isPublic = true) => { client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); return render(<QueryClientProvider client={client}><OrganizerReliability organizerId="host" eventId="event" isPublic={isPublic} /></QueryClientProvider>) }
beforeEach(() => { vi.resetAllMocks(); mock.user = null; mock.review = null; mock.get.mockImplementation(async (path: string) => ({ data: { success: true, data: path.endsWith('/review') ? { eligible: true, review: mock.review, reason: null } : stats } })); mock.put.mockResolvedValue({ data: { success: true } }) })
afterEach(cleanup)
it('does not fetch or display private-event reputation', () => { show(false); expect(mock.get).not.toHaveBeenCalled(); expect(screen.queryByText('Historial del anfitrión')).toBeNull() })
it('shows no reviews rather than a perfect invented score', async () => { show(); await screen.findByText('Aún no hay opiniones'); expect(screen.queryByText('5/5')).toBeNull(); expect(mock.get).toHaveBeenCalledTimes(1) })
it('saves only after an explicit eligible authenticated submission', async () => {
  mock.user = { id: 'me' }; show();
  fireEvent.change(await screen.findByRole('combobox', { name: 'Valoración' }), { target: { value: '5' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar opinión' }));
  await screen.findByText(/Opinión guardada/);
  expect(mock.put).toHaveBeenCalledWith('/organizer-reputation/events/event/review', { rating: 5, comment: '' });
})
it('does not report success after a failed write', async () => {
  mock.user = { id: 'me' }; mock.put.mockRejectedValue({ response: { data: { message: 'Sin conexión' } } }); show();
  fireEvent.change(await screen.findByRole('combobox', { name: 'Valoración' }), { target: { value: '5' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar opinión' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Sin conexión'));
  expect(screen.queryByText(/Opinión guardada/)).toBeNull();
})
it('starts without a selected score and cannot submit until a score is chosen', async () => {
  mock.user = { id: 'me' }; show();
  const select = await screen.findByRole('combobox', { name: 'Valoración' }) as HTMLSelectElement;
  expect(select.value).toBe('');
  const submit = screen.getByRole('button', { name: 'Guardar opinión' }) as HTMLButtonElement;
  expect(submit.disabled).toBe(true); fireEvent.click(submit);
  expect(mock.put).not.toHaveBeenCalled();
})
it('prefills the actual previous score and comment when editing', async () => {
  mock.user = { id: 'me' }; mock.review = { rating: 2, comment: 'Mi comentario anterior' }; show();
  await waitFor(() => expect((screen.getByRole('combobox', { name: 'Valoración' }) as HTMLSelectElement).value).toBe('2'));
  expect((screen.getByRole('textbox', { name: 'Comentario opcional' }) as HTMLTextAreaElement).value).toBe('Mi comentario anterior');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar opinión' }));
  await waitFor(() => expect(mock.put).toHaveBeenCalledWith('/organizer-reputation/events/event/review', { rating: 2, comment: 'Mi comentario anterior' }));
})
it('a background refetch does not replace an edited draft', async () => {
  mock.user = { id: 'me' }; mock.review = { rating: 2, comment: 'Original' }; show();
  const input = await screen.findByRole('textbox', { name: 'Comentario opcional' });
  await waitFor(() => expect((input as HTMLTextAreaElement).value).toBe('Original'));
  fireEvent.change(input, { target: { value: 'Borrador nuevo' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Valoración' }), { target: { value: '3' } });
  mock.review = { rating: 4, comment: 'Respuesta tardía del servidor' };
  await client.invalidateQueries({ queryKey: ['event-review', 'event', 'me'] });
  expect((input as HTMLTextAreaElement).value).toBe('Borrador nuevo');
  expect((screen.getByRole('combobox', { name: 'Valoración' }) as HTMLSelectElement).value).toBe('3');
})
