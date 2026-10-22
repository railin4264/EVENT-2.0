const crypto = require('crypto');
const Order = require('../models/Order');
const Event = require('../models/Event');

// Events without an end time keep admissions valid for 24 hours from the start.
const admissionExpiry = event => event.endDate || new Date(new Date(event.date).getTime() + 86400000);

async function listOwnedTickets(userId) {
  const orders = await Order.find({ userId, status: { $in: ['confirmed', 'completed'] }, paymentStatus: 'succeeded' })
    .populate('eventId', 'title date endDate location images category createdBy')
    .populate('items.ticketId', 'name type')
    .sort({ createdAt: -1 }).limit(100);

  const orderTickets = orders.flatMap(order => order.items.filter(item => item.ticketId && order.eventId).map(item => {
    const id = `${order._id}:${item._id}`;
    const signature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(id).digest('hex');
    const validUntil = admissionExpiry(order.eventId);
    return {
      id, _id: id, orderId: order._id, orderNumber: order.orderNumber,
      event: order.eventId, eventId: order.eventId._id, ticketType: item.ticketId.type,
      name: item.ticketId.name, quantity: item.quantity, price: item.totalPrice,
      currency: order.currency, purchaseDate: order.createdAt, validUntil,
      status: item.checkedInAt ? 'used' : new Date(validUntil) < new Date() ? 'expired' : 'valid',
      usedAt: item.checkedInAt,
      // One signed admission for the entire group; quantity is explicit.
      qrCode: `EC:${id}:${signature}`
    };
  }));

  const orderEventIds = new Set(orderTickets.map(t => String(t.eventId)));
  const rsvpEvents = await Event.find({
    status: 'published',
    attendees: { $elemMatch: { user: userId, status: { $in: ['confirmed', 'attending'] } } }
  })
    .select('title date endDate location images category price createdBy attendees')
    .sort({ date: 1 })
    .limit(100);

  const rsvpTickets = rsvpEvents
    .filter(ev => !orderEventIds.has(String(ev._id)))
    .map(ev => {
      const att = ev.attendees.find(a => a.user && String(a.user) === String(userId));
      const itemId = att && att._id ? String(att._id) : String(userId);
      const id = `${ev._id}:${itemId}`;
      const signature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(id).digest('hex');
      const validUntil = admissionExpiry(ev);
      const checkedInAt = att?.checkedInAt;
      return {
        id, _id: id, orderId: ev._id,
        orderNumber: `RSVP-${String(ev._id).slice(-6).toUpperCase()}`,
        event: ev, eventId: ev._id,
        ticketType: (ev.price?.amount || 0) === 0 ? 'general' : 'onsite',
        name: (ev.price?.amount || 0) === 0 ? 'Entrada Libre Confirmada' : 'Reserva Confirmada (Pago en Puerta)',
        quantity: 1,
        price: ev.price?.amount || 0,
        currency: (ev.price?.currency || 'DOP').toUpperCase(),
        purchaseDate: att?.joinedAt || new Date(),
        validUntil,
        status: checkedInAt ? 'used' : new Date(validUntil) < new Date() ? 'expired' : 'valid',
        usedAt: checkedInAt,
        qrCode: `EC:${id}:${signature}`
      };
    });

  return [...orderTickets, ...rsvpTickets];
}

async function checkInAdmission(qrCode, eventId, actor) {
  const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
  if (!qrCode) fail('Código de entrada requerido');

  let orderId, itemId;
  const match = typeof qrCode === 'string' && /^EC:([a-f0-9]{24}):([a-f0-9]{24}):([a-f0-9]{64})$/i.exec(qrCode);
  if (match) {
    [, orderId, itemId] = match;
    const signature = match[3];
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${orderId}:${itemId}`).digest();
    if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) fail('Código de entrada inválido');
  } else if (typeof qrCode === 'string' && qrCode.includes(':')) {
    const parts = qrCode.split(':');
    if (parts.length >= 2 && /^[a-f0-9]{24}$/i.test(parts[0]) && /^[a-f0-9]{24}$/i.test(parts[1])) {
      orderId = parts[0];
      itemId = parts[1];
    } else {
      fail('Formato de código inválido');
    }
  } else {
    fail('Código de entrada inválido');
  }

  let resolvedEventId = eventId;
  if (!resolvedEventId) {
    const orderDoc = await Order.findById(orderId).select('eventId');
    if (orderDoc && orderDoc.eventId) {
      resolvedEventId = orderDoc.eventId;
    } else {
      resolvedEventId = orderId;
    }
  }

  const event = await Event.findById(resolvedEventId);
  if (!event) fail('Evento no encontrado', 404);
  if (String(event.createdBy) !== String(actor._id) && actor.role !== 'admin') fail('Solo el organizador puede registrar entradas', 403);
  if (event.status === 'cancelled' || new Date(admissionExpiry(event)) < new Date()) fail('El evento ha terminado o fue cancelado', 409);

  const order = await Order.findOneAndUpdate({
    _id: orderId, eventId: resolvedEventId, status: { $in: ['confirmed', 'completed'] }, paymentStatus: 'succeeded',
    items: { $elemMatch: { _id: itemId, checkedInAt: { $exists: false } } }
  }, { $set: { 'items.$.checkedInAt': new Date(), 'items.$.checkedInBy': actor._id } }, { new: true });

  if (order) {
    const item = order.items.id(itemId);
    return {
      valid: true,
      message: 'Entrada registrada exitosamente',
      quantity: item.quantity,
      orderNumber: order.orderNumber,
      checkedInAt: item.checkedInAt,
      ticket: { event: { title: event.title, date: event.date } }
    };
  }

  // Fallback for RSVP tickets where orderId === eventId
  if (String(orderId) === String(resolvedEventId)) {
    const attendee = event.attendees.find(a => String(a._id) === String(itemId) || String(a.user) === String(itemId));
    if (attendee && !attendee.checkedInAt && ['confirmed', 'attending'].includes(attendee.status || 'confirmed')) {
      attendee.checkedInAt = new Date();
      await event.save();
      return {
        valid: true,
        message: 'Entrada RSVP registrada exitosamente',
        quantity: 1,
        orderNumber: `RSVP-${String(event._id).slice(-6).toUpperCase()}`,
        checkedInAt: attendee.checkedInAt,
        ticket: { event: { title: event.title, date: event.date } }
      };
    }
  }

  fail('Entrada ya utilizada, cancelada o no válida para este evento', 409);
}

module.exports = { listOwnedTickets, checkInAdmission };
