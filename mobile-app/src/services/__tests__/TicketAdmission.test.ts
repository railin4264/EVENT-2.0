import ticketService, { AdmissionError } from '../TicketService';
import { apiClient } from '../apiClient';
jest.mock('../apiClient', () => ({ apiClient: { post: jest.fn() } }));
const post = apiClient.post as jest.Mock;
beforeEach(() => jest.resetAllMocks());

test('sends the selected event and only accepts an explicitly valid server check-in', async () => {
  post.mockResolvedValue({ data: { success: true, data: { valid: true, message: 'Registrada', quantity: 1 } } });
  await expect(ticketService.validateByQR('qr-code', 'event-id')).resolves.toMatchObject({ valid: true, quantity: 1 });
  expect(post).toHaveBeenCalledWith('/tickets/validate-qr', { qrCode: 'qr-code', eventId: 'event-id' });
});

test('success wrappers and truthy values cannot authorize an invalid admission', async () => {
  for (const data of [{ success: true, data: { valid: false } }, { success: true, data: { message: 'No' } }, { success: true, data: { valid: 'true' } }]) {
    post.mockResolvedValue({ data });
    await expect(ticketService.validateByQR('code', 'event')).rejects.toBeInstanceOf(AdmissionError);
  }
});

test('preserves conflict and authorization errors for recoverable scanner feedback', async () => {
  for (const status of [403, 409]) {
    post.mockRejectedValue({ response: { status, data: { message: 'No registrada' } } });
    await expect(ticketService.validateByQR('code', 'event')).rejects.toMatchObject({ status, message: 'No registrada' });
  }
});
