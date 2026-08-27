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
  '软件与 Skill 发行',
  'Universal Codex Multi-Agent Workspace',
  '项目自适应多 Agent 工作区 Skill',
  '强制真实分派',
  '证据化校验',
  '模型结论正确性不在本次验证范围内',
  '下载 Codex Skill ZIP (60 KB)',
  'release-assets/universal-codex-multi-agent-workspace.zip',
  '7389f2e03b4ec4cef5e83f93eb449640330eba82b5fa739f70e535590c97247d',
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
