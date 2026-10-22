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
    throw Error('La zona horaria es inválida.');
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
