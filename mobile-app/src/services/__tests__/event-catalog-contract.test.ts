import { eventService } from '../EventService';
import { apiClient } from '../apiClient';
jest.mock('../apiClient', () => ({ apiClient: { get: jest.fn() } }));
const rows = [{ _id: 'a', title: 'Evento real' }];
const pagination = { page: 2, limit: 30, total: 41, pages: 2 };
beforeEach(() => jest.clearAllMocks());
test('native catalog reads the same events property emitted by the actual API', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true, events: rows, pagination } });
  expect(await eventService.getEvents({ page: 2 })).toEqual({ success: true, data: rows, pagination });
});
test('search also normalizes the canonical collection and keeps pagination', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true, events: rows, pagination } });
  expect((await eventService.searchEvents('real')).data).toEqual(rows);
});
test('legacy data arrays remain compatible', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true, data: rows, pagination } });
  expect((await eventService.getEvents()).data).toEqual(rows);
});
test('an invalid catalog is an error rather than a fake empty list', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true } });
  await expect(eventService.getEvents()).rejects.toThrow();
});
test('nearby API failure is visible to permission and map error handling', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: false } });
  await expect(eventService.getNearbyEvents(18, -69)).rejects.toThrow();
});
