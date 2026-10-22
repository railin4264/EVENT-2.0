const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Draft = require('../models/PersonalPlanDraft');
const {
  buildAgeRestrictionFilter,
  ageIsAllowed,
} = require('../utils/eventVisibility');
const { protect, optionalAuth } = require('../middleware/auth');
const {
  cleanDraft,
  parseConversation,
  freeWindow,
} = require('../utils/planningTools');
const router = express.Router();
router.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  res.vary('Authorization');
  next();
});
router.get('/free-time', optionalAuth, async (req, res, next) => {
  let window;
  try {
    window = freeWindow(req.query);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  try {
    const filter = {
      status: 'published',
      isPrivate: { $ne: true },
      visibility: { $nin: ['private', 'secret'] },
      isSecretLocation: { $ne: true },
      date: { $gte: window.from },
      endDate: { $lte: window.until, $ne: null },
      ...buildAgeRestrictionFilter(req.user),
    };
    if (window.city)
      filter['location.city'] = {
        $regex: `^${window.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      };
    const candidates = await Event.find(filter)
      .select('title date endDate timeZone location.city ageRestriction')
      .sort({ date: 1, _id: 1 })
      .limit(100)
      .lean();
    const data = candidates
      .filter((ev) => ev.endDate >= ev.date && ageIsAllowed(ev, req.user))
      .slice(0, 30)
      .map((ev) => ({
        _id: ev._id,
        title: ev.title,
        date: ev.date,
        endDate: ev.endDate,
        timeZone: ev.timeZone,
        city: ev.location?.city,
        travelMinutes: window.travelMinutes,
      }));
    return res.json({
      success: true,
      data,
      note: 'Sólo horarios completos. El traslado por trayecto es el que indicaste, no una estimación de tráfico.',
    });
  } catch (error) {
    return next(error);
  }
});
router.use(protect);
router.post('/parse', (req, res) => {
  try {
    return res.json({ success: true, data: parseConversation(req.body.text) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
router.get('/drafts', async (req, res, next) => {
  try {
    return res.json({
      success: true,
      data: await Draft.find({ owner: req.user.id })
        .sort({ updatedAt: -1 })
        .limit(30)
        .lean(),
    });
  } catch (error) {
    return next(error);
  }
});
router.post('/drafts', async (req, res, next) => {
  let fields;
  try {
    fields = cleanDraft(req.body.fields);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  try {
    const existing = await Draft.find({owner:req.user.id}).select('slot').lean();
    const full = () => res.status(409).json({success:false,message:'Conserva como máximo 30 borradores.'});
    if (existing.length >= 30) return full();
    const used = new Set(existing.map(d => d.slot).filter(Number.isInteger));
    // Older private drafts without a slot still consume capacity.
    let legacy = existing.filter(d => !Number.isInteger(d.slot)).length;
    for(let slot=0;slot<30 && legacy;slot++) if(!used.has(slot)){used.add(slot);legacy--;}
    for(let slot=0;slot<30;slot++) {
      if(used.has(slot)) continue;
      try {
        const draft=await Draft.create({owner:req.user.id,slot,fields});
        return res.status(201).json({success:true,data:draft});
      } catch(error) { if(error.code!==11000) throw error; }
    }
    return full();
  } catch (error) {
    return next(error);
  }
});
router.param('id', (req, res, next, id) =>
  mongoose.Types.ObjectId.isValid(id)
    ? next()
    : res.status(400).json({ success: false, message: 'Borrador inválido.' }),
);
router.get('/drafts/:id', async (req, res, next) => {
  try {
    const data = await Draft.findOne({
      _id: req.params.id,
      owner: req.user.id,
    }).lean();
    return data
      ? res.json({ success: true, data })
      : res
        .status(404)
        .json({ success: false, message: 'Borrador no disponible.' });
  } catch (error) {
    return next(error);
  }
});
router.put('/drafts/:id', async (req, res, next) => {
  let fields;
  try {
    fields = cleanDraft(req.body.fields);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  try {
    const data = await Draft.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: { fields } },
      { new: true, runValidators: true },
    );
    return data
      ? res.json({ success: true, data })
      : res
        .status(404)
        .json({ success: false, message: 'Borrador no disponible.' });
  } catch (error) {
    return next(error);
  }
});
router.delete('/drafts/:id', async (req, res, next) => {
  try {
    const data = await Draft.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });
    return data
      ? res.json({ success: true })
      : res
        .status(404)
        .json({ success: false, message: 'Borrador no disponible.' });
  } catch (error) {
    return next(error);
  }
});
module.exports = router;
