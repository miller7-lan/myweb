import { pbkdf2Sync, randomBytes } from 'node:crypto';

const args = process.argv.slice(2);
const readFromStdin = args.includes('--stdin');
const allowShortPassword = args.includes('--allow-short');
const passwordArg = args.find((arg) => !arg.startsWith('--'));
const password = readFromStdin ? await readStdin() : passwordArg;
const iterations = 260000;

const toBase64Url = (buffer) => buffer
  .toString('base64')
  .replaceAll('+', '-')
  .replaceAll('/', '_')
  .replaceAll('=', '');

if (!password || password.length < 12) {
  if (!allowShortPassword) {
    console.error('Usage: node scripts/hash-admin-password.mjs [--stdin] [--allow-short] "at-least-12-character-password"');
    process.exit(1);
  }
  console.warn('Warning: password is shorter than 12 characters. Use only when the password was explicitly chosen.');
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => resolve(input.replace(/\r?\n$/, '')));
    process.stdin.on('error', reject);
    process.stdin.resume();
  });
}

if (!password) {
  console.error('Password is required.');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');

console.log(`pbkdf2-sha256$${iterations}$${toBase64Url(salt)}$${toBase64Url(hash)}`);
