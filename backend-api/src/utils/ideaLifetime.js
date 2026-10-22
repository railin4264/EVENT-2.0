const DAY = 86400000;
const DEFAULT_DAYS = 14;

function ideaDeadline(idea) {
  const deadline = idea.quorumDeadline ? new Date(idea.quorumDeadline) : new Date(new Date(idea.createdAt).getTime() + DEFAULT_DAYS * DAY);
  return Number.isFinite(deadline.getTime()) ? deadline : new Date(0);
}
const ideaExpired = (idea, now = new Date()) => ideaDeadline(idea).getTime() <= new Date(now).getTime();
const activeDeadline = now => ({ $or: [
  { quorumDeadline: { $gt: now } },
  { quorumDeadline: null, createdAt: { $gt: new Date(now.getTime() - DEFAULT_DAYS * DAY) } }
] });
const expiredDeadline = now => ({ $or: [
  { quorumDeadline: { $lte: now } },
  { quorumDeadline: null, createdAt: { $lte: new Date(now.getTime() - DEFAULT_DAYS * DAY) } }
] });
module.exports = { ideaDeadline, ideaExpired, activeDeadline, expiredDeadline };
