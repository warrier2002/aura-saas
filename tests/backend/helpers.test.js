const test = require('node:test');
const assert = require('node:assert');
const { validateEmail } = require('../../backend/index.js');

test('validateEmail helper function', async (t) => {
  await t.test('accepts valid email and returns sanitized lowercased string', () => {
    const result = validateEmail('  Admin@Tenant-A.com ');
    assert.strictEqual(result, 'admin@tenant-a.com');
  });

  await t.test('throws an error for email missing @', () => {
    assert.throws(() => {
      validateEmail('invalidemail.com');
    }, /Invalid email format/);
  });

  await t.test('throws an error for email missing domain extension', () => {
    assert.throws(() => {
      validateEmail('admin@tenant');
    }, /Invalid email format/);
  });

  await t.test('throws an error for empty email', () => {
    assert.throws(() => {
      validateEmail('');
    }, /Invalid email format/);
  });
});
