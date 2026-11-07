import test from 'node:test';
import assert from 'node:assert';
import { canModifyTarget } from '../lib/auth/roles';

test('role hierarchy matrix', async (t) => {
  const testCases = [
    { actor: 'super_admin', target: 'super_admin', allowed: true },
    { actor: 'super_admin', target: 'admin', allowed: true },
    { actor: 'admin', target: 'super_admin', allowed: false },
    { actor: 'admin', target: 'admin', allowed: false },
    { actor: 'admin', target: 'moderator', allowed: true },
    { actor: 'moderator', target: 'admin', allowed: false },
    { actor: 'moderator', target: 'moderator', allowed: false },
  ];

  for (const tc of testCases) {
    await t.test(`${tc.actor} -> ${tc.target} (allowed: ${tc.allowed})`, () => {
      assert.strictEqual(canModifyTarget(tc.actor, tc.target), tc.allowed);
    });
  }
});
