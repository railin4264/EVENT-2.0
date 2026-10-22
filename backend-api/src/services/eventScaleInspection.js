// Numeric, read-only evidence. These review thresholds are operational choices,
// not a claim that any particular user count is supported.
async function inspectEventScale(collection, now = new Date()) {
  const [eventCount, largest, explained] = await Promise.all([
    collection.countDocuments({}, { maxTimeMS: 5000 }),
    collection.aggregate([{ $project: { _id: 0, bytes: { $bsonSize: '$$ROOT' },
      attendees: { $size: { $ifNull: ['$attendees', []] } }, views: { $size: { $ifNull: ['$views', []] } },
      maxAttendees: 1, isDemo: { $in: ['demo', { $ifNull: ['$tags', []] }] } } }, { $sort: { bytes: -1 } }, { $limit: 10 }], { maxTimeMS: 5000 }).toArray(),
    collection.find({ status: 'published', date: { $gte: now } }, { projection: { _id: 1, date: 1 }, maxTimeMS: 5000 })
      .sort({ date: 1 }).limit(20).explain('executionStats')
  ]);
  const stats = explained.executionStats || {};
  return { capturedAt: now.toISOString(), capacityCertified: false, eventCount, largestDocuments: largest,
    chosenReviewThresholds: { documentBytes: 4 * 1024 * 1024, embeddedAttendees: 10000, embeddedViews: 20000 },
    migrationReviewRequired: largest.some(row => row.bytes >= 4 * 1024 * 1024 || row.attendees > 10000 || row.views > 20000),
    declaredCapacityNeedsValidation: largest.some(row => row.maxAttendees > 10000),
    query: { shape: 'public-upcoming-by-date-limit-20', returned: stats.nReturned, documentsExamined: stats.totalDocsExamined,
      keysExamined: stats.totalKeysExamined, executionTimeMs: stats.executionTimeMillis },
    note: 'Snapshot from this database only. Repeat with representative data and traffic before defining supported capacity.' };
}
module.exports = { inspectEventScale };
