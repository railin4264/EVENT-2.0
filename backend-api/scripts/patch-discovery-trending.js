const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/routes/discovery.js');
let content = fs.readFileSync(file, 'utf8');

const target = 'const rows = await trendingIds({ scope: req.discoveryScope, categoryFilter, user: req.user, limit });';
const replacement = `let rows = await trendingIds({ scope: req.discoveryScope, categoryFilter, user: req.user, limit });
    if (rows.length < limit) {
      const taken = new Set(rows.map(r => String(r._id)));
      const geo = req.discoveryScope.geo;
      const fallbackFilter = { ...upcoming(req.user), ...scopeFilter(req.discoveryScope), _id: { $nin: [...taken] } };
      if (geo) fallbackFilter.location = geoFilter(geo.lat, geo.lng, geo.radiusKm);
      if (categoryFilter !== null && categoryFilter !== undefined) fallbackFilter.category = categoryFilter;
      const fallbackEvents = await Event.find(fallbackFilter).sort({ date: 1, _id: 1 }).limit(limit - rows.length).select('_id');
      rows = rows.concat(fallbackEvents.map(e => ({ _id: e._id, score: 1.0 })));
    }`;

if (content.includes(target)) {
  content = content.replace(target, () => replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated discovery.js with trending fallback');
} else {
  console.log('Target not found in discovery.js');
}
