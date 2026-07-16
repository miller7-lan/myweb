import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const assetsDir = path.resolve('dist/assets');
const assetNames = await readdir(assetsDir);
const scriptNames = assetNames.filter((name) => name.endsWith('.js'));
const scripts = await Promise.all(
  scriptNames.map((name) => readFile(path.join(assetsDir, name), 'utf8')),
);
const bundle = scripts.join('\n');

const requiredContent = [
  'Mailweek v0.3.2',
  '本地只读邮件周报 Agent',
  'P0–P4 登记簿',
  '4B→9B 复核',
  'https://github.com/miller7-lan/mailweek',
];

const missing = requiredContent.filter((value) => !bundle.includes(value));
if (missing.length > 0) {
  console.error(`Portfolio bundle is missing: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Portfolio content verification passed.');
