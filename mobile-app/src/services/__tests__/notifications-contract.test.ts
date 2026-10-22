import { notificationsService } from '../notificationsService';
import { apiClient } from '../apiClient';
jest.mock('../apiClient', () => ({ apiClient: { get: jest.fn() } }));
const get = apiClient.get as jest.Mock;
beforeEach(() => jest.clearAllMocks());
test('the notification list service must provide the document array consumed by the provider', async () => {
  get.mockResolvedValue({ data: { success: true, data: { notifications: [{ _id: 'audit-note', title: 'Aviso' }], unreadCount: 1, totalCount: 1, pagination: { hasMore: false } } } });
  const result = await notificationsService.getNotifications();
  expect(result.notifications).toEqual([{ _id: 'audit-note', title: 'Aviso' }]);
});
test('unread count must match the active provider contract', async () => {
  get.mockResolvedValue({ data: { success: true, data: { unreadCount: 3 } } });
  const result = await notificationsService.getUnreadCount();
  expect(result.count).toBe(3);
});
test('unread filter must use the parameter accepted by the API', async () => {
  get.mockResolvedValue({ data: { success: true, data: { notifications: [] } } });
  await notificationsService.getNotifications({ unread: true });
  expect(get).toHaveBeenCalledWith('/notifications?unreadOnly=true');
});
