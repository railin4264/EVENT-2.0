// Only internal read screens are valid notification destinations.
export function notificationDestination(notification: { data?: Record<string, unknown>; actionUrl?: string }): string {
  const id = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value) ? value : null;
  const data = notification.data || {};
  const event = id(data.eventId), tribe = id(data.tribeId), user = id(data.userId), post = id(data.postId);
  if (event) return `/event/${event}`;
  if (tribe) return `/tribe/${tribe}`;
  if (post) return `/post/${post}`;
  if (user) return `/user/${user}`;
  if (typeof data.chatId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(data.chatId)) return `/chat/${data.chatId}`;
  const match = notification.actionUrl?.match(/^\/(?:events|event)\/([a-f0-9]{24})$/i);
  return match ? `/event/${match[1]}` : '/notifications';
}
