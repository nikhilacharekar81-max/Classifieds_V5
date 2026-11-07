import test from 'node:test';
import assert from 'node:assert';
import { getPublicBaseUrl } from '../lib/publicUrl';

test('getPublicBaseUrl uses APP_URL', () => {
  process.env.APP_URL = 'https://chillyads.in';
  process.env.NODE_ENV = 'development';
  assert.strictEqual(getPublicBaseUrl(), 'https://chillyads.in');
});

test('getPublicBaseUrl throws on localhost in prod', () => {
  process.env.NODE_ENV = 'production';
  process.env.APP_URL = 'http://localhost:3000';
  assert.throws(() => getPublicBaseUrl(), /APP_URL/);
});
