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
  'Mailweek v0.3.3',
  '本地只读邮件周报 Agent',
  'P0–P4 登记簿',
  '4B→9B 复核',
  '下载 macOS DMG',
  '全局快捷预设',
  'release-assets/Mailweek-0.3.3-macOS.dmg',
];

const missing = requiredContent.filter((value) => !bundle.includes(value));
const forbiddenContent = [
  'https://github.com/miller7-lan/mailweek',
  '查看 GitHub 源码',
];
const exposed = forbiddenContent.filter((value) => bundle.includes(value));

if (missing.length > 0 || exposed.length > 0) {
  console.error(`Portfolio bundle is missing: ${missing.join(', ')}`);
  console.error(`Portfolio bundle must not expose: ${exposed.join(', ')}`);
  process.exit(1);
}

console.log('Portfolio content verification passed.');
