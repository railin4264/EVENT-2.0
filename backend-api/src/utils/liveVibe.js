'use strict';

const VIBES = ['lit', 'chill', 'packed', 'winding_down'];
const REPORT_TTL_MS = 2 * 3600000;

// A start date or a recurrence flag alone does not establish a live session.
function isLive(event, now = Date.now()) {
  const start = new Date(event.date).getTime();
  const end = event.endDate && new Date(event.endDate).getTime();
  return event.status === 'published' && Number.isFinite(start) && start <= now && Number.isFinite(end) && end > now;
}

function summarizeVibe(event, now = Date.now()) {
  const counts = Object.fromEntries(VIBES.map(vibe => [vibe, 0]));
  const seen = new Set();
  const reports = isLive(event, now) ? [...(event.vibeRadar?.recentReports || [])]
    .sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt))
    .filter(report => {
      const time = new Date(report.reportedAt).getTime();
      const user = String(report.user?._id || report.user || '');
      if (!user || seen.has(user) || !VIBES.includes(report.vibe) || time > now || time < now - REPORT_TTL_MS || time < new Date(event.date).getTime()) return false;
      seen.add(user);
      return true;
    }) : [];
  for (const report of reports) counts[report.vibe]++;
  // Most recent report breaks a tie; legacy accumulated counters are never used.
  const currentVibe = reports.reduce((best, report) => counts[report.vibe] > (counts[best] || 0) ? report.vibe : best, reports[0]?.vibe || 'none');
  return { currentVibe, counts, reportsCount: reports.length,
    recentReports: reports.map(r => ({ vibe: r.vibe, comment: r.comment, reportedAt: r.reportedAt })),
    lastReportedAt: reports[0]?.reportedAt || null, reportWindowMinutes: 120 };
}

module.exports = { VIBES, REPORT_TTL_MS, isLive, summarizeVibe };
