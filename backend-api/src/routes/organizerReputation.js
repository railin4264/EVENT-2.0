const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const EventReview = require('../models/EventReview');
const { protect } = require('../middleware/auth');
const { verifiedAttendance, publicEvent, publicFilter } = require('../services/organizerReputation');
const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); res.vary('Authorization'); next(); });
const isId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const failure = (res, status, message) => res.status(status).json({ success: false, message });

router.get('/events/:eventId/review', protect, async (req, res, next) => {
  try {
    if (!isId(req.params.eventId)) return failure(res, 400, 'Evento inválido');
    const event = await Event.findById(req.params.eventId).lean();
    if (!publicEvent(event)) return failure(res, 404, 'Evento no disponible para opiniones públicas');
    const [eligible, own] = await Promise.all([verifiedAttendance(event, req.user._id), EventReview.findOne({ event: event._id, user: req.user._id }).select('rating comment updatedAt -_id').lean()]);
    res.json({ success: true, data: { eligible, review: own, reason: eligible ? null : 'Necesitas una entrada registrada en la puerta y el evento debe haber comenzado. El anfitrión no puede valorarse.' } });
  } catch (error) { next(error); }
});

router.put('/events/:eventId/review', protect, async (req, res, next) => {
  try {
    if (!isId(req.params.eventId)) return failure(res, 400, 'Evento inválido');
    const { rating, comment = '' } = req.body;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== 'string' || comment.trim().length > 600) return failure(res, 400, 'Elige de 1 a 5 estrellas y un comentario de hasta 600 caracteres');
    const event = await Event.findById(req.params.eventId).lean();
    if (!publicEvent(event)) return failure(res, 404, 'Evento no disponible para opiniones públicas');
    if (!await verifiedAttendance(event, req.user._id)) return failure(res, 403, 'Sólo asistentes con entrada registrada pueden opinar después de comenzar el evento');
    const values = { rating, comment: comment.trim(), attendanceVerifiedAt: new Date() };
    let review;
    try {
      review = await EventReview.findOneAndUpdate({ event: event._id, user: req.user._id }, { $set: values }, { upsert: true, new: true, runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      review = await EventReview.findOneAndUpdate({ event: event._id, user: req.user._id }, { $set: values }, { new: true, runValidators: true });
    }
    res.json({ success: true, data: { rating: review.rating, comment: review.comment, updatedAt: review.updatedAt } });
  } catch (error) { next(error); }
});

router.get('/:organizerId', async (req, res, next) => {
  try {
    if (!isId(req.params.organizerId)) return failure(res, 400, 'Anfitrión inválido');
    if (!await User.exists({ _id: req.params.organizerId, isActive: { $ne: false }, isPrivate: { $ne: true }, 'settings.privacy.showProfile': { $ne: false } })) return failure(res, 404, 'Anfitrión no disponible');
    const now = new Date(), from = new Date(now.getTime() - 365 * 86400000);
    const match = { ...publicFilter, createdBy: new mongoose.Types.ObjectId(req.params.organizerId), date: { $gte: from, $lte: now } };
    const [counts] = await Event.aggregate([
      { $match: match },
      { $lookup: { from: 'orders', let: { eventId: '$_id' }, pipeline: [
        { $match: { $expr: { $eq: ['$eventId', '$$eventId'] }, status: { $in: ['confirmed', 'completed'] }, paymentStatus: 'succeeded', items: { $elemMatch: { checkedInAt: { $type: 'date', $lte: now } } } } },
        { $limit: 1 }, { $project: { _id: 1 } }
      ], as: 'doorEvidence' } },
      { $group: { _id: null, scheduled: { $sum: 1 }, cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        markedCompleted: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        withCheckIns: { $sum: { $cond: [{ $and: [{ $ne: ['$status', 'cancelled'] }, { $or: [{ $gt: [{ $size: '$doorEvidence' }, 0] }, { $gt: [{ $size: { $filter: { input: { $ifNull: ['$attendees', []] }, as: 'attendee', cond: { $and: [{ $in: ['$$attendee.status', ['attending', 'confirmed']] }, { $eq: [{ $type: '$$attendee.checkedInAt' }, 'date'] }, { $lte: ['$$attendee.checkedInAt', now] }] } } } }, 0] }] }] }, 1, 0] } } } }
    ]);
    const [opinions] = await Event.aggregate([
      { $match: { ...match, status: { $in: ['published', 'completed', 'expired'] } } },
      { $lookup: { from: 'eventreviews', let: { eventId: '$_id' }, pipeline: [
        { $match: { $expr: { $eq: ['$event', '$$eventId'] } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$rating' } } }
      ], as: 'opinions' } },
      { $unwind: '$opinions' },
      { $group: { _id: null, count: { $sum: '$opinions.count' }, total: { $sum: '$opinions.total' } } }
    ]);
    const data = counts || { scheduled: 0, cancelled: 0, markedCompleted: 0, withCheckIns: 0 };
    delete data._id;
    res.json({ success: true, data: { ...data, period: { from, to: now, days: 365 }, cancellationRate: data.scheduled ? Math.round(data.cancelled / data.scheduled * 1000) / 10 : null,
      reviews: { count: opinions?.count || 0, average: opinions ? Math.round(opinions.total / opinions.count * 10) / 10 : null },
      methodology: 'Eventos públicos con fecha de inicio en los últimos 365 días. Finalizado es el estado declarado; entradas registradas es evidencia en puerta, no prueba de satisfacción. Cancelaciones / eventos programados. Se excluyen eventos privados y ubicaciones secretas.' } });
  } catch (error) { next(error); }
});
module.exports = router;
