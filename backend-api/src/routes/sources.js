'use strict';

/**
 * Sources & Ingestion Pipeline Routes
 * ------------------------------------------------------------------
 * Provides REST endpoints for:
 * - Source Registry management (classification D/O/W/P, lifecycle status)
 * - "Conecta tu Agenda" for organizers (iCal, Google Cal, WordPress, OpenAgenda)
 * - "Planes entre Amigos" draft extraction & privacy-controlled publishing
 */

const express = require('express');
const router = express.Router();
const Source = require('../models/Source');
const mongoose = require('mongoose');
const User = require('../models/User');
const { sourceBlockers } = require('../services/eventIngestion/sourcePolicy');
const { sourceUrl } = require('../services/eventIngestion/safeSourceFetch');
const { protect, restrictTo } = require('../middleware/auth');
const { syncAgenda } = require('../services/eventIngestion/agendaConnector');
const { extractFriendPlanDraft, publishFriendPlan } = require('../services/eventIngestion/friendPlanDraftService');
const { seedSourceRegistry } = require('../services/eventIngestion/sourceRegistrySeeder');

// @route   GET /api/sources
// @desc    List registered event data sources
// @access  Public
router.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { classification, status, country, limit = 50 } = req.query;
    const filter = {};

    if (classification && (typeof classification !== 'string' || !['D', 'O', 'W', 'P'].includes(classification.toUpperCase()))) return res.status(400).json({ success: false, message: 'Clasificación inválida' });
    if (classification) filter.classification = classification.toUpperCase();
    if (status) filter.status = status;
    if (country && (typeof country !== 'string' || !/^[A-Za-z]{2}$/.test(country))) return res.status(400).json({ success: false, message: 'País inválido' });
    if (country) filter['coverage.country'] = country.toUpperCase();

    res.set('Cache-Control', 'private, no-store');
    const sources = await Source.find(filter)
      .sort({ classification: 1, 'metrics.totalEventsHarvested': -1 })
      .limit(Math.min(100, Math.max(1, parseInt(limit, 10) || 50)));

    return res.json({
      success: true,
      count: sources.length,
      data: sources.map(source => ({ ...source.toObject(), readiness: { ready: sourceBlockers(source).length === 0, blockers: sourceBlockers(source) } }))
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : 'No se pudo completar la operación de fuentes' });
  }
});

router.get('/my-agendas', protect, async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store');
    const filter = { status: { $in: ['approved', 'active'] } };
    if (req.user.role !== 'admin') filter.responsibleOrganizer = req.user.id;
    const sources = await Source.find(filter).sort({ name: 1 }).limit(100);
    return res.json({ success: true, data: sources.filter(source => !sourceBlockers(source).length).map(source => ({
      sourceId: source.sourceId, name: source.name, endpointUrl: source.accessConfig.endpointUrl, adapterType: source.adapterType
    })) });
  } catch { return res.status(500).json({ success: false, message: 'No se pudieron cargar tus agendas' }); }
});

// @route   POST /api/sources/seed
// @desc    Seeds default master sources (Dominican & Global)
// @access  Private (Admin) / Dev
router.post('/seed', protect, restrictTo('admin'), async (req, res) => {
  try {
    const count = await seedSourceRegistry();
    return res.json({ success: true, message: `Se registraron/actualizaron ${count} fuentes maestras.` });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : 'No se pudo completar la operación de fuentes' });
  }
});

// @route   POST /api/sources/connect-agenda
// @desc    "Conecta tu agenda" - Links organizer iCal/WordPress/OpenAgenda feed
// @access  Private / Optional in dev
router.post('/connect-agenda', protect, async (req, res) => {
  try {
    const { agendaUrl, feedType, dryRun = false } = req.body || {};
    if (!agendaUrl || typeof agendaUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'agendaUrl es requerida' });
    }

    if (typeof dryRun !== 'boolean') return res.status(400).json({ success: false, message: 'dryRun debe ser booleano' });
    const endpoint = sourceUrl(agendaUrl).href;
    const source = await Source.findOne({ 'accessConfig.endpointUrl': endpoint });
    if (!source || sourceBlockers(source).length || (req.user.role !== 'admin' && String(source.responsibleOrganizer) !== String(req.user.id))) {
      return res.status(403).json({ success: false, message: 'La agenda debe estar registrada, aprobada y vinculada a su organizador' });
    }
    const type = { ics_feed: 'ics', json_feed: 'json', wp_events_calendar: 'wp_the_events_calendar' }[source.adapterType] || source.adapterType;
    if (feedType && feedType !== type) return res.status(400).json({ success: false, message: 'El formato no coincide con la fuente aprobada' });
    const result = await syncAgenda(endpoint, source.responsibleOrganizer, { type, source, dryRun });

    return res.json({
      success: true,
      message: dryRun ? `Vista previa: ${result.previewCount} eventos válidos; no se guardó contenido.` : `Importación: ${result.created} nuevos pendientes de revisión y ${result.updated} actualizados.`,
      ...result,
      syncedCount: result.syncedCount,
      events: result.events
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : 'No se pudo completar la operación de fuentes' });
  }
});

// @route   POST /api/sources/friend-draft
// @desc    Extracts draft event attributes from informal text / flyer
// @access  Public
router.post('/friend-draft', async (req, res) => {
  try {
    const text = req.body?.text || req.body?.rawText;
    const flyerUrl = req.body?.flyerUrl;
    if (!text && !flyerUrl) {
      return res.status(400).json({ success: false, message: 'Debe proporcionar texto o enlace del anuncio' });
    }

    if (typeof text !== 'string' || !text.trim() || text.length > 10000) return res.status(400).json({ success: false, message: 'Pega entre 1 y 10.000 caracteres de texto; una imagen sola todavía no se procesa aquí' });
    const draft = extractFriendPlanDraft(text);
    if (flyerUrl) draft.flyerUrl = flyerUrl;

    return res.json({
      success: true,
      draft
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : 'No se pudo completar la operación de fuentes' });
  }
});

// @route   POST /api/sources/friend-publish
// @desc    Publishes confirmed friend plan with strict privacy settings
// @access  Private / Auth Required
router.post('/friend-publish', protect, async (req, res) => {
  try {
    const planData = req.body || {};
    if (!planData.title) {
      return res.status(400).json({ success: false, message: 'El título del plan es requerido' });
    }

    const event = await publishFriendPlan(planData, req.user.id);
    return res.status(201).json({
      success: true,
      message: event.status === 'pending_review' ? 'Plan enviado a revisión antes de publicarse' : 'Plan privado creado',
      event
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : 'No se pudo completar la operación de fuentes' });
  }
});

// @route   PATCH /api/sources/:id/status
// @desc    Transitions source lifecycle status
// @access  Private (Admin)
router.patch('/:id/status', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { status } = req.body || {};
    const valid = ['discovered', 'evaluating', 'approved', 'active', 'degraded', 'suspended', 'retired'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    const source = await Source.findOne(mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : { sourceId: req.params.id });
    if (!source) return res.status(404).json({ success: false, message: 'Fuente no encontrada' });
    if (['approved', 'active'].includes(status)) {
      const blockers = sourceBlockers({ ...source.toObject(), status });
      if (blockers.length) return res.status(409).json({ success: false, message: 'La fuente todavía no está lista', blockers });
    }
    source.status = status;
    await source.save();

    return res.json({ success: true, source });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : 'No se pudo completar la operación de fuentes' });
  }
});


// @route   POST /api/sources/propose
// @desc    An organizer proposes their own public calendar; it waits for administrator review.
const PROPOSAL_ADAPTERS = { ics: 'ics_feed', json: 'json_feed', wp_the_events_calendar: 'wp_events_calendar' };
const MAX_PENDING_PROPOSALS = 5;
router.post('/propose', protect, async (req, res) => {
  try {
    const { name, endpointUrl, country } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) return res.status(400).json({ success: false, message: 'Indica el nombre de tu agenda' });
    if (country !== undefined && (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country))) return res.status(400).json({ success: false, message: 'El país debe ser un código de dos letras' });
    const endpoint = sourceUrl(endpointUrl);
    const openAgenda = /^https:\/\/api\.openagenda\.com\/v2\/agendas\/\d+\/?$/.test(endpoint.href);
    const adapterType = openAgenda ? 'openagenda' : PROPOSAL_ADAPTERS[require('../services/eventIngestion/agendaConnector').detectAgendaType(endpoint.href)];
    if (!adapterType) return res.status(400).json({ success: false, message: 'Usa el enlace iCalendar (.ics), JSON o WordPress The Events Calendar de tu agenda' });
    const owner = req.user.id;
    if (await Source.countDocuments({ responsibleOrganizer: owner, status: 'evaluating' }) >= MAX_PENDING_PROPOSALS) {
      return res.status(429).json({ success: false, message: 'Ya tienes agendas pendientes de revisión. Espera la respuesta antes de proponer más.' });
    }
    if (await Source.exists({ 'accessConfig.endpointUrl': endpoint.href })) return res.status(409).json({ success: false, message: 'Esa agenda ya está registrada' });
    const sourceId = 'org-' + require('crypto').createHash('sha256').update(owner + endpoint.href).digest('hex').slice(0, 20);
    const source = await Source.create({ sourceId, name: name.trim(), domain: endpoint.hostname, adapterType, classification: 'O', status: 'evaluating',
      accessConfig: { endpointUrl: endpoint.href }, responsibleOrganizer: owner, coverage: { country: country || undefined }, syncSchedule: { frequencyHours: 24 },
      license: { licenseType: 'Agenda propia del organizador', commercialAllowed: false, displayAllowed: false, attributionRequired: false } });
    return res.status(201).json({ success: true, message: 'Recibimos tu agenda. Te avisaremos cuando un administrador la apruebe.',
      source: { sourceId: source.sourceId, name: source.name, adapterType, status: source.status } });
  } catch (err) {
    return res.status(err.code === 11000 ? 409 : 400).json({ success: false, message: err.message && /pública|HTTPS|URL|dirección/i.test(err.message) ? err.message : 'No se pudo registrar la agenda; comprueba el enlace' });
  }
});

router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { sourceId, name, endpointUrl, adapterType, classification = 'W', country, frequencyHours = 24 } = req.body || {};
    if (typeof sourceId !== 'string' || !/^[a-z0-9-]{3,80}$/.test(sourceId) || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Indica identificador y nombre válidos' });
    }
    if (!Number.isInteger(frequencyHours) || frequencyHours < 1 || frequencyHours > 168 || (country && (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)))) return res.status(400).json({ success: false, message: 'Revisa el país y la frecuencia' });
    const endpoint = sourceUrl(endpointUrl);
    const source = await Source.create({ sourceId, name: name.trim(), domain: endpoint.hostname,
      adapterType, classification, status: 'evaluating', accessConfig: { endpointUrl: endpoint.href },
      responsibleOrganizer: req.user.id, coverage: { country: country || undefined }, syncSchedule: { frequencyHours } });
    return res.status(201).json({ success: true, source });
  } catch (err) {
    return res.status(err.code === 11000 ? 409 : 400).json({ success: false, message: 'No se pudo registrar la fuente; comprueba sus datos' });
  }
});

router.patch('/:id/config', protect, restrictTo('admin'), async (req, res) => {
  try {
    const source = await Source.findOne(mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : { sourceId: req.params.id });
    if (!source) return res.status(404).json({ success: false, message: 'Fuente no encontrada' });
    const { name, endpointUrl, adapterType, classification, country, frequencyHours = 24 } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.length > 120 || !['D','O','W','P'].includes(classification) || !Number.isInteger(frequencyHours) || frequencyHours < 1 || frequencyHours > 168 || (country && !/^[A-Z]{2}$/.test(country))) return res.status(400).json({ success: false, message: 'Revisa nombre, clasificación, país y frecuencia' });
    source.name = name.trim(); source.accessConfig.endpointUrl = sourceUrl(endpointUrl).href;
    source.domain = new URL(source.accessConfig.endpointUrl).hostname;
    source.adapterType = adapterType; source.classification = classification;
    source.coverage.country = country || undefined;
    source.syncSchedule.frequencyHours = frequencyHours;
    source.status = 'evaluating'; source.license.commercialAllowed = false; source.license.displayAllowed = false;
    source.license.reviewedAt = undefined; source.license.reviewedBy = undefined;
    await source.save();
    return res.json({ success: true, source });
  } catch { return res.status(400).json({ success: false, message: 'No se pudo guardar la configuración' }); }
});

router.patch('/:id/review', protect, restrictTo('admin'), async (req, res) => {
  try {
    const source = await Source.findOne(mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : { sourceId: req.params.id });
    if (!source) return res.status(404).json({ success: false, message: 'Fuente no encontrada' });
    const { commercialAllowed, displayAllowed, termsUrl, responsibleOrganizer = req.user.id, freeAdmissionConfirmed = false, currency, attributionRequired = false, attributionText = '', licenseType = 'Reviewed terms' } = req.body || {};
    if (typeof commercialAllowed !== 'boolean' || typeof displayAllowed !== 'boolean' || typeof freeAdmissionConfirmed !== 'boolean' || !mongoose.isValidObjectId(responsibleOrganizer)) {
      return res.status(400).json({ success: false, message: 'Confirma los permisos y el organizador responsable' });
    }
    if (typeof attributionRequired !== 'boolean' || typeof attributionText !== 'string' || attributionText.length > 500 || (attributionRequired && !attributionText.trim()) || typeof licenseType !== 'string' || !licenseType.trim() || licenseType.length > 160) return res.status(400).json({ success: false, message: 'Completa la licencia y su atribución' });
    if (currency && !require('../models/Event').schema.path('price.currency').enumValues.includes(currency)) return res.status(400).json({ success: false, message: 'Moneda no admitida' });
    if (freeAdmissionConfirmed && !currency) return res.status(400).json({ success: false, message: 'Indica la moneda del calendario gratuito' });
    const organizer = await User.findById(responsibleOrganizer).select('isActive');
    if (!organizer || organizer.isActive === false) return res.status(400).json({ success: false, message: 'Organizador no disponible' });
    source.accessConfig.termsUrl = sourceUrl(termsUrl).href;
    source.license.attributionRequired = attributionRequired;
    source.license.attributionText = attributionText.trim();
    source.license.licenseType = licenseType.trim();
    source.license.commercialAllowed = commercialAllowed;
    source.license.displayAllowed = displayAllowed;
    source.license.reviewedAt = new Date();
    source.license.reviewedBy = req.user.id;
    source.responsibleOrganizer = responsibleOrganizer;
    source.eventDefaults = { freeAdmissionConfirmed, currency };
    // A new review invalidates prior activation; an explicit transition is required.
    source.status = commercialAllowed && displayAllowed ? 'evaluating' : 'suspended';
    await source.save();
    return res.json({ success: true, source, blockers: sourceBlockers(source) });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: 'No se pudo registrar la revisión de permisos' });
  }
});

module.exports = router;
