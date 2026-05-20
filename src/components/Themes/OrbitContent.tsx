import React, { useMemo, useState } from 'react';
import { ArrowDownToLine, Bot, Calculator, Cpu, Database, HardDrive, Monitor, Network, Search, type LucideIcon } from 'lucide-react';

type ReleaseKey = 'secretary' | 'tunnel' | 'profit' | 'next';

type ReleaseItem = {
  key: ReleaseKey;
  title: string;
  subtitle: string;
  date: string;
  node: string;
  icon: LucideIcon;
  body: string;
  status: string;
  platform: string;
  image?: string;
  primaryDownload?: {
    label: string;
    href: string;
    sha256?: string;
  };
  links?: Array<{
    label: string;
    href: string;
    sha256?: string;
  }>;
  specs?: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
  }>;
  scenes?: string[];
  keywords: string[];
};

const releases: ReleaseItem[] = [
  {
    key: 'secretary',
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
      href: '/downloads/Dazzle-Secretary-macOS.dmg',
      sha256: '7667fcba05da7593e7b60367aaa19563e7f717457dd750828cc7aba50c6cac67',
    },
    links: [
      { label: 'Windows ZIP (124 MB)', href: '/downloads/DazzleSecretaryPro-Windows-解压即用.zip', sha256: '62189fe4c7dac77410006ba4c8da3fd1bcd12f1054e76b0f9886b58a5f25a32f' },
      { label: 'macOS ZIP (592 KB)', href: '/downloads/Dazzle-Secretary-macOS.zip', sha256: '62510df371c725e57ad0c18183914bb2e9ddd8cd19a6fd8926afb365efda9542' },
      { label: 'Android APK (45 MB)', href: '/downloads/DazzleSecretary-Android-debug.apk.1.1', sha256: '7e8edd3ede089f0710d6c7b37d368bf130e73c1e22fab4b2d8a2018ddc862320' },
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
      href: '/downloads/内网穿透控制台-macOS.dmg',
      sha256: '4d3a259749dfb1965363fcc311ae821d2b2766b38ef2cc10c7533dc901839184',
    },
    links: [
      { label: 'macOS ZIP (13 MB)', href: '/downloads/内网穿透控制台-macOS.zip', sha256: '497550b258034ede01606c13827b4d300b375101937085593ddb536c93387cfd' },
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
    title: '利润助手 v1.0',
    subtitle: '本地家庭利润记账',
    date: '2026 · RELEASE',
    node: 'Node 03',
    icon: Calculator,
    image: '/software/profit-assistant-icon.png',
    body: '围绕录入、看板、历史和设置构建的本地记账应用，数据保存在本机 SQLite 文件中，适合记录家庭利润、查看趋势和维护自定义字段。',
    status: 'Stable',
    platform: 'macOS App Bundle',
    primaryDownload: {
      label: '下载 macOS DMG (70 MB)',
      href: '/downloads/利润助手-macOS.dmg',
      sha256: 'a5f38e7824293ff101218c6c788f91a0cf4dde534e3b2fd4526db79b36cac7e5',
    },
    links: [
      { label: 'macOS ZIP (62 MB)', href: '/downloads/利润助手-macOS.zip', sha256: '43fc9b5b785bf440b6f660adb3ed900e759d04fcd841de829afa52cb32cdca90' },
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
    keywords: ['profit', '利润助手', '记账', '家庭利润', 'sqlite', 'macos', '本地应用'],
  },
  {
    key: 'next',
    title: '后续更新方向',
    subtitle: '维护与发行计划',
    date: 'NEXT ORBIT',
    node: 'Node 04',
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

export const OrbitContent: React.FC = () => {
  const [activeRelease, setActiveRelease] = useState<ReleaseKey>(() => {
    const preferredTab = window.sessionStorage.getItem('preferredOrbitTab');
    window.sessionStorage.removeItem('preferredOrbitTab');
    return preferredTab === 'tunnel' || preferredTab === 'profit' ? preferredTab : 'secretary';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredReleases = useMemo(() => {
    if (!normalizedQuery) return releases;
    return releases.filter((release) => [
      release.title,
      release.subtitle,
      release.date,
      release.body,
      release.status,
      release.platform,
      ...release.keywords,
      ...(release.scenes ?? []),
    ].join(' ').toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

  const storedActiveItem = releases.find((release) => release.key === activeRelease) ?? releases[0];
  const activeItem = filteredReleases.find((release) => release.key === storedActiveItem.key) ?? filteredReleases[0] ?? storedActiveItem;
  const ActiveIcon = activeItem.icon;
  const activeNodeIndex = Math.max(0, filteredReleases.findIndex((release) => release.key === activeItem.key));
  const activeDownloads = [
    activeItem.primaryDownload,
    ...(activeItem.links ?? []),
  ].filter((download): download is NonNullable<ReleaseItem['primaryDownload']> & { sha256: string } => Boolean(download?.sha256));

  return (
    <div className="w-full">
      <div className="mb-10">
        <div className="hud-kicker mb-4">
          <span className="hud-dot" />
          <span>ORBIT RELEASE BAY</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">软件发行</h2>
        <p className="text-lg md:text-xl text-gray-400 font-light">沿发行轨道检索、选择并下载开箱即用的本机应用。</p>
      </div>

      <div className="hud-panel mb-6 flex flex-col gap-4 rounded-3xl p-4 md:flex-row md:items-center md:justify-between">
        <label className="relative flex min-h-12 flex-1 items-center">
          <Search size={18} className="absolute left-4 text-gray-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索软件、平台、关键词..."
            className="hud-search"
          />
        </label>
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-gray-500 md:justify-end">
          <span>{filteredReleases.length} / {releases.length} Nodes</span>
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

      <div className="mb-8">
        <div className="scan-card p-5 md:p-6">
          <div className="hud-kicker mb-4">
            <span className="hud-dot" />
            <span>发行轨道时间线</span>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#020204]/35 p-4 md:p-5">
            <div className="release-orbit-line hidden md:block" />
            <div className="overflow-x-auto pb-4 [scrollbar-color:rgba(196,181,253,0.45)_rgba(255,255,255,0.06)] [scrollbar-width:thin]">
              <div className="flex min-w-max gap-4 md:min-w-0">
                {filteredReleases.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = activeItem.key === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveRelease(item.key)}
                      aria-pressed={isActive}
                      className={`group relative w-[18rem] shrink-0 pt-10 text-left md:w-1/3 ${isActive ? 'text-white' : 'text-gray-400'}`}
                    >
                      <div className="absolute left-1/2 top-0 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-[#07070b] shadow-[0_0_22px_rgba(196,181,253,0.12)] transition-transform duration-300 group-hover:scale-110">
                        <span className={`h-2.5 w-2.5 rounded-full bg-[var(--theme-color)] shadow-[0_0_16px_var(--theme-color)] transition-transform ${isActive ? 'scale-125' : 'scale-90 opacity-60'}`} />
                      </div>
                      {isActive && (
                        <div className="absolute left-1/2 top-8 h-8 w-px -translate-x-1/2 bg-gradient-to-b from-[var(--theme-color)]/70 to-transparent shadow-[0_0_18px_var(--theme-color)]" />
                      )}
                      <div className={`rounded-2xl border p-4 transition-all duration-300 ${isActive ? 'border-[var(--theme-color)]/40 bg-white/[0.055] shadow-[0_0_34px_rgba(196,181,253,0.12)]' : 'border-white/[0.06] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.04]'}`}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">{item.date}</span>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-600">{item.node || `Node ${String(index + 1).padStart(2, '0')}`}</span>
                        </div>
                        <div className="mb-3 flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                            <Icon size={18} />
                          </span>
                          <div>
                            <h3 className="text-base font-light tracking-wide text-gray-100">{item.title}</h3>
                            <div className="text-xs text-gray-500">{item.subtitle}</div>
                          </div>
                        </div>
                        <p className="line-clamp-3 text-sm font-light leading-relaxed text-gray-400">{item.body}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {filteredReleases.length === 0 && (
              <div className="flex min-h-[12rem] flex-col items-center justify-center text-center">
                <Search size={28} className="mb-4 text-gray-500" />
                <div className="hud-kicker mb-3">
                  <span className="hud-dot" />
                  <span>NO RELEASE NODE</span>
                </div>
                <p className="text-sm font-light text-gray-400">没有找到匹配的软件节点。</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative min-h-[360px]">
        <div
          className="release-detail-beam"
          style={{
            left: filteredReleases.length > 0 ? `${((activeNodeIndex + 0.5) / filteredReleases.length) * 100}%` : '50%',
          }}
        />
        <div className="hud-panel rounded-2xl p-6 mb-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-100">
                <ActiveIcon size={24} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-light tracking-wide text-gray-100">{activeItem.title}</h3>
                  <span className="hud-chip text-white">{activeItem.status}</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">{activeItem.platform}</p>
              </div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{activeItem.date}</div>
          </div>

          <p className="mb-6 max-w-3xl text-sm font-light leading-relaxed text-gray-400">{activeItem.body}</p>

          {activeItem.image && (
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <img
                src={activeItem.image}
                alt={`${activeItem.title} 图标`}
                className="h-16 w-16 rounded-2xl border border-white/10 bg-white/5 object-cover shadow-[0_0_28px_rgba(196,181,253,0.12)]"
              />
              <div>
                <div className="hud-kicker mb-2">
                  <span className="hud-dot" />
                  <span>Software Image</span>
                </div>
                <p className="text-sm font-light text-gray-400">已接入现有软件图标与本地打包下载资源。</p>
              </div>
            </div>
          )}

          {activeItem.primaryDownload && (
            <a href={activeItem.primaryDownload.href} download className="inline-flex items-center gap-3 bg-white text-black px-6 py-4 rounded-full font-medium hover:bg-gray-200 transition-colors md:px-8">
              <ArrowDownToLine size={20} />
              <span>{activeItem.primaryDownload.label}</span>
            </a>
          )}

          {activeItem.links && (
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-400">
              {activeItem.links.map((link) => (
                <a key={link.href} href={link.href} download className="hover:text-white transition-colors underline underline-offset-4">
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {activeDownloads.length > 0 && (
            <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="hud-kicker mb-3">
                <span className="hud-dot" />
                <span>SHA-256 校验</span>
              </div>
              <div className="space-y-3">
                {activeDownloads.map((download) => (
                  <div key={download.href} className="grid gap-1 text-xs text-gray-500 md:grid-cols-[12rem_1fr] md:items-start">
                    <span className="text-gray-400">{download.label.replace(/^下载\s*/, '')}</span>
                    <code className="break-all rounded-lg bg-black/25 px-2 py-1 font-mono text-[11px] leading-relaxed text-gray-300">
                      {download.sha256}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {activeItem.specs && (
          <>
            <h3 className="text-xl text-gray-200 font-light mb-6">系统要求</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activeItem.specs.map((spec) => {
                const Icon = spec.icon;
                return (
                  <div key={spec.label} className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <Icon size={20} className="text-gray-400 mb-2" />
                    <div className="text-sm text-gray-400 mb-1">{spec.label}</div>
                    <div className="text-sm text-gray-200">{spec.value}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeItem.scenes && (
          <>
            <h3 className="text-xl text-gray-200 font-light mb-6">节点说明</h3>
            <ul className="space-y-4 text-gray-300 font-light">
              {activeItem.scenes.map((scene) => (
                <li key={scene} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--theme-color)] shadow-[0_0_12px_var(--theme-color)]" />
                  <span>{scene}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
