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
  'TokenBar v0.1.0',
  'Native Codex Token Usage · macOS Menu Bar / Windows Tray',
  'TokenBar 项目',
  'TokenBar 发行节点',
  'release-assets/TokenBar_0.1.0_arm64.dmg',
  'e392aeadd4897e4f8ea90e2c7c1fe78988af393acdaf89b67e5dc2ff8bbed42d',
  'Windows x64 便携版 ZIP (77 MB)',
  'release-assets/TokenBar_0.1.0_win-x64_portable.zip',
  '2ed86f562f44d83c67f84a5cb0f924e2f3f55f0402afa5058bd0cac92ec9c004',
  'Mailweek v0.3.3',
  '本地只读邮件周报 Agent',
  'P0–P4 登记簿',
  '4B→9B 复核',
  '下载 macOS DMG',
  '全局快捷预设',
  'release-assets/Mailweek-0.3.3-macOS.dmg',
  '软件发行与 Codex Skill 分享在独立栏位中浏览',
  'SOFTWARE RELEASES',
  'SKILL SHARES',
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
