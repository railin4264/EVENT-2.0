import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./check-release.mjs', import.meta.url));
function check(env) { return spawnSync(process.execPath, [script], { env, encoding: 'utf8' }); }
test('missing release configuration fails closed and does not print environment secrets', () => {
  const result = check({ PRIVATE_VALUE_FOR_TEST: 'do-not-print-this' });
  assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).readyForBuildConfiguration, false); assert.ok(!result.stdout.includes('do-not-print-this'));
});
test('private API addresses fail even when HTTPS is used', () => {
  const result = check({ EXPO_PUBLIC_API_URL: 'https://192.168.1.2', EXPO_PUBLIC_WS_URL: 'wss://localhost', EXPO_PUBLIC_WEB_URL: 'https://example.invalid' });
  const report = JSON.parse(result.stdout); assert.equal(result.status, 1); assert.ok(report.problems.some(value => value.startsWith('EXPO_PUBLIC_API_URL')));
});
