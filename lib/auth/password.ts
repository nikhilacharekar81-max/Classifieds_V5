import crypto from 'node:crypto';

/**
 * Secure PBKDF2 password hashing using built-in node:crypto
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  if (!combinedHash || !combinedHash.includes(':')) return false;
  const [salt, key] = combinedHash.split(':');
  if (!salt || !key) return false;

  return new Promise((resolve) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) return resolve(false);
      const keyBuffer = Buffer.from(key, 'hex');
      const derivedBuffer = derivedKey;
      if (keyBuffer.length !== derivedBuffer.length) return resolve(false);
      resolve(crypto.timingSafeEqual(keyBuffer, derivedBuffer));
    });
  });
}
