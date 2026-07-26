const logger = require('../utils/logger');

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt'];
const DEFAULT_LANGUAGE = 'es';

// Translation strings
const translations = {
  en: {
    welcome: 'Welcome to EventConnect',
    event_created: 'Event created successfully',
    event_updated: 'Event updated successfully',
    event_deleted: 'Event deleted successfully',
    user_not_found: 'User not found',
    event_not_found: 'Event not found',
    unauthorized: 'Unauthorized access',
    validation_error: 'Validation error',
    server_error: 'Internal server error'
  },
  es: {
    welcome: 'Bienvenido a EventConnect',
    event_created: 'Evento creado exitosamente',
    event_updated: 'Evento actualizado exitosamente',
    event_deleted: 'Evento eliminado exitosamente',
    user_not_found: 'Usuario no encontrado',
    event_not_found: 'Evento no encontrado',
    unauthorized: 'Acceso no autorizado',
    validation_error: 'Error de validación',
    server_error: 'Error interno del servidor'
  },
  fr: {
    welcome: 'Bienvenue sur EventConnect',
    event_created: 'Événement créé avec succès',
    event_updated: 'Événement mis à jour avec succès',
    event_deleted: 'Événement supprimé avec succès',
    user_not_found: 'Utilisateur non trouvé',
    event_not_found: 'Événement non trouvé',
    unauthorized: 'Accès non autorisé',
    validation_error: 'Erreur de validation',
    server_error: 'Erreur interne du serveur'
  },
  de: {
    welcome: 'Willkommen bei EventConnect',
    event_created: 'Ereignis erfolgreich erstellt',
    event_updated: 'Ereignis erfolgreich aktualisiert',
    event_deleted: 'Ereignis erfolgreich gelöscht',
    user_not_found: 'Benutzer nicht gefunden',
    event_not_found: 'Ereignis nicht gefunden',
    unauthorized: 'Unbefugter Zugriff',
    validation_error: 'Validierungsfehler',
    server_error: 'Interner Serverfehler'
  },
  pt: {
    welcome: 'Bem-vindo ao EventConnect',
    event_created: 'Evento criado com sucesso',
    event_updated: 'Evento atualizado com sucesso',
    event_deleted: 'Evento excluído com sucesso',
    user_not_found: 'Usuário não encontrado',
    event_not_found: 'Evento não encontrado',
    unauthorized: 'Acesso não autorizado',
    validation_error: 'Erro de validação',
    server_error: 'Erro interno do servidor'
  }
};

// Get user's preferred language from request
function getUserLanguage(req) {
  // Priority order:
  // 1. User's saved preference (from database)
  // 2. Accept-Language header
  // 3. Query parameter
  // 4. Default language

  // From user settings
  if (req.user?.settings?.preferences?.language) {
    return req.user.settings.preferences.language;
  }

  // From query parameter
  if (req.query.lang && SUPPORTED_LANGUAGES.includes(req.query.lang)) {
    return req.query.lang;
  }

  // From Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].split('-')[0].toLowerCase())
      .filter(lang => SUPPORTED_LANGUAGES.includes(lang));

    if (languages.length > 0) {
      return languages[0];
    }
  }

  return DEFAULT_LANGUAGE;
}

// Translation function
function translate(key, language = DEFAULT_LANGUAGE) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    language = DEFAULT_LANGUAGE;
  }

  const translation = translations[language]?.[key];

  if (!translation) {
    logger.warn(`Translation missing for key: ${key} in language: ${language}`);
    return translations[DEFAULT_LANGUAGE]?.[key] || key;
  }

  return translation;
}

// Middleware to add i18n to request
function i18nMiddleware(req, res, next) {
  const language = getUserLanguage(req);

  // Add language and translation function to request
  req.language = language;
  req.t = (key, customLang = null) => translate(key, customLang || language);

  // Add language to response headers
  res.setHeader('Content-Language', language);

  next();
}

module.exports = {
  i18nMiddleware,
  translate,
  getUserLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  translations
};
