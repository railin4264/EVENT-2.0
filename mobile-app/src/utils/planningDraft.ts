export const EVENT_CURRENCIES = ['DOP', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'HKD', 'TWD', 'SGD', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL', 'VES', 'PYG', 'BOB', 'UYU', 'CRC', 'INR', 'EGP', 'AED', 'KRW', 'AUD', 'CAD', 'NZD', 'CZK', 'SEK', 'NOK', 'DKK', 'CHF', 'PLN', 'TRY', 'ZAR'];

/** Convert explicitly selected wall time to UTC; reject missing/ambiguous DST hours. */
export function explicitEventInstant(
  date: string,
  time: string,
  timeZone: string
): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    !timeZone
  )
    throw Error('Confirma fecha, hora y zona horaria IANA.');
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    throw Error('Zona horaria inválida.');
  }
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (
    !Number.isFinite(wall) ||
    new Date(wall).toISOString().slice(0, 10) !== date
  )
    throw Error('Fecha inválida.');
  const matches: number[] = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = wall - offset * 60000,
      p = Object.fromEntries(
        formatter.formatToParts(new Date(candidate)).map(v => [v.type, v.value])
      );
    if (
      `${p.year}-${p.month}-${p.day}` === date &&
      `${p.hour}:${p.minute}` === time
    )
      matches.push(candidate);
  }
  if (matches.length !== 1)
    throw Error(
      matches.length
        ? 'Esta hora se repite por cambio de horario. Elige otra hora.'
        : 'Esta hora no existe en la zona seleccionada.'
    );
  return new Date(matches[0]).toISOString();
}
export function buildMobileEventPayload(
  data: any,
  details: {
    timeZone: string;
    latitude: string;
    longitude: string;
    city: string;
    country: string;
    currency: string;
  },
  now = Date.now()
) {
  const date = explicitEventInstant(data.date, data.time, details.timeZone);
  if (Date.parse(date) <= now || Date.parse(date) > now + 2 * 366 * 86400000)
    throw Error('Selecciona un inicio futuro dentro de los próximos dos años.');
  const lat = Number(details.latitude),
    lng = Number(details.longitude),
    amount = data.price?.trim() ? Number(data.price) : 0,
    capacity = data.capacity?.trim() ? Number(data.capacity) : 50;
  if (
    !details.latitude.trim() ||
    !details.longitude.trim() ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    throw Error(
      'Indica coordenadas reales válidas. No se inventa una ubicación.'
    );
  if (!details.city.trim() || !details.country.trim())
    throw Error('Confirma ciudad y país.');
  if (
    !EVENT_CURRENCIES.includes(details.currency) ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 1000000 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
  )
    throw Error('Confirma precio y moneda.');
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000)
    throw Error('La capacidad debe ser de 1 a 10000 personas.');
  return {
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    date,
    timeZone: details.timeZone,
    location: {
      type: 'Point',
      coordinates: [lng, lat],
      address: data.location.trim(),
      city: details.city.trim(),
      country: details.country.trim(),
    },
    price: { amount, currency: details.currency },
    maxAttendees: capacity,
    isPrivate: false,
  };
}
