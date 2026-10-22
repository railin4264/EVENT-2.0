/**
 * Feature flags de la plataforma.
 *
 * PAYMENTS_ENABLED controla si la compra de entradas dentro de la app está activa.
 * - Por defecto es `true` solo si hay STRIPE_SECRET_KEY configurada.
 * - Se puede forzar con PAYMENTS_ENABLED=true|false.
 *
 * Cuando está desactivado la app funciona en modo "informativo": los eventos de pago
 * muestran su precio, permiten reservar lugar y dirigen al organizador / enlace
 * externo de boletería (ticketUrl). No se cobra nada dentro de la plataforma.
 */
function isTrue(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function paymentsEnabled() {
  const explicit = process.env.PAYMENTS_ENABLED;
  if (explicit !== undefined && explicit !== '') return isTrue(explicit) && Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getPublicConfig() {
  return {
    paymentsEnabled: paymentsEnabled(),
    mode: paymentsEnabled() ? 'marketplace' : 'informational',
    features: {
      featuredEvents: true,
      trendingEvents: true,
      activityIdeas: true,
      forYou: true,
      externalTicketing: true
    },
    promotion: {
      contact: process.env.PROMOTION_CONTACT || '',
      note: 'Destaca tu evento en el banner principal. Coordina el pago directamente con el equipo (transferencia, efectivo u otro medio local).'
    }
  };
}

module.exports = { paymentsEnabled, getPublicConfig };
