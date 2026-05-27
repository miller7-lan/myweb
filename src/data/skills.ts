export type SkillStatus = "learned" | "learning" | "locked";
export type NodeType = "core" | "branch" | "skill";

export type SkillNode = {
  id: string;
  name: string;
  zhName: string;
  type: NodeType;
  status: SkillStatus;
  description: string;
  practice?: string[];
  relatedProjects?: string[];
  nextSteps?: string[];
  summary?: string;
  x: number;
  y: number;
  links: string[];
};

// Skill constellation layout guide:
// - The core stays at (0, 0); the six branch nodes sit on a true hexagon around it.
// - Learned skills are placed farther outside their branch and may form short solid chains.
// - Learning skills also stay outside the black circle, but their dashed guide line stops
//   before the node. The visual intent is "from outer learning point inward toward the
//   branch intersection", not "from the branch outward through the point".
// - Avoid cross-branch links. Shared technologies should be repeated in text/project chips,
//   or duplicated as separate ids only when the visual design really needs it.
export const skillsData: SkillNode[] = [
  {
    id: "core",
    name: "Project Stack Core",
    zhName: "项目能力核心",
    type: "core",
    status: "learned",
    description: "围绕个人项目沉淀出的工程能力：把 AI、桌面工具、数据面板和本地自动化做成可运行、可交付的系统。",
    x: 0,
    y: 0,
    links: ["branch-lang", "branch-ai", "branch-desktop", "branch-backend", "branch-frontend", "branch-devtools"]
  },

  {
    id: "branch-lang",
    name: "Languages",
    zhName: "语言底座",
    type: "branch",
    status: "learned",
    description: "项目实现使用最频繁的语言组合。",
    summary: "Python 是主力生产语言，Swift / C# 用于原生桌面工具，JavaScript / TypeScript / Vue / React 承接网页与控制台界面。",
    relatedProjects: ["视觉识别系统 3.0", "Dazzle Secretary Pro", "利润助手", "防待机工具集", "代理路线控制台", "内网穿透控制台"],
    nextSteps: ["把 TypeScript 严格模式贯穿到更多前端工具", "为 Swift 桌面工具沉淀可复用模块", "补齐 Rust / C++ 在性能工具中的实战入口"],
    x: -75,
    y: -130,
    links: ["python", "typescript", "swift", "csharp"]
  },
  {
    id: "python",
    name: "Python",
    zhName: "Python 主力工程",
    type: "skill",
    status: "learned",
    description: "贯穿 AI 原型、OCR 处理、桌面壳、后端服务、数据分析和本地工具的主力语言。",
    practice: ["用 Python 串起 K210 训练/转换、OCR 解析、Streamlit 工具、FastAPI 服务和本地 SQLite 数据。", "把一次性的脚本需求沉淀为可复用的桌面或网页工具。"],
    relatedProjects: ["视觉识别系统 3.0", "Dazzle Secretary Pro", "利润助手", "Tokens Monitor", "DevEnv Master", "内网穿透控制台"],
    nextSteps: ["强化异步任务、后台进程和日志体系", "整理通用 CLI / 配置 / 本地数据目录模板"],
    x: -150,
    y: -250,
    links: ["pandas"]
  },
  {
    id: "typescript",
    name: "TypeScript / JavaScript",
    zhName: "Web 交互语言",
    type: "skill",
    status: "learning",
    description: "用于构建个人作品集、前端控制台、状态驱动 UI 和浏览器端可视化。",
    practice: ["用 React、Zustand、Three.js 和 Tailwind 构建 Galaxy 作品集。", "用 Vue 3 和 Element Plus 构建桌面控制台前端。"],
    relatedProjects: ["Galaxy 个人作品集", "内网穿透控制台"],
    nextSteps: ["补齐复杂表单、数据缓存和前端测试", "把项目数据抽成更稳定的 typed schema"],
    x: -265,
    y: -250,
    links: []
  },
  {
    id: "swift",
    name: "Swift / AppKit",
    zhName: "macOS 原生开发",
    type: "skill",
    status: "learning",
    description: "面向 macOS 菜单栏、窗口、系统命令、网络测速和钥匙串的原生工具开发能力。",
    practice: ["用 AppKit 构建代理路线控制台，并接入 URLSession、Keychain 和下载命令生成。", "用 caffeinate 封装 macOS 防待机工具。"],
    relatedProjects: ["代理路线控制台", "防待机工具集"],
    nextSteps: ["抽象状态管理和系统权限提示", "完善签名、公证和自动更新流程"],
    x: -95,
    y: -315,
    links: []
  },
  {
    id: "csharp",
    name: "C# / .NET",
    zhName: "Windows 桌面开发",
    type: "skill",
    status: "learning",
    description: "用于 Windows 托盘应用、系统 API 调用和长时任务守护类工具。",
    practice: ["通过 WPF 与 Win32 API 实现 Windows 版防待机工具。", "把倒计时、托盘常驻和安全退出收束成明确状态机。"],
    relatedProjects: ["防待机工具集"],
    nextSteps: ["补齐安装包、开机启动和崩溃日志", "沉淀跨平台桌面工具发布清单"],
    x: -215,
    y: -305,
    links: []
  },
  {
    id: "pandas",
    name: "pandas",
    zhName: "数据清洗与表格处理",
    type: "skill",
    status: "learned",
    description: "处理名单、账目、统计结果和报表数据的轻量数据层。",
    practice: ["在名单核查、利润统计和 OCR 结果整理中完成清洗、聚合和导出。"],
    relatedProjects: ["Dazzle Secretary Pro", "利润助手"],
    nextSteps: ["补齐异常数据审计和可回放处理日志"],
    x: -230,
    y: -320,
    links: []
  },

  {
    id: "branch-ai",
    name: "AI & Vision",
    zhName: "AI 视觉与文本理解",
    type: "branch",
    status: "learned",
    description: "从边缘视觉到 OCR 与本地 LLM 的项目能力。",
    summary: "已覆盖 K210 端侧目标检测、OCR 文本识别、Ollama 本地解析和 AI 路由建议，重点是把模型能力接进真实工作流。",
    relatedProjects: ["视觉识别系统 3.0", "Dazzle Secretary Pro", "代理路线控制台"],
    nextSteps: ["做模型评估面板", "打通 ONNX / TFLite / kmodel 的转换记录", "把 OCR 纠错沉淀成可复用模块"],
    x: 75,
    y: -130,
    links: ["yolo-k210", "ocr", "local-llm", "gemini-api"]
  },
  {
    id: "yolo-k210",
    name: "YOLO2 Tiny / K210",
    zhName: "边缘目标检测",
    type: "skill",
    status: "learned",
    description: "面向 K210 / CanMV 的轻量目标检测链路，强调训练、转换、部署和设备端复现。",
    practice: ["将单类 obstacle 任务拆成标注、训练、kmodel 转换和设备脚本。", "为雷达距离融合和语音播报预留后续接口。"],
    relatedProjects: ["视觉识别系统 3.0"],
    nextSteps: ["记录量化参数对识别效果的影响", "补齐端侧帧率和误检率评估"],
    x: 155,
    y: -245,
    links: ["canmv"]
  },
  {
    id: "canmv",
    name: "CanMV",
    zhName: "端侧设备脚本",
    type: "skill",
    status: "learned",
    description: "在边缘硬件上加载模型、读取摄像头并执行设备端推理逻辑。",
    practice: ["把训练产物落到 K210 设备脚本，形成可演示闭环。"],
    relatedProjects: ["视觉识别系统 3.0"],
    nextSteps: ["加入传感器融合与播报模块", "整理设备端故障排查文档"],
    x: 230,
    y: -310,
    links: []
  },
  {
    id: "ocr",
    name: "PaddleOCR / Tesseract",
    zhName: "OCR 识别",
    type: "skill",
    status: "learned",
    description: "把截图、群接龙和粘贴文本转换成可核对的结构化名单。",
    practice: ["用 OCR 兜底低质量输入，并对疑似错字姓名做模糊修正。", "把识别结果直接接入完成率统计和提醒话术生成。"],
    relatedProjects: ["Dazzle Secretary Pro"],
    nextSteps: ["沉淀姓名纠错词典", "加入 OCR 置信度和人工复核标记"],
    x: 210,
    y: -155,
    links: []
  },
  {
    id: "local-llm",
    name: "Ollama",
    zhName: "本地 LLM 解析",
    type: "skill",
    status: "learning",
    description: "用本地大语言模型解析不规整文本，减少人工整理成本。",
    practice: ["在名单核查中处理群接龙、OCR 文本和粘贴内容的语义解析。"],
    relatedProjects: ["Dazzle Secretary Pro"],
    nextSteps: ["加入提示词版本管理", "记录不同模型的解析准确率"],
    x: 105,
    y: -310,
    links: []
  },
  {
    id: "gemini-api",
    name: "Gemini API",
    zhName: "AI 路由建议",
    type: "skill",
    status: "learning",
    description: "把测速、代理端口和目标域名输入 AI Advisor，生成可执行的下载路线建议。",
    practice: ["结合本地规则，给出直连、代理或换节点的判断，并生成 curl / aria2c 命令。"],
    relatedProjects: ["代理路线控制台"],
    nextSteps: ["提供离线规则降级路径", "把建议结果转成可审计的决策日志"],
    x: 245,
    y: -250,
    links: []
  },

  {
    id: "branch-desktop",
    name: "Desktop Apps",
    zhName: "桌面应用",
    type: "branch",
    status: "learned",
    description: "把工具做成普通用户能启动、能配置、能长期使用的桌面软件。",
    summary: "覆盖 PySide6 / PyQt6 / pywebview / Swift AppKit / WPF，多数项目都围绕本地数据、系统能力和低摩擦启动体验展开。",
    relatedProjects: ["利润助手", "爬虫小程序", "内网穿透控制台", "代理路线控制台", "防待机工具集"],
    nextSteps: ["统一本地配置、日志和自动更新策略", "完善多平台打包与发布体验"],
    x: 150,
    y: 0,
    links: ["pyside", "pyqt", "pywebview", "native-system"]
  },
  {
    id: "pyside",
    name: "PySide6 / Qt",
    zhName: "Qt 桌面应用",
    type: "skill",
    status: "learned",
    description: "用于构建本地数据录入、历史查询、图表看板和设置界面。",
    practice: ["在利润助手中用 EventBus 联动录入、历史、看板和设置。", "通过 PyInstaller 打包为可分发桌面应用。"],
    relatedProjects: ["利润助手"],
    nextSteps: ["提炼通用桌面应用骨架", "增强表单校验与快捷键体验"],
    x: 275,
    y: -55,
    links: ["pyinstaller"]
  },
  {
    id: "pyqt",
    name: "PyQt6",
    zhName: "请求调试 GUI",
    type: "skill",
    status: "learned",
    description: "用 Qt Designer UI 与 requests 组合出轻量接口请求工具。",
    practice: ["支持 GET / POST、JSON 参数、响应预览和错误反馈。"],
    relatedProjects: ["爬虫小程序"],
    nextSteps: ["加入请求历史和 header 编辑", "支持导入 curl 命令"],
    x: 285,
    y: 55,
    links: []
  },
  {
    id: "pywebview",
    name: "pywebview",
    zhName: "Web 桌面壳",
    type: "skill",
    status: "learning",
    description: "把 Vue 前端打包进 Python 桌面壳，兼顾 Web 开发效率和桌面入口。",
    practice: ["内置静态服务器托管 SPA，并把目标配置写入用户目录。"],
    relatedProjects: ["内网穿透控制台"],
    nextSteps: ["强化前后端 IPC 协议", "完善窗口生命周期和错误提示"],
    x: 335,
    y: 135,
    links: []
  },
  {
    id: "native-system",
    name: "System APIs",
    zhName: "系统能力调用",
    type: "skill",
    status: "learning",
    description: "调用系统级能力完成防睡眠、端口探测、钥匙串保存和本机代理检测。",
    practice: ["使用 caffeinate、Win32 API、Keychain、URLSession 等原生能力。"],
    relatedProjects: ["防待机工具集", "代理路线控制台"],
    nextSteps: ["建立权限申请与失败恢复规范", "为敏感操作增加更清晰的确认流程"],
    x: 330,
    y: -115,
    links: []
  },
  {
    id: "pyinstaller",
    name: "PyInstaller",
    zhName: "Python 桌面打包",
    type: "skill",
    status: "learned",
    description: "把 Python 工具打包成独立应用，降低运行环境门槛。",
    practice: ["用于利润助手和内网穿透控制台的桌面分发。"],
    relatedProjects: ["利润助手", "内网穿透控制台"],
    nextSteps: ["优化体积、启动速度和签名流程"],
    x: 365,
    y: -60,
    links: []
  },

  {
    id: "branch-backend",
    name: "Backend & Data",
    zhName: "后端与数据",
    type: "branch",
    status: "learned",
    description: "本地服务、实时推送、数据库和可观察数据面板。",
    summary: "以 FastAPI / SQLite / SQLAlchemy / WebSocket 为主，服务于 Tokens Monitor、视觉识别接口和本地工具的数据持久化。",
    relatedProjects: ["Tokens Monitor", "视觉识别系统 3.0", "利润助手"],
    nextSteps: ["统一 API 错误模型", "完善迁移和数据备份", "补齐端到端测试"],
    x: -150,
    y: 0,
    links: ["fastapi", "sqlite", "websocket"]
  },
  {
    id: "fastapi",
    name: "FastAPI",
    zhName: "Python API 服务",
    type: "skill",
    status: "learned",
    description: "用于本地服务、模型接口、Dashboard 后端和工具 API。",
    practice: ["在 Tokens Monitor 中拆分 dashboard、logs、websocket 路由。", "在视觉识别系统中为后续接口集成预留 API 能力。"],
    relatedProjects: ["Tokens Monitor", "视觉识别系统 3.0"],
    nextSteps: ["沉淀统一依赖注入和配置加载方式", "加入 OpenAPI 文档和接口测试"],
    x: -285,
    y: -60,
    links: []
  },
  {
    id: "sqlite",
    name: "SQLite",
    zhName: "本地数据库",
    type: "skill",
    status: "learned",
    description: "适合个人工具和本地应用的轻量持久化方案。",
    practice: ["利润助手将账目保存在本机 SQLite 文件。", "Tokens Monitor 自动创建本地数据库并写入 token 消耗日志。"],
    relatedProjects: ["利润助手", "Tokens Monitor"],
    nextSteps: ["完善 schema migration", "增加导入导出和自动备份"],
    x: -285,
    y: 60,
    links: ["sqlalchemy"]
  },
  {
    id: "websocket",
    name: "WebSocket",
    zhName: "实时推送",
    type: "skill",
    status: "learning",
    description: "把 token 消耗与事件状态实时推送到本地仪表盘。",
    practice: ["让 Tokens Monitor Dashboard 不依赖手动刷新即可看到实时变化。"],
    relatedProjects: ["Tokens Monitor"],
    nextSteps: ["加入断线重连和事件回放", "提供更稳定的消息协议"],
    x: -335,
    y: 130,
    links: []
  },
  {
    id: "sqlalchemy",
    name: "SQLAlchemy",
    zhName: "ORM 与数据模型",
    type: "skill",
    status: "learning",
    description: "用于把本地数据库操作组织成更清晰的数据模型和查询层。",
    practice: ["在 Tokens Monitor 中管理 token 日志、事件和 Dashboard 数据。"],
    relatedProjects: ["Tokens Monitor"],
    nextSteps: ["补齐事务边界和查询性能分析"],
    x: -380,
    y: 160,
    links: []
  },

  {
    id: "branch-frontend",
    name: "Frontend & 3D",
    zhName: "前端与 3D 可视化",
    type: "branch",
    status: "learning",
    description: "作品集和控制台界面的视觉、状态和交互层。",
    summary: "以 React / Three.js / Tailwind 打造沉浸式个人网站，以 Vue 3 / Element Plus 构建工具控制台。",
    relatedProjects: ["Galaxy 个人作品集", "内网穿透控制台"],
    nextSteps: ["做移动端交互细节和性能预算", "补齐 Playwright 视觉回归", "把内容数据进一步模块化"],
    x: 75,
    y: 130,
    links: ["html", "react", "vue"]
  },
  {
    id: "html",
    name: "HTML",
    zhName: "语义化结构",
    type: "skill",
    status: "learned",
    description: "网页内容结构、表单语义、可访问性入口和 SEO 基础。",
    practice: ["在个人作品集和联系表单中组织清晰的页面结构、label、按钮语义与隐藏字段。", "为作品展示、软件发行和联系模块建立可读的内容层级。"],
    relatedProjects: ["Galaxy 个人作品集", "内网穿透控制台"],
    nextSteps: ["继续补齐 aria 状态与键盘导航细节", "为复杂交互组件整理语义规范"],
    x: 120,
    y: 260,
    links: ["css"]
  },
  {
    id: "css",
    name: "CSS",
    zhName: "布局与视觉系统",
    type: "skill",
    status: "learned",
    description: "负责响应式布局、视觉层次、动效节奏和 HUD 风格落地。",
    practice: ["用 Grid / Flex 组织作品页、技术栈星图、联系页和软件发行页布局。", "实现低亮度 HUD、公告弹层、扫描卡片和多端适配。"],
    relatedProjects: ["Galaxy 个人作品集", "内网穿透控制台"],
    nextSteps: ["减少重复样式并沉淀页面布局模板", "继续优化移动端文字换行与触控间距"],
    x: 180,
    y: 320,
    links: ["tailwind"]
  },
  {
    id: "react",
    name: "React",
    zhName: "React 组件系统",
    type: "skill",
    status: "learning",
    description: "用于组织作品集的主题面板、交互状态和可复用 UI。",
    practice: ["将身份、作品、技术栈、软件发行和联系入口拆成可探索模块。"],
    relatedProjects: ["Galaxy 个人作品集"],
    nextSteps: ["为核心组件补充测试", "优化复杂动效下的状态更新"],
    x: 40,
    y: 285,
    links: ["threejs"]
  },
  {
    id: "threejs",
    name: "Three.js / R3F",
    zhName: "3D 星系场景",
    type: "skill",
    status: "learning",
    description: "用 WebGL、粒子、轨道和主题星球构建作品集的主视觉导航。",
    practice: ["实现银河导航、粒子星环、主题星球和技能星图的沉浸式视觉语言。"],
    relatedProjects: ["Galaxy 个人作品集"],
    nextSteps: ["继续优化低性能设备降级", "补充 shader 参数文档"],
    x: 105,
    y: 360,
    links: []
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    zhName: "HUD 样式系统",
    type: "skill",
    status: "learning",
    description: "支撑作品集的低亮度 HUD、响应式面板、芯片和控制台质感。",
    practice: ["通过 Tailwind 快速组织主题色、布局、状态和微交互。"],
    relatedProjects: ["Galaxy 个人作品集"],
    nextSteps: ["减少重复 class，沉淀更稳定的组件样式"],
    x: 235,
    y: 300,
    links: []
  },
  {
    id: "vue",
    name: "Vue 3 / Element Plus",
    zhName: "控制台前端",
    type: "skill",
    status: "learning",
    description: "用于构建配置密集、表单密集的桌面控制台界面。",
    practice: ["将内网穿透控制台的目标服务配置、启动流程和公网地址复制做成可视化界面。"],
    relatedProjects: ["内网穿透控制台"],
    nextSteps: ["补充配置校验、空状态和操作日志"],
    x: -5,
    y: 305,
    links: []
  },

  {
    id: "branch-devtools",
    name: "Dev Tools",
    zhName: "工程工具链",
    type: "branch",
    status: "learned",
    description: "围绕本地环境、代理路线、端口、下载和项目清理的工程效率工具。",
    summary: "从 DevEnv Master、代理路线控制台到内网穿透控制台，核心是把重复试错变成可扫描、可判断、可回放的工具。",
    relatedProjects: ["DevEnv Master", "代理路线控制台", "内网穿透控制台", "爬虫小程序"],
    nextSteps: ["统一 dry-run 预览和危险操作确认", "把测速、扫描、清理结果导出成报告", "加入更多自动化测试"],
    x: -75,
    y: 130,
    links: ["streamlit", "pathlib", "networking", "git"]
  },
  {
    id: "streamlit",
    name: "Streamlit",
    zhName: "快速工具界面",
    type: "skill",
    status: "learned",
    description: "用于快速把 Python 数据处理和本地扫描能力做成可操作界面。",
    practice: ["支撑 Dazzle Secretary Pro 与 DevEnv Master 的交互式页面。"],
    relatedProjects: ["Dazzle Secretary Pro", "DevEnv Master"],
    nextSteps: ["优化缓存和长任务进度显示", "抽象通用表格筛选组件"],
    x: -130,
    y: 260,
    links: []
  },
  {
    id: "pathlib",
    name: "pathlib / concurrent.futures",
    zhName: "文件扫描与并发",
    type: "skill",
    status: "learned",
    description: "扫描多个代码根目录，识别项目、依赖文件、环境目录和缓存占用。",
    practice: ["用规则表统一描述 Python、Node.js、Rust、C++ 项目特征，并并行聚合扫描结果。"],
    relatedProjects: ["DevEnv Master"],
    nextSteps: ["加入忽略规则、扫描快照和安全删除队列"],
    x: -210,
    y: 290,
    links: []
  },
  {
    id: "networking",
    name: "Networking & Proxy",
    zhName: "网络代理与端口",
    type: "skill",
    status: "learning",
    description: "围绕 HTTP/SOCKS 代理端口、目标测速、隧道生命周期和下载路线生成的网络工具能力。",
    practice: ["检测 Shadowrocket 端口状态，对 GitHub、npm、PyPI、Google AI 等目标做直连/代理测速。", "管理 Cloudflare Tunnel、Pinggy 等本地端口公网映射。"],
    relatedProjects: ["代理路线控制台", "内网穿透控制台"],
    nextSteps: ["补齐失败原因分类", "记录节点表现历史"],
    x: -195,
    y: 320,
    links: []
  },
  {
    id: "git",
    name: "Git / Release Hygiene",
    zhName: "版本与发布纪律",
    type: "skill",
    status: "learned",
    description: "维护项目提交、构建、发布和下载物隔离的基本工程纪律。",
    practice: ["为作品集准备提交规范和发布前检查，避免临时文件、大体积下载包或未验证改动进入远程仓库。"],
    relatedProjects: ["Galaxy 个人作品集", "所有本地工具项目"],
    nextSteps: ["为关键项目补齐 CI 检查", "整理每个软件的 release checklist"],
    x: -40,
    y: 295,
    links: []
  }
];
