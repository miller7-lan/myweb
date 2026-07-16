import type { NonNullThemeKey } from '../store/useGalaxyStore';

export type GuideAction =
  | { type: 'open-project'; value: string }
  | { type: 'select-release'; value: string }
  | { type: 'select-skill'; value: string }
  | { type: 'focus-field'; value: string };

export type GuideTarget = {
  id: string;
  label: string;
  theme: NonNullThemeKey;
  keywords: string[];
  description: string;
  selector?: string;
  openAction?: GuideAction;
};

export type PetMood = 'idle' | 'curious' | 'guiding' | 'success' | 'thinking';

export type GuideMessage = {
  id: string;
  theme?: NonNullThemeKey | 'HOME';
  mood: PetMood;
  text: string;
};

export const guideTargets: GuideTarget[] = [
  {
    id: 'theme-identity',
    label: '身份主页',
    theme: 'identity',
    keywords: ['身份', '关于', '介绍', '你是谁', '个人', 'profile', 'identity'],
    description: '这里是 Dazzle 的身份、工程习惯和近期成长。',
  },
  {
    id: 'identity-profile',
    label: '工程师简介',
    theme: 'identity',
    keywords: ['简介', '工程师', '全栈', 'ai 工具', '产品体验', '自动化'],
    description: '这块说明站主的核心角色和做事方式。',
  },
  {
    id: 'identity-modules',
    label: '身份模块',
    theme: 'identity',
    keywords: ['身份模块', '角色卡', '身份卡', '固定身份', '脑机', '超频'],
    description: '这里可以切换不同身份角色，还藏着一个交互核心。',
  },
  {
    id: 'identity-overclock',
    label: '脑机超频核心',
    theme: 'identity',
    keywords: ['脑机', '超频', 'core', 'cpu', 'telemetry', '互动'],
    description: '这是身份页里最像控制台的小交互。',
  },
  {
    id: 'identity-growth',
    label: '成长与证书',
    theme: 'identity',
    keywords: ['证书', '获奖', '成长', '比赛', '二等奖', '计算机设计大赛'],
    description: '这里记录了最近的比赛成果，也能打开证书预览。',
  },
  {
    id: 'identity-missions',
    label: '当前任务',
    theme: 'identity',
    keywords: ['当前任务', 'mission', '目标', '计划'],
    description: '这里说明接下来正在持续推进的方向。',
  },
  {
    id: 'theme-creations',
    label: '作品档案',
    theme: 'creations',
    keywords: ['作品', '项目', 'creations', 'archive', '案例', '看作品'],
    description: '作品页展示项目能力、设计取舍和技术栈。',
  },
  {
    id: 'creations-search',
    label: '作品搜索',
    theme: 'creations',
    keywords: ['搜索项目', '筛选项目', '找项目', '项目搜索'],
    description: '可以按项目、技术栈或关键词过滤作品档案。',
  },
  {
    id: 'project-profit',
    label: '利润助手项目',
    theme: 'creations',
    keywords: ['利润助手', '记账', 'sqlite', 'android', '桌面', '家庭利润'],
    description: '利润助手是本地家庭利润记账项目，支持桌面与 Android。',
    openAction: { type: 'open-project', value: '利润助手' },
  },
  {
    id: 'project-secretary',
    label: 'Dazzle Secretary Pro',
    theme: 'creations',
    keywords: ['secretary', '团支书', '名单', 'ocr', '完成率', '提醒'],
    description: '名单核查、OCR 识别和提醒话术生成工具。',
    openAction: { type: 'open-project', value: 'Dazzle Secretary Pro' },
  },
  {
    id: 'project-vision',
    label: '视觉识别系统 3.0',
    theme: 'creations',
    keywords: ['视觉识别', 'k210', 'canmv', 'yolo', '视障', '老年'],
    description: '获奖的胸挂式智能设备视觉识别项目。',
    openAction: { type: 'open-project', value: '视觉识别系统 3.0' },
  },
  {
    id: 'project-tunnel',
    label: '内网穿透控制台项目',
    theme: 'creations',
    keywords: ['内网穿透', '公网', 'tunnel', 'cloudflare tunnel', 'pinggy'],
    description: '把本地端口公网映射做成可保存、可复用的控制台。',
    openAction: { type: 'open-project', value: '内网穿透控制台' },
  },
  {
    id: 'project-monitor',
    label: '本机检测项目',
    theme: 'creations',
    keywords: ['本机检测', '系统监测', 'cpu', '内存', '代理出口'],
    description: 'macOS 原生悬浮系统监测工具。',
    openAction: { type: 'open-project', value: '本机检测' },
  },
  {
    id: 'project-mailweek',
    label: 'Mailweek 项目',
    theme: 'creations',
    keywords: ['mailweek', '邮件', '周报', 'imap', 'ollama', '只读', 'p0', '邮件 agent'],
    description: '本地只读的 Ollama 邮件审查 Agent，把一周邮件整理成优先级登记簿。',
    openAction: { type: 'open-project', value: 'Mailweek' },
  },
  {
    id: 'project-detail',
    label: '项目详情弹窗',
    theme: 'creations',
    keywords: ['项目详情', '需求', '解决问题', '关键设计', '技术栈'],
    description: '打开项目卡后，这里会展示需求、问题、设计和亮点。',
  },
  {
    id: 'theme-stack',
    label: '技术栈星图',
    theme: 'stack',
    keywords: ['技术栈', '技能', 'stack', '星图', '技能星图'],
    description: '技术栈以可拖拽缩放的星图呈现。',
  },
  {
    id: 'stack-map',
    label: '技能星图',
    theme: 'stack',
    keywords: ['星图', '拖拽', '缩放', '技能节点', 'constellation'],
    description: '拖动和缩放可以探索所有技能节点。',
  },
  {
    id: 'skill-python',
    label: 'Python 技能节点',
    theme: 'stack',
    keywords: ['python', '数据', '脚本', 'fastapi', 'pandas'],
    description: 'Python 是贯穿多个工具项目的主力工程语言。',
    openAction: { type: 'select-skill', value: 'python' },
  },
  {
    id: 'skill-typescript',
    label: 'TypeScript / JavaScript 节点',
    theme: 'stack',
    keywords: ['typescript', 'javascript', 'react', 'vue', '前端'],
    description: '这里说明网页交互和控制台前端能力。',
    openAction: { type: 'select-skill', value: 'typescript' },
  },
  {
    id: 'skill-ocr',
    label: 'OCR 技能节点',
    theme: 'stack',
    keywords: ['ocr', 'paddleocr', 'tesseract', '识别', '名单'],
    description: 'OCR 能力连接了截图、名单核查和文本结构化。',
    openAction: { type: 'select-skill', value: 'ocr' },
  },
  {
    id: 'theme-orbit',
    label: '软件发行',
    theme: 'orbit',
    keywords: ['发行', '下载', '软件', 'orbit', 'release', '找下载'],
    description: '这里提供本机应用、发行包与源码入口。',
  },
  {
    id: 'orbit-search',
    label: '发行搜索',
    theme: 'orbit',
    keywords: ['搜索软件', '搜索下载', '筛选发行', '找 apk', '找 dmg'],
    description: '可以按软件名、平台或关键词过滤发行节点。',
  },
  {
    id: 'release-profit',
    label: '利润助手下载',
    theme: 'orbit',
    keywords: ['下载利润助手', '利润助手下载', 'android apk', '安卓 apk', 'apk', '记账下载'],
    description: '这里能下载利润助手 macOS 包和 Android APK。',
    openAction: { type: 'select-release', value: 'profit' },
  },
  {
    id: 'release-secretary',
    label: 'Dazzle Secretary 下载',
    theme: 'orbit',
    keywords: ['secretary 下载', '名单工具下载', 'ocr 工具下载', 'windows zip'],
    description: '这里提供 Secretary 的 macOS、Windows 和 Android 包。',
    openAction: { type: 'select-release', value: 'secretary' },
  },
  {
    id: 'release-mailweek',
    label: 'Mailweek 发行节点',
    theme: 'orbit',
    keywords: ['mailweek 源码', 'mailweek 下载', '邮件工具', '邮件 agent', 'ollama 邮件'],
    description: '这里介绍 Mailweek v0.3.2 的运行要求、安全边界和源码入口。',
    openAction: { type: 'select-release', value: 'mailweek' },
  },
  {
    id: 'release-download-primary',
    label: '主下载按钮',
    theme: 'orbit',
    keywords: ['下载按钮', '主下载', 'dmg', 'zip', '下载安装包'],
    description: '主下载按钮会跟随当前选中的发行节点变化。',
  },
  {
    id: 'release-checksum',
    label: 'SHA-256 校验',
    theme: 'orbit',
    keywords: ['sha', 'sha256', '校验', '哈希', '安全'],
    description: '下载后可以用这里的 SHA-256 校验文件完整性。',
  },
  {
    id: 'release-diagnostics',
    label: '发行诊断控制',
    theme: 'orbit',
    keywords: ['诊断', '扫描', 'ping', '轨道通信', '重力'],
    description: '这是发行页的轨道通信诊断和重力标定交互。',
  },
  {
    id: 'theme-signal',
    label: '联系与共创',
    theme: 'signal',
    keywords: ['联系', '留言', '邮箱', '共创', '合作', 'signal', '联系你'],
    description: '这里可以了解适合联系的事项并发送消息。',
  },
  {
    id: 'signal-open-channels',
    label: '适合联系的事情',
    theme: 'signal',
    keywords: ['适合联系', '合作', '项目', '问题', '咨询'],
    description: '这里说明哪些类型的消息最适合发来。',
  },
  {
    id: 'signal-boundaries',
    label: '联系边界',
    theme: 'signal',
    keywords: ['边界', '说明', '不适合', '提前说明'],
    description: '发送消息前可以先看这里的边界说明。',
  },
  {
    id: 'signal-contact-info',
    label: '联系响应说明',
    theme: 'signal',
    keywords: ['邮箱', '回复', '24 小时', '响应'],
    description: '这里说明表单会直达邮箱以及大致回复节奏。',
  },
  {
    id: 'contact-name',
    label: '姓名输入',
    theme: 'signal',
    keywords: ['姓名', '名字', 'name'],
    description: '从这里填写你的名字。',
    openAction: { type: 'focus-field', value: 'contact-name' },
  },
  {
    id: 'contact-email',
    label: '邮箱输入',
    theme: 'signal',
    keywords: ['邮箱', 'email', '你的邮箱'],
    description: '这里填写回复用邮箱。',
    openAction: { type: 'focus-field', value: 'contact-email' },
  },
  {
    id: 'contact-message',
    label: '消息输入',
    theme: 'signal',
    keywords: ['消息', '留言', 'message', '告诉我'],
    description: '这里写下具体想法或问题。',
    openAction: { type: 'focus-field', value: 'contact-message' },
  },
  {
    id: 'signal-submit',
    label: '发送按钮',
    theme: 'signal',
    keywords: ['发送', '提交', 'launch', 'transmission'],
    description: '填写完成后，从这里发射信号。',
  },
];

export const petPrompts: GuideMessage[] = [
  { id: 'home-1', theme: 'HOME', mood: 'curious', text: '我可以带你看作品、找下载，或者直接跳到联系表单。' },
  { id: 'identity-1', theme: 'identity', mood: 'idle', text: '这里有身份模块、获奖证书和当前任务。想看哪一块？' },
  { id: 'creations-1', theme: 'creations', mood: 'idle', text: '作品档案可以搜索，也可以让我直接打开某个项目详情。' },
  { id: 'stack-1', theme: 'stack', mood: 'idle', text: '技能星图支持拖拽和缩放，我也能帮你定位 Python、OCR、前端节点。' },
  { id: 'orbit-1', theme: 'orbit', mood: 'idle', text: '要找软件包或源码，告诉我软件名或平台，比如“Mailweek”或“安卓 APK”。' },
  { id: 'signal-1', theme: 'signal', mood: 'idle', text: '联系页在这里。需要的话我可以帮你定位到邮箱或消息输入框。' },
  { id: 'success', mood: 'success', text: '定位完成。扫描框闪过的地方就是目标区域。' },
  { id: 'fail', mood: 'curious', text: '我暂时没匹配到那个目标。可以试试“看作品”“找下载”“联系我”。' },
];
