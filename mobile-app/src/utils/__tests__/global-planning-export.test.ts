import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { exportPlanningCalendar, sharePlanningSummary } from '../global-planning-export';
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/', EncodingType: { UTF8: 'utf8' }, writeAsStringAsync: jest.fn(),
  StorageAccessFramework: { requestDirectoryPermissionsAsync: jest.fn(), createFileAsync: jest.fn() },
}));
const event = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', title: 'Actividad', date: '2027-01-02T22:00:00Z', endDate: '2027-01-02T23:00:00Z' };
const platform = Platform as { OS: string }, initialOS = Platform.OS;
beforeEach(() => { jest.clearAllMocks(); platform.OS = 'android'; });
afterEach(() => { platform.OS = initialOS; jest.restoreAllMocks(); });
test('Android cancellation does not write a file or claim a share', async () => {
  (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  expect(await exportPlanningCalendar(event)).toBe('cancelled');
  expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
});
test('Android saves a real ICS to the folder chosen by the user', async () => {
  (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, directoryUri: 'content://chosen' });
  (FileSystem.StorageAccessFramework.createFileAsync as jest.Mock).mockResolvedValue('content://chosen/calendar');
  expect(await exportPlanningCalendar(event)).toBe('saved');
  expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('content://chosen/calendar', expect.stringContaining('DTEND:20270102T230000Z'), { encoding: 'utf8' });
});
test('filesystem failure is propagated instead of reporting a saved calendar', async () => {
  (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));
  await expect(exportPlanningCalendar(event)).rejects.toThrow('Storage unavailable');
});
test('iOS shares a calendar file and preserves a dismissed result', async () => {
  platform.OS = 'ios'; jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
  expect(await exportPlanningCalendar(event)).toBe('cancelled');
  expect(Share.share).toHaveBeenCalledWith({ url: 'file:///cache/eventnow-aaaaaaaaaaaaaaaaaaaaaaaa.ics', title: 'Calendario del evento' });
});
test('summary shares only selected public fields and does not confirm attendance', async () => {
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  await sharePlanningSummary([{ ...event, attendees: ['private identity'] } as any], 'UTC', 'UTC');
  const body = (Share.share as jest.Mock).mock.calls[0][0];
  expect(body.message).toContain('no confirma asistencia'); expect(body.message).not.toContain('private identity');
});
