'use strict';

const dns = require('dns').promises;
const net = require('net');
const https = require('https');
const tls = require('tls');
const zlib = require('zlib');
const axios = require('axios');

function sourceError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

const blocked = new net.BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 3]
]) blocked.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]]) {
  blocked.addSubnet(address, prefix, 'ipv6');
}
function publicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  // Global IPv6 unicast only; excludes IPv4-mapped, local, documentation and tunnels.
  return family === 6 && /^[23][0-9a-f]{3}:/i.test(address) && !blocked.check(address, 'ipv6');
}

function sourceUrl(value) {
  if (typeof value !== 'string') throw sourceError('La fuente necesita una URL HTTPS válida');
  // Mitigate CVE-2026-105482 (NUL byte truncation in DNS/URL)
  if (value.includes('\0') || value.includes('%00') || /[\x00-\x1f\x7f]/.test(value)) {
    throw sourceError('La URL contiene caracteres nulos o de control no permitidos (CVE-2026-105482)');
  }
  // Mitigate CVE-2026-105483 & CVE-2026-106069 (Fullwidth Unicode digit/dot evasion)
  if (/[\uff01-\uffee]/.test(value)) {
    throw sourceError('La URL contiene caracteres de ancho completo (fullwidth) no permitidos (CVE-2026-105483)');
  }
  // Mitigate CVE-2026-106072 (Non-canonical IPv4 representations: octal, hex, dword, leading zeros before URL normalization)
  if (/\/\/(?:[^/@:]*@)?(?:0x[0-9a-f]+|(?:\d+\.){0,3}0\d+)/i.test(value)) {
    throw sourceError('Formato de dirección IP no canónico o inválido (CVE-2026-106072)');
  }

  let url;
  try { url = new URL(value); } catch { throw sourceError('La fuente necesita una URL HTTPS válida'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !url.hostname || url.hostname.endsWith('.') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/i.test(url.hostname)) {
    throw sourceError('La fuente debe usar HTTPS público, sin credenciales ni puertos internos');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');

  // Mitigate CVE-2026-106072 on parsed host
  if (/^0x/i.test(host) || /(?:^|\.)0[0-7]+(?:\.|$)/.test(host)) {
    throw sourceError('Formato de dirección IP no canónico o inválido (CVE-2026-106072)');
  }
  if (/^(?:[0-9]+(?:\.|$)){1,4}/.test(host)) {
    const parts = host.split('.');
    if (parts.every(p => /^[0-9]+$/.test(p))) {
      if (parts.length !== 4 || parts.some(p => (p.length > 1 && p.startsWith('0')) || Number(p) > 255)) {
        throw sourceError('Formato de dirección IP no canónico o inválido (CVE-2026-106072)');
      }
    }
  }

  // Enforce canonical ASCII hostname characters for non-IP hosts
  if (!net.isIP(host)) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(host)) {
      throw sourceError('Nombre de host no válido o contiene caracteres no estándar (CVE-2026-105483)');
    }
  }

  if (net.isIP(host) && !publicAddress(host)) throw sourceError('La fuente debe resolver únicamente a direcciones públicas');
  url.hash = '';
  return url;
}

async function fetchSource(value, { maxBytes = 2 * 1024 * 1024 } = {}) {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 8 * 1024 * 1024) throw sourceError('Límite de descarga inválido');
  const url = sourceUrl(value);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host)
    ? [{ address: host, family: net.isIP(host) }]
    : await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) {
    throw sourceError('La fuente debe resolver únicamente a direcciones públicas');
  }

  // Mitigate CVE-2026-105481: explicitly disable socket reuse (keepAlive: false) for untrusted outbound fetching
  const agent = new https.Agent({
    keepAlive: false,
    maxSockets: 10,
    // Include the OS trust store (e.g. a managed workstation CA), preserving
    // certificate verification and Node's default trusted authorities.
    ...(tls.getCACertificates ? { ca: [...tls.getCACertificates('default'), ...tls.getCACertificates('system')] } : {}),
    lookup: (_hostname, options, callback) => {
      const family = typeof options === 'number' ? options : options?.family;
      const allowed = addresses.filter(item => !family || item.family === family);
      if (!allowed.length) return callback(sourceError('No hay una dirección pública compatible'));
      if (options?.all) return callback(null, allowed);
      callback(null, allowed[0].address, allowed[0].family);
    }
  });

  try {
    // Mitigate CVE-2026-111497: explicitly disable Brotli ('br') in Accept-Encoding and decompress safely.
    // Mitigate CVE-2026-105481: enforce 'Connection': 'close' to guarantee single-use sockets.
    const res = await axios.get(url.href, {
      httpsAgent: agent,
      proxy: false,
      maxRedirects: 0,
      timeout: 12000,
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
      decompress: false,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'EventNow-AuthorizedAgenda/1.0',
        'Accept': 'application/json, text/calendar, application/xml, text/plain;q=0.9, */*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'close'
      }
    });

    let data = res.data;
    const encoding = ((res.headers && res.headers['content-encoding']) || '').toLowerCase().trim();

    // Defend against rogue servers responding with Brotli despite not requesting it
    if (encoding === 'br' || encoding.includes('brotli')) {
      throw sourceError('Codificación Brotli rechazada por política de seguridad (CVE-2026-111497)', 415);
    }

    if (Buffer.isBuffer(data) || (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer)) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      let decompressed = buf;
      if (encoding === 'gzip') {
        decompressed = zlib.gunzipSync(buf);
      } else if (encoding === 'deflate') {
        decompressed = zlib.inflateSync(buf);
      }
      const text = decompressed.toString('utf8');
      const contentType = ((res.headers && res.headers['content-type']) || '').toLowerCase();
      if (contentType.includes('json') || /^\s*[{\[]/.test(text)) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      } else {
        data = text;
      }
    }

    res.data = data;
    return res;
  } finally {
    agent.destroy();
  }
}

module.exports = { fetchSource, publicAddress, sourceUrl, sourceError };
