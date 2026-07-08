# Dazzle Galaxy Portfolio

一个以银河、星球和 HUD 控制台为视觉语言的个人作品集网页。页面用 3D 星环作为主导航，把个人介绍、作品档案、技术栈、软件发行和联系入口组织成五个可探索模块。

## 网页定位

这个网页不是传统的滚动式简历，而是一个可交互的个人宇宙：

- 用星球代表不同信息模块，让访问者通过点击、悬停和键盘导航进入内容。
- 用半透明 HUD、扫描线、粒子环和主题色反馈强化“控制台”体验。
- 用项目黑盒、技能星图、发行轨道和联系信号等概念，把作品展示做成一套统一的叙事系统。

## 核心模块

- **Identity 身份**：展示个人定位、当前关注方向、工作原则和工程画像。
- **Creations 作品**：用项目黑盒形式展示项目背景、需求、设计、技术栈和亮点。
- **Stack 技术栈**：用技能星图呈现已掌握、学习中和计划学习的工具与系统。
- **Orbit 轨道**：展示可下载的软件发行包、平台信息、版本说明和校验信息。
- **Signal 信号**：提供联系表单、开放交流方向和沟通边界。

## 交互特色

- **星球聚焦**：鼠标靠近星球时触发锁定光束、主题色高亮和信息浮层。
- **视觉模式**：支持 Cinematic、Focus、Silent 三档视觉强度，适配沉浸浏览和低功耗浏览。
- **访问进度**：记录访问过的模块，并在全部模块完成后触发银河地图完成状态。
- **流星与涟漪**：星环上会出现流星冲击，点击星环也能手动触发流星坠落。
- **纸船漂流**：星环上有一艘简笔画纸船，会沿环形水流漂动，并受到流星涟漪影响。
- **公告舱**：首页提供最近更新公告入口，用于展示版本、安全和体验改动。
- **公告管理**：公告弹窗内提供低调的管理员入口，可登录后编辑公告并同步线上内容。

## 技术栈

- React 19
- TypeScript
- Vite
- Three.js
- @react-three/fiber
- @react-three/drei
- GSAP
- Zustand
- Tailwind CSS
- Lucide React

## 本地运行

```bash
npm install
npm run dev
```

构建生产版本：

```bash
npm run build
```

预览生产构建：

```bash
npm run preview
```

## 公告管理配置

线上公告通过 Cloudflare Pages Functions 读取和保存，内容存放在 KV 绑定 `ANNOUNCEMENTS_KV` 中。管理员账号不要写进代码，放在 Cloudflare Pages 的环境变量里：

```bash
node scripts/hash-admin-password.mjs "your-long-admin-password"
```

将输出值配置为 `ADMIN_PASSWORD_HASH`，同时配置 `ADMIN_USERNAME` 和一个高强度随机值 `ADMIN_SESSION_SECRET`。登录成功后后台使用 HttpOnly Cookie 和 CSRF token 保存会话；更新公告会立即写入 KV，前台打开公告弹窗时会自动刷新。

## 项目结构

```text
src/
  components/
    Scene/      # 3D 银河、星球、星环、流星、纸船等场景组件
    Themes/     # 五个主题模块的内容组件
    UI/         # 首页 HUD、主题覆盖层、方向提示等界面组件
  data/         # 主题与技能数据
  shaders/      # 粒子着色器
  store/        # 全局交互状态
  styles/       # 全局样式与 HUD 组件样式
```

## 设计关键词

银河导航、粒子星环、低亮度 HUD、扫描反馈、主题色锁定、软件发行轨道、技能星图、项目黑盒、纸船漂流。
