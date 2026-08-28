import {
  ArrowDownToLine,
  Bot,
  Calculator,
  ChartNoAxesColumnIncreasing,
  Cpu,
  Database,
  HardDrive,
  MailSearch,
  Monitor,
  Network,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export type ReleaseKey = 'secretary' | 'tunnel' | 'profit' | 'localMonitor' | 'mailweek' | 'multiAgentWorkspace' | 'tokenBar' | 'next';
export type DownloadableReleaseKey = Exclude<ReleaseKey, 'next'>;
export type ReleaseKind = 'software' | 'skill';

export type ReleaseDownload = {
  label: string;
  href: string;
  sha256?: string;
};

export type ReleaseScreenshot = {
  src: string;
  alt: string;
  caption: string;
};

export type ReleaseItem = {
  key: ReleaseKey;
  kind: ReleaseKind;
  title: string;
  subtitle: string;
  date: string;
  node: string;
  icon: LucideIcon;
  body: string;
  status: string;
  platform: string;
  primaryDownload?: ReleaseDownload;
  links?: ReleaseDownload[];
  specs?: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
  }>;
  screenshots?: ReleaseScreenshot[];
  scenes?: string[];
  keywords: string[];
};

export const legacyDownload = (path: string) =>
  `https://dazzle-galaxy-show.netlify.app${encodeURI(path)}`;

export const githubAsset = (path: string) =>
  `https://github.com/miller7-lan/myweb/raw/main/${encodeURI(path)}`;

export const releases: ReleaseItem[] = [
  {
    key: 'secretary',
    kind: 'software',
    title: 'Dazzle Secretary v1.0',
    subtitle: '名单核查与统计',
    date: '2026 · RELEASE',
    node: 'Node 01',
    icon: Bot,
    body: '名单核查、OCR 识别、完成率统计和提醒话术生成已进入稳定发行，可直接下载本机应用使用。',
    status: 'Stable',
    platform: 'macOS / Windows / Android',
    primaryDownload: {
      label: '下载 macOS DMG (1.1 MB)',
      href: legacyDownload('/downloads/Dazzle-Secretary-macOS.dmg'),
      sha256: '7667fcba05da7593e7b60367aaa19563e7f717457dd750828cc7aba50c6cac67',
    },
    links: [
      { label: 'Windows ZIP (124 MB)', href: legacyDownload('/downloads/DazzleSecretaryPro-Windows-解压即用.zip'), sha256: '62189fe4c7dac77410006ba4c8da3fd1bcd12f1054e76b0f9886b58a5f25a32f' },
      { label: 'macOS ZIP (592 KB)', href: legacyDownload('/downloads/Dazzle-Secretary-macOS.zip'), sha256: '62510df371c725e57ad0c18183914bb2e9ddd8cd19a6fd8926afb365efda9542' },
      { label: 'Android APK (45 MB)', href: legacyDownload('/downloads/DazzleSecretary-Android-debug.apk.1.1'), sha256: '7e8edd3ede089f0710d6c7b37d368bf130e73c1e22fab4b2d8a2018ddc862320' },
    ],
    specs: [
      { label: '内存', value: '4 GB RAM', icon: Cpu },
      { label: '磁盘空间', value: '500 MB 可用', icon: HardDrive },
      { label: '分辨率', value: '1280 × 720+', icon: Monitor },
      { label: '网络', value: '首次需联网', icon: Network },
    ],
    keywords: ['secretary', '名单', 'ocr', '统计', '提醒', 'android', 'windows', 'macos'],
  },
  {
    key: 'tunnel',
    kind: 'software',
    title: '内网穿透控制台 v1.0',
    subtitle: '本地端口公网映射',
    date: '2026 · RELEASE',
    node: 'Node 02',
    icon: Network,
    body: '已支持保存目标服务、启动隧道、复制公网地址，适合临时演示本地 Web 服务。',
    status: 'Stable',
    platform: 'macOS Only',
    primaryDownload: {
      label: '下载 macOS DMG (14 MB)',
      href: legacyDownload('/downloads/内网穿透控制台-macOS.dmg'),
      sha256: '4d3a259749dfb1965363fcc311ae821d2b2766b38ef2cc10c7533dc901839184',
    },
    links: [
      { label: 'macOS ZIP (13 MB)', href: legacyDownload('/downloads/内网穿透控制台-macOS.zip'), sha256: '497550b258034ede01606c13827b4d300b375101937085593ddb536c93387cfd' },
    ],
    scenes: [
      '快速演示：把本地 Web 服务临时公开给客户或团队。',
      '多服务商：支持 Cloudflare Tunnel、Pinggy 等一键切换。',
      '可视化控制：复制链接、断开连接、管理历史记录一目了然。',
    ],
    keywords: ['tunnel', '内网穿透', '公网', 'cloudflare', 'pinggy', 'macos', '端口'],
  },
  {
    key: 'profit',
    kind: 'software',
    title: '利润助手 v1.0',
    subtitle: '本地家庭利润记账',
    date: '2026 · RELEASE',
    node: 'Node 03',
    icon: Calculator,
    body: '围绕录入、看板、历史和设置构建的本地记账应用，数据保存在本机 SQLite 文件中，适合记录家庭利润、查看趋势和维护自定义字段。',
    status: 'Stable',
    platform: 'macOS / Android',
    primaryDownload: {
      label: '下载 macOS DMG (70 MB)',
      href: legacyDownload('/downloads/利润助手-macOS.dmg'),
      sha256: 'a5f38e7824293ff101218c6c788f91a0cf4dde534e3b2fd4526db79b36cac7e5',
    },
    links: [
      { label: 'macOS ZIP (62 MB)', href: legacyDownload('/downloads/利润助手-macOS.zip'), sha256: '43fc9b5b785bf440b6f660adb3ed900e759d04fcd841de829afa52cb32cdca90' },
      { label: 'Android APK (26 MB)', href: githubAsset('release-assets/利润助手-Android-debug.apk'), sha256: '8979e07abaf47f10ed1fe295052c1d6427c9c1d072932df7f1c8f8119d1f5c05' },
    ],
    specs: [
      { label: '数据存储', value: '本地 SQLite', icon: Database },
      { label: '磁盘空间', value: '约 200 MB 可用', icon: HardDrive },
      { label: '分辨率', value: '1280 × 720+', icon: Monitor },
      { label: '网络', value: '无需联网', icon: Network },
    ],
    scenes: [
      '本地私有：账目数据默认保存在本机，不上传云端。',
      '灵活字段：支持自定义字段和利润计算口径。',
      '趋势看板：录入、历史、统计视图围绕日常记账闭环设计。',
    ],
    keywords: ['profit', '利润助手', '记账', '家庭利润', 'sqlite', 'macos', 'android', 'apk', '本地应用'],
  },
  {
    key: 'localMonitor',
    kind: 'software',
    title: '本机检测 v1.0',
    subtitle: 'macOS 悬浮系统监测',
    date: '2026 · RELEASE',
    node: 'Node 04',
    icon: Cpu,
    body: 'SwiftUI/AppKit 原生本机状态面板，支持 CPU、内存、网络速率、热状态和代理出口 IP 的轻量检测。',
    status: 'Stable',
    platform: 'macOS App Bundle',
    primaryDownload: {
      label: '下载 macOS DMG (1.2 MB)',
      href: legacyDownload('/downloads/本机检测-macOS.dmg'),
      sha256: '1152ed0768f202bb3378c5527e8e7e728ebef69904033980de95144135fd2601',
    },
    links: [
      { label: 'macOS ZIP (1.0 MB)', href: legacyDownload('/downloads/本机检测-macOS.zip'), sha256: '9abe4ac8a59e6d015057f539ad8428b9edef3bf5bd87c131172910580f5f01a7' },
    ],
    specs: [
      { label: '系统', value: 'macOS 14+', icon: Monitor },
      { label: '架构', value: 'Apple Silicon', icon: Cpu },
      { label: '磁盘空间', value: '约 10 MB 可用', icon: HardDrive },
      { label: '网络', value: 'IP 查询需联网', icon: Network },
    ],
    scenes: [
      '悬浮观察：长时间下载、编译或运行任务时快速查看本机负载。',
      '网络判断：同时观察网络速率和代理出口 IP。',
      '轻量常驻：原生状态面板减少额外运行负担。',
    ],
    keywords: ['monitor', '本机检测', '系统监测', 'cpu', '内存', '网络', '代理', 'macos'],
  },
  {
    key: 'mailweek',
    kind: 'software',
    title: 'Mailweek v0.3.3',
    subtitle: '本地只读邮件周报 Agent',
    date: '2026.07 · RELEASE',
    node: 'Node 05',
    icon: MailSearch,
    body: '面向 macOS 终端的本地邮件审查工具。v0.3.3 重构 P0–P4 登记簿的信息层级，并加入可由 Mac 数字键 1 / 2 / 3 直接触发的全局快捷预设；只读 IMAP、4B→9B 自动复核与分类准确度门禁保持不变。',
    status: 'Stable',
    platform: 'macOS 11+ · Apple Silicon · Ollama',
    primaryDownload: {
      label: '下载 macOS DMG (19 MB)',
      href: githubAsset('release-assets/Mailweek-0.3.3-macOS.dmg'),
      sha256: '56e14d53c3debbc739e4d3689fe16e6f1f55b543488024e90fb84af3910aae73',
    },
    specs: [
      { label: '系统', value: 'macOS 11+', icon: Monitor },
      { label: '架构', value: 'Apple Silicon', icon: Cpu },
      { label: '本地模型', value: 'Ollama 4B / 9B', icon: HardDrive },
      { label: '邮箱连接', value: 'IMAP 只读', icon: Network },
    ],
    scenes: [
      '全局快捷预设：按 1 审查上一个完整自然周，按 2 审查今天，按 3 输入自定义命令或自然语言，无需回车。',
      '隐私优先：邮件正文只在本机处理，不上传云端，也不写入磁盘。',
      '行动登记：优先呈现账户安全、待回复、截止日期和正式账单，并支持按优先级或状态筛选。',
      '准确度门禁：4B 主分类与 9B 回退模型均通过 11/11 合成边界用例。',
      '安全边界：没有 SMTP、删除、移动、标记或任意 Shell 工具。',
    ],
    keywords: ['mailweek', '邮件', '周报', 'imap', 'ollama', 'qwen', 'p0', '只读', 'macos', 'cli', 'agent', '全局快捷预设', '数字键'],
  },
  {
    key: 'multiAgentWorkspace',
    kind: 'skill',
    title: 'Universal Codex Multi-Agent Workspace',
    subtitle: '项目自适应多 Agent 工作区 Skill',
    date: '2026.08 · SKILL',
    node: 'Skill 01',
    icon: Workflow,
    body: '面向任意 Git 项目的本地优先 Codex Skill：先发现仓库结构与运行时能力，再按真实架构设计一个纯编排 Orchestrator 与最小专业 Agent 团队，并生成可审计、可复用的协作工作区。',
    status: 'Verified',
    platform: 'Codex Skill · Python 3.10+ · Git',
    primaryDownload: {
      label: '下载 Codex Skill ZIP (60 KB)',
      href: githubAsset('release-assets/universal-codex-multi-agent-workspace.zip'),
      sha256: '7389f2e03b4ec4cef5e83f93eb449640330eba82b5fa739f70e535590c97247d',
    },
    specs: [
      { label: '安装位置', value: '~/.codex/skills/', icon: HardDrive },
      { label: '运行环境', value: 'Python 3.10+ / Git', icon: Cpu },
      { label: '线程后端', value: 'CodexMonitor / app-server', icon: Network },
      { label: 'Python 依赖', value: '无第三方依赖', icon: Bot },
    ],
    scenes: [
      '项目自适应：不内置固定角色，依据架构、风险、任务边界与验证需求设计最小团队。',
      '完整工作区：生成项目级 Agent 配置与分派协议，创建或复用独立 worktree，并通过 CodexMonitor 或官方 app-server 初始化线程。',
      '强制真实分派：先写任务单，再发送、等待最终 handoff 和综合验收；无可用通道时明确停止，不由 Main 越权代做。',
      '证据化校验：区分 any-delegation 与 persistent-thread，用 smoke evidence 验证 dispatch、wait、handoff 和越权边界。',
      '安全边界：保留脏工作树，不自动 commit、push 或 merge，也不覆盖非托管配置。',
      '已验证：18 项自动化测试通过，编排连通性为 PASS；模型结论正确性不在本次验证范围内。',
    ],
    keywords: ['skill', 'codex', 'multi-agent', '多 agent', 'orchestrator', 'worktree', 'codexmonitor', 'app-server', 'delegation', 'persistent-thread', '任务单', 'smoke evidence', 'git', 'python'],
  },
  {
    key: 'tokenBar',
    kind: 'software',
    title: 'TokenBar v0.1.0',
    subtitle: '原生 macOS 菜单栏 Token 统计',
    date: '2026.08 · RELEASE',
    node: 'Node 06',
    icon: ChartNoAxesColumnIncreasing,
    body: '从本机 Codex sessions 日志的实际 usage 中增量统计 Token，用中文菜单栏弹窗展示今日、当前自然周和当前自然月消耗，无需 API Key，不上传对话内容。',
    status: 'Stable',
    platform: 'macOS 13+ · Apple Silicon',
    primaryDownload: {
      label: '下载 macOS DMG (2.0 MB)',
      href: githubAsset('release-assets/TokenBar_0.1.0_arm64.dmg'),
      sha256: 'e392aeadd4897e4f8ea90e2c7c1fe78988af393acdaf89b67e5dc2ff8bbed42d',
    },
    specs: [
      { label: '系统', value: 'macOS 13+', icon: Monitor },
      { label: '架构', value: 'Apple Silicon', icon: Cpu },
      { label: '本地存储', value: 'SQLite 增量索引', icon: Database },
      { label: '网络', value: '无需联网', icon: Network },
    ],
    scenes: [
      '原始用量：直接解析 Codex 写入的 token_count，不按文字长度估算。',
      '三个周期：今日查看四项明细和模型汇总，本周使用柱形图，本月使用日历热力格。',
      '增量更新：FSEvents 监听日志追加，SQLite 检查点避免重复计数。',
      '隐私边界：只保存 Token、本地日期和模型汇总，不保存对话正文，无遥测。',
      '菜单栏常驻：不显示 Dock 图标，并默认开启登录后自动启动。',
    ],
    keywords: ['tokenbar', 'codex', 'token', '菜单栏', '用量统计', '热力图', 'sqlite', 'fsevents', 'macos', 'apple silicon', '本地隐私'],
  },
  {
    key: 'next',
    kind: 'software',
    title: '后续更新方向',
    subtitle: '维护与发行计划',
    date: 'NEXT ORBIT',
    node: 'Node 07',
    icon: ArrowDownToLine,
    body: '后续会优先补齐版本提示、自动更新体验，以及更多本地工具的发行包整理。',
    status: 'Planning',
    platform: '多工具发行',
    scenes: [
      '桌面应用自动更新与版本提示。',
      '下载入口和项目档案建立更清晰的跳转关系。',
      '继续把常用本地工具沉淀成可复用发行包。',
    ],
    keywords: ['roadmap', '更新', '计划', '自动更新', '版本', '发行包'],
  },
];

export const isReleaseKey = (value: string): value is ReleaseKey =>
  releases.some((release) => release.key === value);
