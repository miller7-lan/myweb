import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { Activity, ArrowRight, Bot, Calculator, Cpu, Eye, FolderSearch, Moon, Network, Route, Search, SearchCode, X, type LucideIcon } from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import type { DownloadableReleaseKey } from '../../data/releases';

type Project = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  desc: string;
  requirements: string[];
  problem: string;
  design: string[];
  techStack: string[];
  highlights: string[];
  releaseTarget?: DownloadableReleaseKey;
};

const projects: Project[] = [
  {
    title: '视觉识别系统 3.0',
    subtitle: 'Awarded Wearable Assistive IoT Device',
    icon: Eye,
    desc: '面向视障与老年群体的胸挂式智能设备项目，以 K210/CanMV 边缘视觉识别为核心，判断前方障碍物，并为雷达距离融合和语音播报预留接口。',
    requirements: [
      '围绕胸挂式辅助设备构建可部署的障碍物识别链路',
      '训练并转换适配 K210 的 YOLO2 Tiny kmodel',
      '识别目标聚焦为单类 obstacle，降低边缘设备推理负担',
      '在计算机设计大赛场景中说明物联网应用价值和后续设备协同方案',
    ],
    problem: '把“能不能提前感知障碍物”这个真实辅助场景，拆成可训练、可部署、可展示的边缘视觉与物联网设备方案。',
    design: [
      '用单类 obstacle 降低标注和推理复杂度',
      '把训练、模型转换和设备端脚本拆成可复现文档',
      '为胸挂式硬件形态、雷达距离融合与扬声器播报预留后续接口',
    ],
    techStack: ['Python', 'YOLO2 Tiny', 'K210', 'CanMV', 'IoT', 'Assistive Tech'],
    highlights: ['河南省级赛二等奖', '边缘视觉', '胸挂式设备'],
  },
  {
    title: 'Dazzle Secretary Pro',
    subtitle: '团支部名单核查工具',
    icon: Bot,
    desc: '从群接龙、OCR 文本或 Excel 粘贴内容中识别已完成人员，自动生成未完成名单、完成率和提醒话术。',
    requirements: [
      '支持班团支书和年团支书两种底册模式',
      '通过底册匹配、Ollama 解析和 OCR 识别处理不同输入来源',
      '对 OCR 疑似错字姓名做模糊修正，并输出可复制提醒话术',
    ],
    problem: '把团支书反复核对名单、截图识别、催办提醒的手工流程变成一套可复用工具。',
    design: [
      '按班级/年级身份拆分底册，避免不同使用者的数据混在一起',
      '用直接匹配、AI 解析和 OCR 兜底覆盖不同输入质量',
      '结果直接生成完成率和提醒话术，减少二次整理',
    ],
    techStack: ['Python', 'Streamlit', 'PaddleOCR', 'Tesseract', 'Ollama', 'pandas'],
    highlights: ['OCR 识别', 'AI 解析', '名单核查'],
    releaseTarget: 'secretary',
  },
  {
    title: '爬虫小程序',
    subtitle: 'PyQt Request Playground',
    icon: SearchCode,
    desc: '一个轻量桌面请求工具，支持输入网址、选择 GET/POST、填写 JSON 参数，并在界面中预览响应内容。',
    requirements: [
      '加载 Qt Designer 生成的本地 UI 文件',
      '支持 GET 和 POST 请求，并带基础 User-Agent',
      '对空 URL、JSON 格式错误和请求异常提供界面提示',
    ],
    problem: '用一个桌面小工具快速验证接口请求，避免每次都切换到命令行或写临时脚本。',
    design: [
      '界面和请求逻辑分离，UI 文件由 Qt Designer 维护',
      '对 GET/POST、JSON 参数和响应预览做最小闭环',
      '把错误直接反馈到界面，降低调试中断感',
    ],
    techStack: ['Python', 'PyQt6', 'requests', 'JSON', 'Qt Designer'],
    highlights: ['桌面 GUI', 'HTTP 请求', '异常反馈'],
  },
  {
    title: '利润助手',
    subtitle: 'Local Profit Ledger · Desktop / Android',
    icon: Calculator,
    desc: '本地家庭利润记账软件，桌面端与 Android 原生端共用 family_ledger.db，围绕录入、看板、历史、设置和导入导出构建。',
    requirements: [
      '桌面端和 Android 端兼容同一套 SQLite 数据库结构',
      '支持自定义一级/二级分类、可配置利润公式和 Excel 报表导出',
      'Android 端提供 APK、数据库导入导出和原生手机交互',
    ],
    problem: '把家庭利润记录从零散表格变成一个本地、可配置、能跨桌面和手机使用的轻量系统。',
    design: [
      '用 SQLite 单文件保证本地私有、备份简单和跨端迁移方便',
      '桌面端沿用 PySide6 工作流，Android 端使用 Kotlin + Jetpack Compose 重建手机交互',
      '用白名单公式解析器支持中文字段和四则运算，避免脚本执行风险',
    ],
    techStack: ['Python', 'PySide6', 'Kotlin', 'Jetpack Compose', 'SQLite', 'Apache POI'],
    highlights: ['本地记账', '跨端数据库', 'Android APK'],
    releaseTarget: 'profit',
  },
  {
    title: 'Tokens Monitor',
    subtitle: 'Multi-model Token Monitoring',
    icon: Activity,
    desc: '面向多模型调用的 token 消耗实时监测工具，后端提供仪表盘、日志和 WebSocket 推送，桌面启动器自动打开本地 Dashboard。',
    requirements: [
      '本地启动 FastAPI 服务并自动创建 SQLite 数据库',
      '通过 WebSocket 向仪表盘实时推送 token 消耗与事件状态',
      '桌面启动器自动寻找可用端口并打开浏览器 Dashboard',
    ],
    problem: '把多模型使用时分散、不可见的 token 消耗变成可观察、可回放、可预警的数据面板。',
    design: [
      '后端按 dashboard、logs、websocket 拆分路由职责',
      '数据默认落在用户 Application Support，避免污染项目目录',
      '启动器自动处理端口冲突，让工具更接近普通桌面应用体验',
    ],
    techStack: ['Python', 'FastAPI', 'Uvicorn', 'SQLAlchemy', 'SQLite', 'WebSocket'],
    highlights: ['实时监测', '本地仪表盘', 'Token 成本'],
  },
  {
    title: 'DevEnv Master',
    subtitle: '全局虚拟环境管理',
    icon: FolderSearch,
    desc: '扫描多个代码根目录，识别 Python、Node.js、Rust、C++ 项目和环境目录，辅助清理本地开发环境占用。',
    requirements: [
      '按语言识别项目、依赖文件和环境目录',
      '汇总环境大小、活跃时间和缺失环境状态',
      '提供 dry-run 深度清理，避免误删前没有预览',
    ],
    problem: '解决本机长期开发后虚拟环境、node_modules、构建缓存散落各处且难以判断是否还能删除的问题。',
    design: [
      '用规则表统一描述不同语言的项目特征和环境目录',
      '并行扫描多个根目录，按语言聚合项目状态',
      '清理前自动生成环境说明或进入 dry-run，给危险操作加缓冲',
    ],
    techStack: ['Python', 'Streamlit', 'pathlib', 'concurrent.futures', 'CLI'],
    highlights: ['环境扫描', '磁盘清理', '开发工具'],
  },
  {
    title: '本机检测',
    subtitle: 'macOS Floating System Monitor',
    icon: Cpu,
    desc: 'macOS 原生悬浮检测工具，实时查看 CPU、内存、网络、热状态和代理出口 IP，用轻量窗口承载本机状态。',
    requirements: [
      '实时采集 CPU、内存、网络速率与系统热状态',
      '以悬浮窗口展示关键指标，适合长时间任务旁路观察',
      '提供代理出口 IP 查询和本机运行状态快速判断',
    ],
    problem: '把 Activity Monitor、网络测速和代理出口确认这些分散动作收束成一个随手可看的本机状态面板。',
    design: [
      '使用 SwiftUI/AppKit 构建 macOS 原生 LSUIElement 应用',
      '按 MetricCollector 拆分采集职责，降低指标扩展成本',
      '用本地采集优先的方式减少常驻工具对系统的额外负担',
    ],
    techStack: ['Swift', 'SwiftUI', 'AppKit', 'Combine', 'Mach API', 'URLSession'],
    highlights: ['系统监测', '悬浮窗口', 'macOS 原生'],
    releaseTarget: 'localMonitor',
  },
  {
    title: '防待机工具集',
    subtitle: 'macOS / Windows Keep Awake',
    icon: Moon,
    desc: '为 macOS 和 Windows 分别实现的防熄屏待机工具，用于长时间下载、演示、编译或监控场景。',
    requirements: [
      '支持一直保持唤醒或按自定义时长倒计时',
      '停止或退出时恢复系统默认电源行为',
      'Windows 版本支持托盘常驻、快捷时长和安全退出',
    ],
    problem: '让长时间任务不再被系统睡眠或熄屏打断，同时避免永久修改系统电源计划。',
    design: [
      'macOS 版本使用系统 caffeinate，轻量且不改系统配置',
      'Windows 版本调用 SetThreadExecutionState，按运行状态临时声明唤醒需求',
      '把倒计时、无限保持、托盘退出都收束到明确的开始/停止状态机',
    ],
    techStack: ['Swift', 'caffeinate', 'C#', '.NET 8', 'WPF', 'Win32 API'],
    highlights: ['防熄屏', '跨平台', '托盘常驻'],
  },
  {
    title: '代理路线控制台',
    subtitle: 'Proxy Route Control',
    icon: Route,
    desc: 'macOS 原生代理与下载路线分析工具，管理本机代理端口、目标域名测速，并可生成直连/代理下载命令。',
    requirements: [
      '检测 Shadowrocket HTTP、SOCKS 等本机代理端口状态',
      '对 GitHub、npm、PyPI、Google AI 等目标做直连/代理测速',
      '接入 Gemini 或本地规则生成下载路线和终端命令',
    ],
    problem: '面对不同下载源和代理节点时，减少手动试错，快速判断应该直连、走代理还是换节点。',
    design: [
      '用 Swift/AppKit 构建原生桌面控制台，减少 WebView 依赖',
      '测速结果与端口状态共同输入 AI Advisor，输出可执行但不改全局配置的建议',
      'API Key 使用钥匙串保存，下载动作前弹窗确认',
    ],
    techStack: ['Swift', 'AppKit', 'URLSession', 'Keychain', 'Gemini API', 'curl/aria2c'],
    highlights: ['代理测速', 'AI 路由', '下载命令'],
  },
  {
    title: '内网穿透控制台',
    subtitle: 'Intranet Tunnel UI',
    icon: Network,
    desc: '用于管理本地端口公网映射的桌面控制台，支持保存目标服务、启动隧道、复制公网访问地址。',
    requirements: [
      '将 Vue 前端打包进 pywebview 桌面壳',
      '支持配置目标端口、工作目录、启动命令和服务商',
      '管理 Cloudflare Tunnel、Pinggy 等隧道生命周期',
    ],
    problem: '把临时公开本地 Web 服务这件事从命令行流程变成可保存、可复用、可视化的控制台。',
    design: [
      '桌面端内置静态服务器托管 SPA，避免额外部署前端',
      '目标配置写入用户目录，便于重复启动常用服务',
      '系统 API 同时负责目标校验、进程管理、隧道启动和设置持久化',
    ],
    techStack: ['Vue 3', 'Element Plus', 'Vite', 'Python', 'pywebview', 'PyInstaller'],
    highlights: ['内网穿透', '桌面控制台', '服务编排'],
    releaseTarget: 'tunnel',
  },
];

const projectGuideIds: Record<string, string> = {
  '视觉识别系统 3.0': 'project-vision',
  'Dazzle Secretary Pro': 'project-secretary',
  '利润助手': 'project-profit',
  '本机检测': 'project-monitor',
  '内网穿透控制台': 'project-tunnel',
};

const ProjectDetailBubble: React.FC<{
  project: Project | null;
  onClose: () => void;
  onOpenRelease: (target: NonNullable<Project['releaseTarget']>) => void;
}> = ({ project, onClose, onOpenRelease }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project && containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, scale: 0.95, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power4.out' }
      );

      gsap.fromTo(containerRef.current.querySelectorAll('.stagger-item'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power3.out', delay: 0.1 }
      );
    }
  }, [project]);

  if (!project) return null;

  const handleClose = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power3.inOut',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  const Icon = project.icon;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none px-4">
      <div className="absolute inset-0 pointer-events-auto" onClick={handleClose} />

      <div
        ref={containerRef}
        className="hud-panel relative w-[calc(100vw-32px)] md:w-[600px] max-h-[75vh] flex flex-col rounded-[28px] p-6 md:p-8 pointer-events-auto overflow-hidden"
        data-guide-id="project-detail"
        style={{
          ['--theme-color' as string]: '#93c5fd',
          ['--hud-x' as string]: '92%',
          ['--hud-y' as string]: '8%',
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors duration-300 z-10"
          aria-label="关闭项目详情"
        >
          <X size={18} />
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col space-y-5">
          <div className="stagger-item pr-8">
            <div className="hud-kicker mb-4">
              <span className="hud-dot" />
              <span>PROJECT BLACK BOX</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/[0.08] flex items-center justify-center mb-5 shadow-[0_0_32px_rgba(147,197,253,0.1)]">
              <Icon size={26} className="text-gray-100" />
            </div>
            <h2 className="text-2xl font-light text-gray-100 tracking-widest mb-1">{project.title}</h2>
            <div className="text-sm text-gray-400 tracking-wide">{project.subtitle}</div>
          </div>

          <p className="stagger-item text-xs text-gray-300 font-light leading-relaxed border-l-2 border-white/10 pl-3 py-1">
            {project.desc}
          </p>

          <div className="stagger-item pt-2">
            <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">需求 · Requirements</h4>
            <ul className="space-y-1.5">
              {project.requirements.map((item) => (
                <li key={item} className="text-xs text-gray-400 font-light flex items-start">
                  <span className="text-gray-600 mr-2 text-[10px] mt-0.5">■</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="stagger-item pt-2 border-t border-white/5">
            <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">解决问题 · Problem Solved</h4>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              {project.problem}
            </p>
          </div>

          <div className="stagger-item pt-2 border-t border-white/5">
            <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">关键设计 · Key Design</h4>
            <ul className="space-y-1.5">
              {project.design.map((item) => (
                <li key={item} className="text-xs text-gray-400 font-light flex items-start">
                  <span className="text-gray-600 mr-2">›</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="stagger-item pt-2 border-t border-white/5">
            <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">技术栈 · Tech Stack</h4>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <span key={tech} className="text-[11px] text-gray-300 bg-white/5 border border-white/[0.05] px-2 py-1 rounded-md tracking-wide">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="stagger-item pt-2 border-t border-white/5">
            <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">亮点 · Highlights</h4>
            <div className="flex flex-wrap gap-2">
              {project.highlights.map((highlight) => (
                <span key={highlight} className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md">
                  {highlight}
                </span>
              ))}
            </div>
          </div>

          {project.releaseTarget && (
            <div className="stagger-item pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => onOpenRelease(project.releaseTarget!)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <span>查看发行页面</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const CreationsContent: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const setActiveTheme = useGalaxyStore((state) => state.setActiveTheme);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProjects = normalizedQuery
    ? projects.filter((project) => [
      project.title,
      project.subtitle,
      project.desc,
      project.problem,
      ...project.highlights,
      ...project.techStack,
      ...project.requirements,
      ...project.design,
    ].join(' ').toLowerCase().includes(normalizedQuery))
    : projects;

  useEffect(() => {
    const preferredProject = window.sessionStorage.getItem('preferredCreationProject');
    if (!preferredProject) {
      return;
    }

    const project = projects.find((item) => item.title === preferredProject);
    window.sessionStorage.removeItem('preferredCreationProject');
    if (project) {
      const timer = window.setTimeout(() => setSelectedProject(project), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleGuideOpen = (event: WindowEventMap['galaxy-guide-open']) => {
      const action = event.detail.target.openAction;
      if (action?.type !== 'open-project') return;
      const project = projects.find((item) => item.title === action.value);
      if (project) {
        setSearchQuery('');
        setSelectedProject(project);
      }
    };

    window.addEventListener('galaxy-guide-open', handleGuideOpen);
    return () => window.removeEventListener('galaxy-guide-open', handleGuideOpen);
  }, []);

  const openReleasePage = (target: NonNullable<Project['releaseTarget']>) => {
    window.sessionStorage.setItem('preferredOrbitTab', target);
    setSelectedProject(null);
    setActiveTheme('orbit');
  };

  return (
    <div className="w-full relative">
      <div className="mb-12">
        <div className="hud-kicker mb-4">
          <span className="hud-dot" />
          <span>CREATIONS ARCHIVE</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">精选作品</h2>
        <p className="text-lg md:text-xl text-gray-400 font-light">只展示项目能力与设计取舍，不提供下载入口。</p>
      </div>

      <div className="hud-panel mb-8 flex flex-col gap-4 rounded-3xl p-4 md:flex-row md:items-center md:justify-between" data-guide-id="creations-search">
        <label className="relative flex min-h-12 flex-1 items-center">
          <Search size={18} className="absolute left-4 text-gray-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索项目、技术栈、关键词..."
            className="hud-search"
          />
        </label>
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-gray-500 md:justify-end">
          <span>{filteredProjects.length} / {projects.length} Files</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rounded-full border border-white/10 px-3 py-2 text-gray-400 transition-colors hover:border-white/20 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project, index) => {
          const Icon = project.icon;

          return (
            <button
              type="button"
              key={project.title}
              onClick={() => setSelectedProject(project)}
              className="scan-card group min-h-[23rem] text-left p-7 md:p-8 backdrop-blur-md focus:outline-none"
              data-guide-id={projectGuideIds[project.title]}
              style={{ ['--theme-color' as string]: '#93c5fd' }}
            >
              <div className="absolute right-6 top-6 text-[10px] font-light tracking-[0.24em] text-gray-600 transition-colors group-hover:text-blue-200/70">
                FILE {String(index + 1).padStart(2, '0')}
              </div>

              <div className="relative text-gray-100 mb-7 bg-white/5 w-16 h-16 flex items-center justify-center rounded-2xl border border-white/[0.08] shadow-[inset_0_0_24px_rgba(255,255,255,0.03),0_0_28px_rgba(147,197,253,0.08)] transition-transform duration-300 group-hover:scale-105">
                <Icon size={30} />
              </div>

              <div className="relative">
                <div className="hud-kicker mb-3">
                  <span className="hud-dot opacity-80" />
                  <span>MISSION LOG</span>
                </div>
                <h3 className="text-2xl text-white font-light tracking-wide mb-2">
                  {project.title}
                </h3>
                <div className="text-xs text-gray-500 tracking-widest uppercase mb-4">
                  {project.subtitle}
                </div>

                <p className="text-gray-400 font-light leading-relaxed mb-8 min-h-[96px]">
                  {project.desc}
                </p>

                <div className="flex flex-wrap gap-2">
                  {project.highlights.map((tag) => (
                    <span key={tag} className="hud-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
          })}
        </div>
      ) : (
        <div className="hud-panel flex min-h-[18rem] flex-col items-center justify-center rounded-3xl p-8 text-center">
          <Search size={30} className="mb-4 text-gray-500" />
          <div className="hud-kicker mb-3">
            <span className="hud-dot" />
            <span>NO MATCHING FILES</span>
          </div>
          <p className="max-w-md text-sm font-light leading-relaxed text-gray-400">
            没有找到匹配的项目。可以试试搜索 Python、AI、桌面、代理、OCR、Token 等关键词。
          </p>
        </div>
      )}

      <ProjectDetailBubble
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onOpenRelease={openReleasePage}
      />
    </div>
  );
};
