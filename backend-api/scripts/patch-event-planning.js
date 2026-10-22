const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/routes/eventPlanning.js');
let content = fs.readFileSync(file, 'utf8');

const target = `module.exports = router;`;

const newRoutes = `
// ─── Trip & Outing Budget Calculator ──────────────────────────────────────────

// @route   POST /api/event-planning/:id/trip-budget
// @desc    Calculate complete travel, lodging, dining, and serrucho split for an event
router.post('/:id/trip-budget', optionalAuth, access, async (req, res) => {
  try {
    const event = req.planningEvent;
    const { calculateTripBudget } = require('../services/tripBudgetCalculator');

    const result = calculateTripBudget({
      ticketPrice: event.price?.amount || 0,
      currency: event.price?.currency || 'USD',
      destinationCity: event.location?.city || 'Santo Domingo',
      originCity: req.body.originCity || (req.user?.location?.city || ''),
      travelersCount: req.body.travelersCount || 1,
      nights: req.body.nights !== undefined ? req.body.nights : (req.body.originCity && req.body.originCity.toLowerCase() !== (event.location?.city || '').toLowerCase() ? 1 : 0),
      lodgingTier: req.body.lodgingTier || 'hotel',
      diningTier: req.body.diningTier || 'midRange',
      transportMode: req.body.transportMode || 'local',
      customTransportAmount: req.body.customTransportAmount || 0,
      eventDate: event.date
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error calculating trip budget: ' + error.message });
  }
});

// @route   GET /api/event-planning/benchmarks/cities
// @desc    Get destination benchmarks for lodging, dining, and transit
router.get('/benchmarks/cities', (req, res) => {
  const { CITY_BENCHMARKS } = require('../services/tripBudgetCalculator');
  res.json({ success: true, cities: Object.values(CITY_BENCHMARKS) });
});

module.exports = router;`;

if (content.includes('module.exports = router;')) {
  content = content.replace(target, () => newRoutes);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully added trip budget routes to eventPlanning.js');
} else {
  console.error('Target not found in eventPlanning.js');
}
