'use strict';

const axios = require('axios');
const dns = require('dns').promises;
const zlib = require('zlib');
const { fetchSource, sourceUrl } = require('../src/services/eventIngestion/safeSourceFetch');

describe('Node.js 2026 Security Advisory Application Mitigations', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CVE-2026-105482: DNS Truncation via NUL Byte', () => {
    test('rejects URLs containing raw NUL character', () => {
      expect(() => sourceUrl('https://valid.example.com\0.evil.com/events.json')).toThrow(/caracteres nulos o de control/);
    });

    test('rejects URLs containing URL-encoded NUL byte %00', () => {
      expect(() => sourceUrl('https://valid.example.com%00.evil.com/events.json')).toThrow(/caracteres nulos o de control/);
    });

    test('rejects URLs containing ASCII control characters', () => {
      expect(() => sourceUrl('https://example.com/events\r\n.json')).toThrow(/caracteres nulos o de control/);
    });
  });

  describe('CVE-2026-105483 & CVE-2026-106069: Fullwidth Unicode TLS Validation Bypass', () => {
    test('rejects hostnames containing fullwidth digits (e.g. ０-９)', () => {
      // \uff11 is fullwidth '1'
      expect(() => sourceUrl('https://\uff1192.168.1.1/events.json')).toThrow(/ancho completo/);
    });

    test('rejects hostnames containing fullwidth dots (\uff0e)', () => {
      expect(() => sourceUrl('https://example\uff0ecom/events.json')).toThrow(/ancho completo/);
    });

    test('rejects hostnames containing non-ASCII symbols or non-standard characters', () => {
      expect(() => sourceUrl('https://exa$mple.com/events.json')).toThrow(/caracteres no estándar/);
    });
  });

  describe('CVE-2026-106072: Non-canonical IPv4 Format Handling', () => {
    test('rejects octal IPv4 notations (leading zeros)', () => {
      expect(() => sourceUrl('https://0177.0.0.1/events.json')).toThrow(/no canónico/);
      expect(() => sourceUrl('https://010.0.0.1/events.json')).toThrow(/no canónico/);
    });

    test('rejects hexadecimal IP notations', () => {
      expect(() => sourceUrl('https://0x7f000001/events.json')).toThrow(/no canónico/);
    });
  });

  describe('CVE-2026-111497: Brotli Decoder RCE Protection', () => {
    test('fetchSource strictly rejects Content-Encoding: br with HTTP 415 without calling Brotli decompressor', async () => {
      jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      
      const compressedBrotli = zlib.brotliCompressSync(Buffer.from(JSON.stringify([{ title: 'Malicious Event' }])));
      jest.spyOn(axios, 'get').mockResolvedValue({
        data: compressedBrotli,
        headers: {
          'content-type': 'application/json',
          'content-encoding': 'br'
        }
      });

      await expect(fetchSource('https://agenda.example.org/events.json')).rejects.toThrow(/Codificación Brotli rechazada por política de seguridad/);
    });

    test('fetchSource safely decompresses gzip payloads', async () => {
      jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      
      const sample = [{ title: 'Gzip Valid Event', date: '2027-01-01' }];
      const compressedGzip = zlib.gzipSync(Buffer.from(JSON.stringify(sample)));
      jest.spyOn(axios, 'get').mockResolvedValue({
        data: compressedGzip,
        headers: {
          'content-type': 'application/json',
          'content-encoding': 'gzip'
        }
      });

      const res = await fetchSource('https://agenda.example.org/events.json');
      expect(res.data).toEqual(sample);
    });
  });

  describe('CVE-2026-105481: Keep-Alive Socket Desynchronization Protection', () => {
    test('fetchSource sets keepAlive: false on httpsAgent and headers.Connection to close', async () => {
      jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      
      let capturedConfig = null;
      jest.spyOn(axios, 'get').mockImplementation(async (url, config) => {
        capturedConfig = config;
        return {
          data: [{ title: 'Single Use Socket Event' }],
          headers: { 'content-type': 'application/json' }
        };
      });

      await fetchSource('https://agenda.example.org/events.json');

      expect(capturedConfig).toBeDefined();
      expect(capturedConfig.headers['Connection']).toBe('close');
      expect(capturedConfig.headers['Accept-Encoding']).toBe('gzip, deflate');
      expect(capturedConfig.headers['Accept-Encoding']).not.toContain('br');
      expect(capturedConfig.httpsAgent.keepAlive).toBe(false);
    });
  });
});
