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
  summary?: string; // For branch nodes
  x: number;
  y: number;
  links: string[];
};

export const skillsData: SkillNode[] = [
  // CORE
  {
    id: "core",
    name: "Stack Core",
    zhName: "技术核心",
    type: "core",
    status: "learned",
    description: "我工程旅程的根基所在。",
    x: 0,
    y: 0,
    links: ["branch-lang", "branch-front", "branch-back", "branch-ai", "branch-tools", "branch-future"]
  },

  // 1. LANGUAGES BRANCH (~225°)
  {
    id: "branch-lang",
    name: "Languages",
    zhName: "编程语言",
    type: "branch",
    status: "learned",
    description: "我用来构建系统的核心编程语言。",
    summary: "通过全面且高性能的编程语言生态，为构建各种形态的稳健系统奠定基础。",
    relatedProjects: ["Python 数据脚本", "Qt 桌面应用", "Web 前端界面"],
    nextSteps: ["深入 Rust 语言", "WASM 底层集成", "底层内存优化"],
    x: -90,
    y: -90,
    links: ["python", "javascript"]
  },
  { 
    id: "python", name: "Python", zhName: "Python", type: "skill", status: "learned", 
    description: "主要用于 AI 原型、数据处理和脚本工具的语言。", 
    practice: ["利用 Python 进行数据清理与 AI 算法原型验证。", "开发基于 Streamlit 的可视化数据看板和各类自动化脚本。"],
    relatedProjects: ["AI 辅助智能胸牌", "自动化数据管道"],
    nextSteps: ["Asyncio 异步优化", "使用 Cython 提升性能极限"],
    x: -160, y: -140, links: ["cpp", "java"] 
  },
  { 
    id: "cpp", name: "C++", zhName: "C++", type: "skill", status: "learned", 
    description: "用于对性能极其敏感的底层逻辑和桌面端开发。", 
    practice: ["通过 C++ 进行基础算法训练与底层数据结构实现。", "结合 Qt 框架开发跨平台的高性能图形界面应用。"],
    relatedProjects: ["Qt 监控大屏", "算法可视化工具"],
    nextSteps: ["C++20 现代特性应用", "高并发与多线程架构设计"],
    x: -220, y: -190, links: [] 
  },
  { 
    id: "java", name: "Java", zhName: "Java", type: "skill", status: "learned", 
    description: "专注于面向对象编程与企业级后端系统构建。", 
    practice: ["完成了各类面向对象的高级设计课题。", "深入理解了企业级后端底层架构与设计模式。"],
    relatedProjects: ["高校课程系统", "企业级模拟架构"],
    nextSteps: ["Spring Boot 实战运用", "微服务架构重构"],
    x: -130, y: -220, links: [] 
  },
  { 
    id: "javascript", name: "JavaScript", zhName: "JavaScript", type: "skill", status: "learning", 
    description: "万维网的核心交互语言。", 
    practice: ["开发各种丰富的网页交互逻辑。", "掌握了深度的 DOM 操作模型和复杂的事件分发机制。"],
    relatedProjects: ["个人展示网页", "一系列前端交互工具"],
    nextSteps: ["深度拆解 JS V8 引擎", "高级闭包与原型链应用"],
    x: -240, y: -110, links: ["typescript"] 
  },
  { 
    id: "typescript", name: "TypeScript", zhName: "TypeScript", type: "skill", status: "learning", 
    description: "为大型前端工程保驾护航的强类型语言。", 
    practice: ["应用于 React 等现代框架，提升项目的可维护性和类型安全。", "设计高复用的泛型接口和严谨的数据模型。"],
    relatedProjects: ["React UI 组件库", "全类型安全的 API SDK"],
    nextSteps: ["高级泛型系统开发", "严格模式类型推导优化"],
    x: -310, y: -130, links: [] 
  },

  // 2. FRONTEND BRANCH (~315°)
  {
    id: "branch-front",
    name: "Frontend",
    zhName: "前端",
    type: "branch",
    status: "learned",
    description: "构建沉浸式且视觉震撼的用户交互界面。",
    summary: "从底层 HTML/CSS 到现代化的 React/Vue 框架，打造兼具高性能与高颜值的前端产品。",
    relatedProjects: ["个人作品集网站", "数据后台面板", "3D WebGL 交互场景"],
    nextSteps: ["Web Components 探索", "微前端架构实践", "进阶 WebGL 渲染"],
    x: 90,
    y: -90,
    links: ["html", "react"]
  },
  { 
    id: "html", name: "HTML", zhName: "网页结构", type: "skill", status: "learned", 
    description: "网页内容的骨架与语义化标签体系。", 
    practice: ["运用语义化标签进行页面构建和可访问性适配。", "针对搜索引擎优化 (SEO) 规范标签使用。"],
    relatedProjects: ["诸多基础网页项目"],
    nextSteps: ["深入研究可访问性工程 (a11y)"],
    x: 150, y: -130, links: ["css"] 
  },
  { 
    id: "css", name: "CSS", zhName: "样式与设计", type: "skill", status: "learned", 
    description: "掌控页面的布局美学与响应式设计。", 
    practice: ["精通 Flexbox / Grid 布局机制和盒模型底层原理。", "实现复杂的页面微交互动画和响应式多端适配。"],
    relatedProjects: ["全套自研 Design System"],
    nextSteps: ["探索 CSS Houdini 底层", "构建极其复杂的 Grid 仪表盘布局"],
    x: 200, y: -180, links: ["tailwind"] 
  },
  { 
    id: "tailwind", name: "Tailwind CSS", zhName: "Tailwind CSS", type: "skill", status: "learning", 
    description: "目前前端工程最流行的原子化 CSS 框架。", 
    practice: ["通过原子类极速搭建极具现代感的用户界面。", "深度定制框架的主题配置文件以适配特定品牌视觉。"],
    relatedProjects: ["Galaxy 个人主页", "通用管理后台 UI"],
    nextSteps: ["开发自定义 Tailwind 插件", "JIT 引擎的极致编译优化"],
    x: 260, y: -150, links: [] 
  },
  { 
    id: "react", name: "React", zhName: "React", type: "skill", status: "learning", 
    description: "基于组件化思想的现代前端 UI 库。", 
    practice: ["通过组件化架构大幅提高前端代码的复用率。", "熟练运用 Hooks 机制和前端全局状态管理。"],
    relatedProjects: ["Galaxy 星系个人主页", "高频交互数据看板"],
    nextSteps: ["引入 React Server Components", "深度理解并发渲染 (Concurrent Mode)"],
    x: 240, y: -100, links: ["vue", "threejs"] 
  },
  { 
    id: "vue", name: "Vue", zhName: "Vue", type: "skill", status: "learning", 
    description: "轻量、渐进且易于集成的现代 JavaScript 框架。", 
    practice: ["开发大量前端实验项目和轻量级的控制台系统。", "使用 Vuex / Pinia 构建稳定可预测的数据流。"],
    relatedProjects: ["内网穿透控制台终端"],
    nextSteps: ["彻底解构 Vue 3 Composition API", "探索 Vue 底层响应式源码"],
    x: 310, y: -80, links: [] 
  },
  { 
    id: "threejs", name: "Three.js", zhName: "Three.js", type: "skill", status: "learning", 
    description: "在浏览器中绘制顶级 3D 图形的利器。", 
    practice: ["构建支持 3D 摄像机交互的庞大粒子视觉场景。", "掌握了自定义着色器和复杂场景树的管理。"],
    relatedProjects: ["Galaxy 3D 星系背景"],
    nextSteps: ["编写极高复杂度的 GLSL 材质", "针对千元机的 3D 渲染性能降级优化"],
    x: 290, y: -160, links: [] 
  },

  // 3. BACKEND BRANCH (~180°)
  {
    id: "branch-back",
    name: "Backend",
    zhName: "后端",
    type: "branch",
    status: "learned",
    description: "包含稳定的服务端、API 接口和数据库管理体系。",
    summary: "规划并架构高可用的服务器底层基础设施，同时提供高性能 API 与高效的数据流转通道。",
    relatedProjects: ["隧道控制中心后端", "REST API 网关"],
    nextSteps: ["演进到微服务架构", "Serverless 无服务器函数探索"],
    x: -120,
    y: 0,
    links: ["server-basics"]
  },
  { 
    id: "server-basics", name: "Server Basics", zhName: "服务器基础", type: "skill", status: "learned", 
    description: "从物理架构到 HTTP 协议的底层服务器原理。", 
    practice: ["精通服务器硬件参数配置、网络端口与请求链路分析。", "独立完成基础生产环境的部署和 Nginx 反向代理配置。"],
    relatedProjects: ["个人中心云服务器集群"],
    nextSteps: ["异地多活的高可用部署", "流量洪峰下的负载均衡策略"],
    x: -200, y: 0, links: ["api-design", "db-basics", "nodejs"] 
  },
  { 
    id: "api-design", name: "API Design", zhName: "API 设计", type: "skill", status: "learning", 
    description: "设计稳定、规范且高内聚的系统级接口。", 
    practice: ["合理组织接口路由层级，并定义清晰的数据交互报文。", "建立前后端分离协作的标准化协议与规范。"],
    relatedProjects: ["RESTful 核心服务接口层"],
    nextSteps: ["全面拥抱 GraphQL", "基于 gRPC 协议的微服务内网通信"],
    x: -260, y: -50, links: [] 
  },
  { 
    id: "db-basics", name: "Database Basics", zhName: "数据库基础", type: "skill", status: "learning", 
    description: "传统关系型与新兴非关系型数据库的底层理念。", 
    practice: ["建立底层的数据表架构设计与高效的数据存储。", "熟练运用 SQLite 和 MySQL 进行高频并发查询优化。"],
    relatedProjects: ["集中式用户权限管理系统"],
    nextSteps: ["探索 PostgreSQL 空间与复杂特性", "引入 Redis 做高频数据缓存"],
    x: -260, y: 50, links: [] 
  },
  { 
    id: "nodejs", name: "Node.js", zhName: "Node.js", type: "skill", status: "learning", 
    description: "实现前后端同构的 JavaScript 运行时环境。", 
    practice: ["极大地简化了全栈工程化的复杂度和开发周期。", "结合 Express 和 Fastify 构建极速的服务端应用。"],
    relatedProjects: ["联络聚合服务器", "OAuth 认证服务中心"],
    nextSteps: ["引入企业级 NestJS 框架", "Node 底层内存泄漏排查与性能剖析"],
    x: -310, y: 0, links: ["fastapi"] 
  },
  { 
    id: "fastapi", name: "FastAPI", zhName: "FastAPI", type: "skill", status: "learning", 
    description: "以极其优异的性能著称的现代 Python Web 框架。", 
    practice: ["主要用来承接 Python 模型和后端微服务接口的开发。", "利用 Pydantic 实现严格的输入输出数据结构验证。"],
    relatedProjects: ["AI 离线模型调用 API 网关"],
    nextSteps: ["WebSockets 实时双向流集成", "深入依赖注入底层原理"],
    x: -380, y: 0, links: [] 
  },

  // 4. AI & ML BRANCH (~0°)
  {
    id: "branch-ai",
    name: "AI & ML",
    zhName: "人工智能与机器学习",
    type: "branch",
    status: "learned",
    description: "涵盖各类先进的模型算法以及落地级的人工智能工具链。",
    summary: "通过计算机视觉、本地运行的大语言模型（LLM）以及基于特征向量的技术，构建可落地的实际业务 AI 系统。",
    relatedProjects: ["AI 智能辅助胸牌", "特征识别视觉引擎", "本地 LLM 智能审核系统"],
    nextSteps: ["深度模型压缩技术", "端侧边缘硬件部署", "图文音多模态融合感知"],
    x: 120,
    y: 0,
    links: ["ml-basics"]
  },
  { 
    id: "ml-basics", name: "Machine Learning Basics", zhName: "机器学习基础", type: "skill", status: "learning", 
    description: "现代机器学习模型的核心理论与底层原理。", 
    practice: ["彻底理解基础模型的推导、训练机制以及评估指标体系。", "掌握大量复杂结构的数据预处理清洗策略。"],
    relatedProjects: ["通用数据集自动分类脚本集"],
    nextSteps: ["复杂的高级集成方法", "定制化特定业务的损失函数 (Loss Functions)"],
    x: 200, y: 0, links: ["linear-prog", "feature-vectors"] 
  },
  { 
    id: "linear-prog", name: "Linear Programming", zhName: "线性规划", type: "skill", status: "learned", 
    description: "运筹学和大规模复杂系统优化问题的核心解法。", 
    practice: ["被广泛用于解决数学建模竞赛中的大规模组合优化难题。", "编写高效的资源最大化分配和调度算法。"],
    relatedProjects: ["高阶数学建模竞赛方案"],
    nextSteps: ["进阶非线性规划", "引入现代启发式优化算法"],
    x: 260, y: -40, links: [] 
  },
  { 
    id: "feature-vectors", name: "Feature Vectors", zhName: "特征向量", type: "skill", status: "learned", 
    description: "万物皆可向量化的机器学习底层数据表示方式。", 
    practice: ["主要应用在物品的高维相似度匹配与极高个性化的识别推荐。", "无缝接入现代化的向量数据库 (Vector DB) 生态体系。"],
    relatedProjects: ["通用级视觉识别引擎", "个性化内容推荐插件"],
    nextSteps: ["近似最近邻搜索 (ANN) 的底层调优", "亿级高维索引构建"],
    x: 260, y: 40, links: ["yolo", "local-llm"] 
  },
  { 
    id: "yolo", name: "YOLO", zhName: "目标检测", type: "skill", status: "learned", 
    description: "专为极速实时对象检测与复杂视觉识别任务而生的系统。", 
    practice: ["采用最新的 Ultralytics YOLO 架构进行目标追踪检测。", "将 YOLO 与高维特征向量结合，打造个性化的万物识别系统。", "针对边缘侧低算力硬件设备进行严格的部署约束探索。"],
    relatedProjects: ["AI 智能辅助胸牌", "轻量化视觉引擎原型系统"],
    nextSteps: ["打通 ONNX / TFLite 模型转换全链路", "通过量化与剪枝进行深度模型压缩", "挑战边缘端点 (Edge Inference) 的极致性能"],
    x: 330, y: 0, links: [] 
  },
  { 
    id: "local-llm", name: "Local LLM", zhName: "本地大语言模型", type: "skill", status: "learned", 
    description: "摆脱云端算力束缚的纯本地化语言大模型部署技术。", 
    practice: ["在本地开发无需联网的智能 AI 审核模块、数据深度清洗终端。", "深入实验各种 Prompt 工程调优以及轻量化微调策略。"],
    relatedProjects: ["纯内网 LLM 智能筛选过滤中枢"],
    nextSteps: ["全面落地 RAG（检索增强生成）系统架构", "引入 LoRA 参数级微调以适应特定业务域"],
    x: 340, y: 70, links: ["ai-agent"] 
  },
  { 
    id: "ai-agent", name: "AI Agent", zhName: "AI 智能体", type: "skill", status: "learning", 
    description: "能自主决策并使用外部工具组合解决复杂问题的全自动化管道。", 
    practice: ["通过定义清晰的工具链，构建能够自主执行工作流的自动化管线。", "实验了基于 LangChain 及 LLM 意图路由机制的复杂调度模块。"],
    relatedProjects: ["智能 Agent 剧本与脚本执行器"],
    nextSteps: ["攻克多 Agent 并行协作难题", "构建具备长记忆与反思能力的状态管理引擎"],
    x: 410, y: 50, links: [] 
  },

  // 5. TOOLS & DEPLOYMENT BRANCH (~135°)
  {
    id: "branch-tools",
    name: "Tools",
    zhName: "工具与部署",
    type: "branch",
    status: "learned",
    description: "囊括 DevOps、底层版本控制以及各类基础支撑设施。",
    summary: "全面掌握现代开发工具链，大幅提升研发、持续部署以及最终生产环境运维的整体效能。",
    relatedProjects: ["内网穿透枢纽实验", "CI自动化工作流"],
    nextSteps: ["全链路 CI/CD 自动化流水线搭建", "引入 Kubernetes (K8s) 进行大规模容器编排"],
    x: -90,
    y: 90,
    links: ["git"]
  },
  { 
    id: "git", name: "Git", zhName: "Git", type: "skill", status: "learned", 
    description: "保障代码安全且支持多人协同的版本控制系统。", 
    practice: ["对所有核心工程均使用严苛的代码版本控制机制。", "掌控复杂的分支策略与代码极度冲突时的底层修复手段。"],
    relatedProjects: ["所有代码核心仓库"],
    nextSteps: ["深入定制高级 Git Hooks 拦截逻辑", "探索多 Submodules 巨型仓库的最佳管理范式"],
    x: -140, y: 140, links: ["github-gitee", "linux-basics"] 
  },
  { 
    id: "github-gitee", name: "GitHub / Gitee", zhName: "代码托管", type: "skill", status: "learned", 
    description: "现代开源生态与远程仓库托管的中枢核心。", 
    practice: ["高频使用全球主流的托管平台展示和备份重要资产。", "基础掌握 GitHub Actions 驱动的代码提交即自动化流转体系。"],
    relatedProjects: ["参与并建立开源社区贡献库"],
    nextSteps: ["部署复杂的自动化 CI/CD 测试管线", "打通自动化 Package Registry 镜像自动发布"],
    x: -210, y: 130, links: ["inner-tunnel"] 
  },
  { 
    id: "inner-tunnel", name: "Inner Tunnel", zhName: "内网穿透", type: "skill", status: "learned", 
    description: "将局域网本地服务安全暴露给全互联网的核心技术。", 
    practice: ["完成过多次复杂的内网穿透以及底层网络请求转发的深度实验。", "通过调整 FRP / Ngrok 各类配置项实现无感穿透。"],
    relatedProjects: ["定制化内网穿透终端控制中心"],
    nextSteps: ["研究并自研定制化隧道加密协议", "构建极其安全的隐蔽代理架构"],
    x: -280, y: 120, links: [] 
  },
  { 
    id: "linux-basics", name: "Linux Basics", zhName: "Linux 基础", type: "skill", status: "learning", 
    description: "服务器世界的基石，涵盖命令行、文件系统以及运维管理。", 
    practice: ["对所有生产开发环境和 Linux 的系统级部署架构有着深度理解。", "能编写高效的 Shell 自动化监控与系统管理脚本。"],
    relatedProjects: ["服务器全量初始环境自动化装配脚本"],
    nextSteps: ["接触 Kernel 系统内核调优参数", "编写极为复杂的系统级防御 bash 脚本"],
    x: -160, y: 210, links: ["streamlit", "docker"] 
  },
  { 
    id: "streamlit", name: "Streamlit", zhName: "Streamlit", type: "skill", status: "learned", 
    description: "能够以极速在 Python 中构建美观数据应用的革命性框架。", 
    practice: ["用于将复杂的底层数据或者模型包装为任何人立即可用的精美 UI 界面。", "为机器学习原型系统提供强有力的交互式仪表盘演示能力。"],
    relatedProjects: ["各类数据探查可视化终端应用"],
    nextSteps: ["定制开发底层自定义交互组件", "运用超高级缓存机制极致优化渲染"],
    x: -230, y: 240, links: ["qt"] 
  },
  { 
    id: "qt", name: "Qt", zhName: "Qt 框架", type: "skill", status: "learned", 
    description: "功能极其庞大的跨平台系统级桌面应用开发框架。", 
    practice: ["利用其体系建立桌面级客户端操作界面。", "彻底领悟并大量实战应用了其经典的 Signal/Slot (信号槽) 通信机制。"],
    relatedProjects: ["自研全平台通用桌面工具客户端"],
    nextSteps: ["引入 QML 开发下一代高流畅度流体图形界面", "挑战底层跨平台交叉编译移植到移动端"],
    x: -300, y: 260, links: [] 
  },
  { 
    id: "docker", name: "Docker", zhName: "Docker", type: "skill", status: "locked", 
    description: "彻底解决“在我的机器上能跑”问题的终极容器化部署方案。", 
    practice: ["将复杂的全栈项目封装隔离并一键部署到云端生产服务器。"],
    relatedProjects: ["全链路研发环境极致标准化体系"],
    nextSteps: ["构建复杂的 Docker Compose 服务编排网络", "深度挑战镜像底层体积的极限优化压缩"],
    x: -140, y: 280, links: [] 
  },

  // 6. FUTURE LEARNING BRANCH (~45°)
  {
    id: "branch-future",
    name: "Future",
    zhName: "未来蓝图",
    type: "branch",
    status: "learning",
    description: "紧跟时代前沿的技术雷达，以及更高维度的架构设计方向。",
    summary: "这是为了保持持续且极其旺盛的探索欲，不断深入并征服那些能够重塑工程世界版图的尖端领域。",
    relatedProjects: ["前沿文献探索", "全球顶尖数学与工程竞赛体系"],
    nextSteps: ["攻克深不可测的复杂深度学习模型群", "全面拥抱并主导云原生 (Cloud Native) 生态架构"],
    x: 90,
    y: 90,
    links: ["algo-training"]
  },
  { 
    id: "algo-training", name: "Algorithm Training", zhName: "算法实战体系", type: "skill", status: "learning", 
    description: "支撑顶级架构的底层数据结构与极具挑战性的竞技编程。", 
    practice: ["不断参与算法竞赛与模拟面试，极大地夯实了手写底层代码的工程功底。", "全面涉猎动态规划、图论以及贪心策略的高阶解法。"],
    relatedProjects: ["个人专属算法试炼竞技场"],
    nextSteps: ["挑战极其抽象的高级平衡树数据结构", "稳步向 Codeforces 全球高难度竞技场进发"],
    x: 150, y: 140, links: ["math-modeling"] 
  },
  { 
    id: "math-modeling", name: "Mathematical Modeling", zhName: "数学建模", type: "skill", status: "learning", 
    description: "运用纯数学的无上魅力来剖析并求解极度复杂的现实工程难题。", 
    practice: ["带队参与各类最高规格的数学建模竞赛以及负责大规模数据的高维分析。", "运用统计推断逻辑以及多种复杂预测模型重塑客观世界的数学规律。"],
    relatedProjects: ["诸多顶级数学建模竞赛实战落地方案"],
    nextSteps: ["引入更高级的随机过程微积分", "挑战拥有海量节点的复杂网络动力学分析"],
    x: 210, y: 190, links: ["fullstack", "deep-learning"] 
  },
  { 
    id: "fullstack", name: "Full-stack Engineering", zhName: "大前端全栈工程化", type: "skill", status: "learning", 
    description: "从草图设计直至全球CDN分发的极度完整的端到端系统架构。 ", 
    practice: ["独立承担并贯穿完成大型项目的从 0 到 1 所有的工程化生命周期。", "将最先进的持续集成/持续交付（CI/CD）毫无保留地整合进日常开发流程。"],
    relatedProjects: ["Galaxy 星系多平台个人展示门户矩阵"],
    nextSteps: ["研究微服务、中台等系统级架构设计模式", "深入理解并突破应对十万级并发的极致弹性伸缩架构"],
    x: 290, y: 170, links: ["cloud"] 
  },
  { 
    id: "cloud", name: "Cloud Deployment", zhName: "云原生与大规模部署", type: "skill", status: "locked", 
    description: "深度依赖 AWS、Azure 等头部云厂商建立的高可用云原生自动化工作流体系。", 
    practice: ["负责所有生产服务器的实时在线部署、性能压测和灾备级别的服务维护保障。"],
    relatedProjects: ["全天候运行的云端生产级核心服务器"],
    nextSteps: ["考取 AWS 或阿里云官方核心架构师级认证", "全盘引入 Terraform 或同级别基础设施即代码 (IaC) 的管理范式"],
    x: 370, y: 160, links: [] 
  },
  { 
    id: "deep-learning", name: "Deep Learning", zhName: "极度深度的学习模型", type: "skill", status: "locked", 
    description: "理解世界上极其复杂的神经网络拓扑架构以及深邃的非线性特征提取机制。", 
    practice: ["打破表面黑盒，深入底层探究人工智能大模型的极致理解范式。", "打牢基于 PyTorch 这种工业级深度学习研究框架的基础知识。"],
    relatedProjects: ["超高难度神经网络架构雏形原型探索"],
    nextSteps: ["独立解构统治世界的 Transformer底层注意力网络架构", "摒弃所有封装，手写基于 Tensor 核心的 Custom 训练反向传播环路"],
    x: 240, y: 260, links: ["cv-advanced"] 
  },
  { 
    id: "cv-advanced", name: "Computer Vision Advanced", zhName: "高级计算机视觉", type: "skill", status: "learning", 
    description: "突破像素的二维束缚，进行超高难度的深层图像处理与生成式视觉实验。", 
    practice: ["主导极其高级的视觉项目落地以及极具科幻感的底层图像合成与解析系统。", "能够构建极其复杂且鲁棒的 OpenCV 多模态图像信号处理管道 (Pipelines)。"],
    relatedProjects: ["通用级全量化识别视觉引擎下一代升级版本"],
    nextSteps: ["进军双目或雷达结合的纯正 3D 世界视觉感知", "深刻理解并最终应用统治生成式视觉的 GANs/Diffusion (扩散模型)"],
    x: 300, y: 310, links: [] 
  }
];
