'use strict';

const dns = require('dns').promises;
const net = require('net');
const https = require('https');
const tls = require('tls');
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
  let url;
  try { url = new URL(value); } catch { throw sourceError('La fuente necesita una URL HTTPS válida'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !url.hostname || url.hostname.endsWith('.') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/i.test(url.hostname)) {
    throw sourceError('La fuente debe usar HTTPS público, sin credenciales ni puertos internos');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
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
  // Pin the validated resolution for the request, including dual-stack lookups.
  const agent = new https.Agent({
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
    return await axios.get(url.href, {
      httpsAgent: agent, proxy: false, maxRedirects: 0,
      timeout: 12000, maxContentLength: maxBytes, maxBodyLength: maxBytes,
      headers: { 'User-Agent': 'EventNow-AuthorizedAgenda/1.0' }
    });
  } finally { agent.destroy(); }
}

module.exports = { fetchSource, publicAddress, sourceUrl, sourceError };
