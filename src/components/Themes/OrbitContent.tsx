import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownToLine, CheckCircle2, Search, X } from 'lucide-react';
import { isReleaseKey, releases, type ReleaseDownload, type ReleaseKey } from '../../data/releases';

type DownloadNotice = {
  label: string;
  releaseTitle: string;
};

const normalizeSearch = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const searchTokens = (value: string) => normalizeSearch(value).split(/\s+/).filter(Boolean);

export const OrbitContent: React.FC = () => {
  const [activeRelease, setActiveRelease] = useState<ReleaseKey>(() => {
    const preferredTab = window.sessionStorage.getItem('preferredOrbitTab');
    window.sessionStorage.removeItem('preferredOrbitTab');
    return preferredTab && isReleaseKey(preferredTab) ? preferredTab : 'secretary';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, number>>({});
  const [eccentricity, setEccentricity] = useState(1.0);
  const [downloadNotice, setDownloadNotice] = useState<DownloadNotice | null>(null);

  useEffect(() => {
    const handleGuideOpen = (event: WindowEventMap['galaxy-guide-open']) => {
      const action = event.detail.target.openAction;
      if (action?.type !== 'select-release') return;
      if (isReleaseKey(action.value)) {
        setSearchQuery('');
        setActiveRelease(action.value);
      }
    };

    window.addEventListener('galaxy-guide-open', handleGuideOpen);
    return () => window.removeEventListener('galaxy-guide-open', handleGuideOpen);
  }, []);

  useEffect(() => {
    if (!downloadNotice) return;
    const timer = window.setTimeout(() => setDownloadNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [downloadNotice]);

  const runOrbitPing = () => {
    setIsScanning(true);
    setPingResults({});
    
    releases.forEach((release, index) => {
      setTimeout(() => {
        setPingResults(prev => ({
          ...prev,
          [release.key]: Math.floor(12 + Math.random() * 24)
        }));
        if (index === releases.length - 1) {
          setIsScanning(false);
        }
      }, (index + 1) * 600);
    });
  };

  const showDownloadNotice = (download: { label: string }) => {
    setDownloadNotice({
      label: download.label.replace(/^下载\s*/, ''),
      releaseTitle: activeItem.title,
    });
  };


  const normalizedQuery = normalizeSearch(searchQuery);
  const normalizedQueryTokens = useMemo(() => searchTokens(searchQuery), [searchQuery]);
  const filteredReleases = useMemo(() => {
    if (!normalizedQuery) return releases;
    return releases.filter((release) => {
      const haystack = [
        release.title,
        release.subtitle,
        release.date,
        release.body,
        release.status,
        release.platform,
        release.primaryDownload?.label ?? '',
        ...(release.links ?? []).map((link) => link.label),
        ...(release.screenshots ?? []).flatMap((screenshot) => [screenshot.alt, screenshot.caption]),
        ...release.keywords,
        ...(release.scenes ?? []),
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedQuery) || normalizedQueryTokens.every((token) => haystack.includes(token));
    });
  }, [normalizedQuery, normalizedQueryTokens]);

  const storedActiveItem = releases.find((release) => release.key === activeRelease) ?? releases[0];
  const activeItem = filteredReleases.find((release) => release.key === storedActiveItem.key) ?? filteredReleases[0] ?? storedActiveItem;
  const ActiveIcon = activeItem.icon;
  const activeNodeIndex = Math.max(0, filteredReleases.findIndex((release) => release.key === activeItem.key));
  const activeDownloads = [
    activeItem.primaryDownload,
    ...(activeItem.links ?? []),
  ].filter((download): download is ReleaseDownload & { sha256: string } => Boolean(download?.sha256));

  return (
    <div className="w-full">
      {downloadNotice && createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[150] flex justify-center px-4">
          <div
            className="download-thanks-panel pointer-events-auto hud-panel flex w-full max-w-md items-start gap-3 rounded-2xl p-4"
            style={{ ['--theme-color' as string]: '#a78bfa' }}
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--theme-color)]/25 bg-[var(--theme-color)]/10 text-[var(--theme-color)]">
              <CheckCircle2 size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="hud-kicker mb-1">
                <span className="hud-dot" />
                <span>Download Started</span>
              </div>
              <div className="text-base font-light tracking-wide text-white">感谢下载</div>
              <p className="mt-1 text-sm font-light leading-relaxed text-gray-400">
                {downloadNotice.releaseTitle} · {downloadNotice.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDownloadNotice(null)}
              aria-label="关闭下载提示"
              className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-gray-500 transition-colors hover:border-white/20 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>,
        document.body
      )}

      <div className="mb-10">
        <div className="hud-kicker mb-4">
          <span className="hud-dot" />
          <span>ORBIT RELEASE BAY</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">软件发行</h2>
        <p className="text-lg md:text-xl text-gray-400 font-light">沿发行轨道检索、选择并下载开箱即用的本机应用。</p>
      </div>

      <div className="hud-panel mb-6 flex flex-col gap-4 rounded-3xl p-4 md:flex-row md:items-center md:justify-between" data-guide-id="orbit-search">
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
                      data-guide-id={`release-${item.key}`}
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
        <div className="hud-panel rounded-2xl p-6 mb-8" data-guide-id={`release-${activeItem.key}-detail`}>
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

          {activeItem.primaryDownload && (
            <a
              href={activeItem.primaryDownload.href}
              download
              onClick={() => showDownloadNotice(activeItem.primaryDownload!)}
              className="inline-flex items-center gap-3 bg-white text-black px-6 py-4 rounded-full font-medium hover:bg-gray-200 transition-colors md:px-8"
              data-guide-id="release-download-primary"
            >
              <ArrowDownToLine size={20} />
              <span>{activeItem.primaryDownload.label}</span>
            </a>
          )}

          {activeItem.links && (
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-400">
              {activeItem.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  download
                  onClick={() => showDownloadNotice(link)}
                  className="hover:text-white transition-colors underline underline-offset-4"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {activeDownloads.length > 0 && (
            <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4" data-guide-id="release-checksum">
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

        {activeItem.screenshots && (
          <div className="mb-8" data-guide-id="release-preview">
            <h3 className="mb-6 text-xl font-light text-gray-200">应用预览</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {activeItem.screenshots.map((screenshot) => (
                <figure
                  key={screenshot.src}
                  className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#05070d]/72 shadow-[0_18px_70px_rgba(0,0,0,0.34)]"
                >
                  <div className="relative aspect-[16/10] bg-[radial-gradient(circle_at_50%_0%,rgba(196,181,253,0.10),transparent_44%),rgba(255,255,255,0.025)] p-3">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.025] to-black/20" />
                    <img
                      src={screenshot.src}
                      alt={screenshot.alt}
                      loading="lazy"
                      className="relative h-full w-full rounded-lg border border-white/[0.08] object-contain object-top opacity-85 brightness-[0.78] contrast-[1.04] saturate-[0.82]"
                    />
                  </div>
                  <figcaption className="border-t border-white/[0.06] px-4 py-3 text-xs font-light tracking-wide text-gray-400">
                    {screenshot.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        {activeItem.specs && (
          <div data-guide-id="release-specs">
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
          </div>
        )}

        {activeItem.scenes && (
          <div data-guide-id="release-scenes">
            <h3 className="text-xl text-gray-200 font-light mb-6">节点说明</h3>
            <ul className="space-y-4 text-gray-300 font-light">
              {activeItem.scenes.map((scene) => (
                <li key={scene} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--theme-color)] shadow-[0_0_12px_var(--theme-color)]" />
                  <span>{scene}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Orbit Diagnostics and Gravitational Calibration Control */}
        <div className="hud-panel rounded-3xl p-6 mt-8 relative overflow-hidden" data-guide-id="release-diagnostics">
          {/* Subtle radar circular line animations when scanning */}
          {isScanning && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-[var(--theme-color,#93c5fd)]/10 animate-[ping_1.6s_infinite] pointer-events-none" />
          )}
          
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="hud-kicker mb-2">
                <span className={`hud-dot ${isScanning ? 'bg-[var(--theme-color,#93c5fd)] shadow-[0_0_12px_var(--theme-color,#93c5fd)] animate-pulse' : 'bg-gray-600'}`} />
                <span>ORBIT DIAGNOSTICS CONTROL</span>
              </div>
              <h3 className="text-xl font-light text-white tracking-wide">轨道通信诊断与引力标定</h3>
            </div>
            
            <button
              type="button"
              onClick={runOrbitPing}
              disabled={isScanning}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 font-medium text-xs text-gray-200 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed select-none"
            >
              <span>{isScanning ? '扫描中 (SCANNING...)' : '测试发行轨道通信 (PING ORBITS)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Communication Latency Ping Results */}
            <div className="rounded-2xl border border-white/[0.05] bg-black/25 p-5 space-y-3.5">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-500 font-mono">
                <span>Node Communication Status</span>
                <span>Latency</span>
              </div>
              
              <div className="space-y-2.5 font-mono text-xs">
                {releases.map((node) => {
                  const ping = pingResults[node.key];
                  const hasPinged = ping !== undefined;
                  return (
                    <div key={node.key} className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.015] border border-white/[0.03]">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-light truncate">{node.title} ({node.node})</span>
                        {isScanning && ping === undefined ? (
                          <span className="text-[var(--theme-color,#93c5fd)] animate-pulse tracking-widest text-[10px]">SCANNING...</span>
                        ) : hasPinged ? (
                          <span className={`font-semibold text-[10px] ${ping < 20 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {ping} ms (STABLE)
                          </span>
                        ) : (
                          <span className="text-gray-600 text-[10px]">STANDBY</span>
                        )}
                      </div>
                      <div className="h-1 w-full bg-white/[0.03] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-gray-500 to-[var(--theme-color,#93c5fd)] transition-all duration-500"
                          style={{ 
                            width: isScanning && ping === undefined 
                              ? '45%' 
                              : hasPinged 
                                ? `${Math.max(10, Math.min(100, 100 - (ping / 150) * 100))}%` 
                                : '0%' 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gravity Alignment Simulator Slider */}
            <div className="rounded-2xl border border-white/[0.05] bg-black/25 p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2">
                  <span>Gravitational Calibrator</span>
                  <span className="text-gray-300 font-semibold">{eccentricity.toFixed(2)} G</span>
                </div>
                <p className="text-xs text-gray-400 font-light leading-relaxed mb-4">
                  调整滑块以微调主轨道的重力波形参数。实时计算轨道偏心率（Eccentricity）与偏转安全指数。
                </p>
              </div>

              {/* Custom SVG visualization warped by eccentricity value */}
              <div className="relative h-24 rounded-xl bg-black/40 border border-white/[0.03] flex items-center justify-center overflow-hidden mb-4 select-none">
                <svg className="w-full h-full opacity-60 animate-[pulse_6s_infinite]" viewBox="0 0 200 100">
                  {/* Orbit oval */}
                  <ellipse 
                    cx="100" 
                    cy="50" 
                    rx={Math.max(20, 60 * (1.5 - (eccentricity - 1) * 0.4))}
                    ry={Math.max(10, 30 * (1 - (eccentricity - 1) * 0.3))}
                    fill="none" 
                    stroke="var(--theme-color, #93c5fd)" 
                    strokeWidth="1" 
                    strokeDasharray="4 3"
                    className="transition-all duration-300 origin-center"
                    style={{ transform: `rotate(${(eccentricity - 1) * 30}deg)` }}
                  />
                  {/* Central Star */}
                  <circle cx="100" cy="50" r="4" fill="#ffffff" />
                  {/* Planetary dot */}
                  <circle 
                    cx={100 + 40 * Math.sin(eccentricity * Math.PI)} 
                    cy={50 + 20 * Math.cos(eccentricity * Math.PI)} 
                    r="2.5" 
                    fill="var(--theme-color, #93c5fd)" 
                  />
                </svg>
                <div className="absolute bottom-2 left-2 text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                  Orbit Ellipse Shape: {eccentricity === 1 ? 'Circular' : eccentricity > 1.2 ? 'Hyperbolic' : 'Elliptical'}
                </div>
              </div>

              {/* Gravity Range Input */}
              <div className="space-y-2">
                <input 
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={eccentricity}
                  onChange={(e) => setEccentricity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between items-center text-[9px] font-mono text-gray-500">
                  <span>0.5G (LOW GRAVITY)</span>
                  <span className="text-gray-400">NORMAL (1.0G)</span>
                  <span>1.5G (CRITICAL)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
