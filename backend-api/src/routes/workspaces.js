const { randomUUID } = require('crypto');
const router = require('express').Router();
const Workspace = require('../models/UserWorkspace');
const { protect } = require('../middleware/auth');
const isVersion = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const kinds = ['partner-brief', 'host-readiness'];
const validData = (kind, data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Buffer.byteLength(JSON.stringify(data)) > 24000) return false;
  const text = (key, max) => typeof data[key] === 'string' && data[key].length <= max;
  if (kind === 'partner-brief') return text('objective', 800) && text('deliverables', 1200) && text('measurement', 800) && Array.isArray(data.checklist) && data.checklist.length <= 20 && data.checklist.every(v => typeof v === 'boolean') && Object.keys(data).every(k => ['objective', 'deliverables', 'measurement', 'checklist'].includes(k));
  const map = value => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length <= 10 && Object.entries(value).every(([key, answer]) => /^[a-zA-Z]{1,30}$/.test(key) && ['unknown', 'yes', 'no'].includes(answer));
  return map(data.accessibility) && map(data.welcome) && text('languages', 240) && text('localSupport', 80) && typeof data.consent === 'boolean' &&
    ['people', 'perPerson', 'reserve'].every(key => text(key, 20)) && Array.isArray(data.agenda) && data.agenda.length <= 50 &&
    data.agenda.every(row => row && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.time) && typeof row.task === 'string' && row.task.length <= 120 && typeof row.responsible === 'string' && row.responsible.length <= 80 && Object.keys(row).every(key => ['time', 'task', 'responsible'].includes(key))) &&
    Object.keys(data).every(key => ['accessibility', 'welcome', 'languages', 'localSupport', 'consent', 'agenda', 'people', 'perPerson', 'reserve'].includes(key));
};
router.use(protect);
router.use('/:kind/:key', (req, res, next) => {
  const expectedOwner = req.body?.ownerId ?? req.query.ownerId;
  if (expectedOwner !== undefined && (typeof expectedOwner !== 'string' || expectedOwner !== String(req.user._id))) return res.status(403).json({ success: false, message: 'La sesión cambió. Abre el borrador desde tu cuenta actual.' });
  if (!kinds.includes(req.params.kind) || !/^[a-zA-Z0-9:_-]{1,100}$/.test(req.params.key)) return res.status(400).json({ success: false, message: 'Espacio de trabajo inválido' });
  req.workspaceKey = `${req.params.kind}:${req.params.key}`;
  next();
});
router.get('/:kind/:key', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'private, no-store');
    const doc = await Workspace.findOne({ _id: req.user._id }, { slots: { $elemMatch: { key: req.workspaceKey } } }).lean();
    const slot = doc?.slots?.[0];
    res.json({ success: true, data: slot ? { data: slot.data, version: slot.version, updatedAt: slot.updatedAt } : { data: null, version: 0 } });
  } catch (error) { next(error); }
});
router.put('/:kind/:key', async (req, res, next) => {
  try {
    const { data, version } = req.body;
    if ((version !== 0 && !isVersion(version)) || !validData(req.params.kind, data)) return res.status(400).json({ success: false, message: 'Revisa el contenido y la versión del borrador' });
    const key = req.workspaceKey, updatedAt = new Date(), nextVersion = randomUUID();
    let saved;
    if (version !== 0) saved = await Workspace.updateOne({ _id: req.user._id, slots: { $elemMatch: { key, version } } }, { $set: { 'slots.$.data': data, 'slots.$.updatedAt': updatedAt, 'slots.$.version': nextVersion } });
    else {
      const slot = { key, data, version: nextVersion, updatedAt };
      try { await Workspace.create({ _id: req.user._id, slots: [slot] }); saved = { modifiedCount: 1 }; }
      catch (error) {
        if (error.code !== 11000) throw error;
        saved = await Workspace.updateOne({ _id: req.user._id, 'slots.key': { $ne: key }, $expr: { $lt: [{ $size: '$slots' }, 20] } }, { $push: { slots: slot } });
      }
    }
    if (!saved.modifiedCount) return res.status(409).json({ success: false, message: 'Existe una versión más reciente o alcanzaste 20 borradores. Carga el guardado o elimina uno antes de continuar.' });
    res.json({ success: true, data: { version: nextVersion, updatedAt } });
  } catch (error) { next(error); }
});
router.delete('/:kind/:key', async (req, res, next) => {
  try {
    const version = req.query.version;
    if (!isVersion(version)) return res.status(400).json({ success: false, message: 'Incluye la versión que quieres borrar' });
    const result = await Workspace.updateOne({ _id: req.user._id, slots: { $elemMatch: { key: req.workspaceKey, version } } }, { $pull: { slots: { key: req.workspaceKey, version } } });
    if (!result.modifiedCount) return res.status(409).json({ success: false, message: 'El borrador cambió. Recarga la versión guardada.' });
    res.json({ success: true });
  } catch (error) { next(error); }
});
module.exports = router;
