import { pbkdf2Sync, randomBytes } from 'node:crypto';

const password = process.argv[2];
const iterations = 260000;

const toBase64Url = (buffer) => buffer
  .toString('base64')
  .replaceAll('+', '-')
  .replaceAll('/', '_')
  .replaceAll('=', '');

if (!password || password.length < 12) {
  console.error('Usage: node scripts/hash-admin-password.mjs "at-least-12-character-password"');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');

console.log(`pbkdf2-sha256$${iterations}$${toBase64Url(salt)}$${toBase64Url(hash)}`);
