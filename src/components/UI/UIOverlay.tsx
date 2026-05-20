import React, { useEffect, useState } from 'react';
import { Gauge, Moon, Sparkles, type LucideIcon } from 'lucide-react';
import { useGalaxyStore, type NonNullThemeKey, type VisualMode } from '../../store/useGalaxyStore';
import { themes } from '../../data/themes';

const announcements = [
  {
    code: 'SEC-LOCK',
    title: '公网安全加固',
    detail: '联系表单加入限流、来源校验和安全响应头。',
  },
  {
    code: 'RELEASE',
    title: '下载校验上线',
    detail: '软件发行页新增 SHA-256，方便核对安装包。',
  },
  {
    code: 'METEOR',
    title: '流星冲击优化',
    detail: '多流星命中时波纹改为叠加扩散，不再硬刷新。',
  },
];

const visualModes: Array<{
  key: VisualMode;
  label: string;
  title: string;
  Icon: LucideIcon;
}> = [
  { key: 'cinematic', label: 'Cine', title: 'Cinematic · 全效', Icon: Sparkles },
  { key: 'focus', label: 'Focus', title: 'Focus · 清晰', Icon: Gauge },
  { key: 'silent', label: 'Silent', title: 'Silent · 低功耗', Icon: Moon },
];

export const UIOverlay: React.FC = () => {
  const { viewState, hoveredPlanet, visitedThemes, visitSequence, lastVisitedTheme, completionPulseId, visualMode, setVisualMode, setViewState, setHoveredPlanet, setActiveTheme } = useGalaxyStore();
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const isVisible = viewState === 'HOME' || viewState === 'HOVER_PLANET';
  const focusedTheme = hoveredPlanet ? themes[hoveredPlanet] : null;
  const lastVisited = lastVisitedTheme ? themes[lastVisitedTheme] : null;
  const visitedCount = themeListLength(visitedThemes);
  const isComplete = visitedCount === 5;
  const hudThemeColor = focusedTheme?.color ?? (isComplete ? '#f8fafc' : lastVisited?.color) ?? '#e2e8f0';
  const focusedThemeKey = focusedTheme?.key as NonNullThemeKey | undefined;
  const hudTitle = focusedTheme && focusedThemeKey
    ? visitedThemes[focusedThemeKey] ? 'SIGNAL RELOCKED' : 'SIGNAL LOCKED'
    : completionPulseId > 0 && isComplete
      ? 'GALAXY MAP COMPLETE'
      : lastVisited
        ? 'LAST MODULE VISITED'
        : 'SELECT A SIGNAL';
  const hudText = focusedTheme && focusedThemeKey
    ? `${focusedTheme.subtitle} · ${focusedTheme.chineseName} · ${visitedThemes[focusedThemeKey] ? 'VISITED' : 'LOCKED'}`
    : completionPulseId > 0 && isComplete
      ? `ALL FIVE MODULES ONLINE · ${visitSequence.length}/5`
      : lastVisited
        ? `${lastVisited.title} · ${lastVisited.chineseName} · ${visitedCount}/5 MODULES SYNCED`
        : 'ORBITING FIVE MODULES · 点击星球或导航进入档案';
  const mobileLabels: Record<string, string> = {
    identity: 'ID',
    creations: 'WORK',
    stack: 'STACK',
    orbit: 'ORBIT',
    signal: 'SIG',
  };
  const themeList = Object.values(themes);
  const activeVisualMode = visualModes.find((mode) => mode.key === visualMode) ?? visualModes[0];
  const ActiveVisualModeIcon = activeVisualMode.Icon;
  const cycleVisualMode = () => {
    const currentIndex = visualModes.findIndex((mode) => mode.key === visualMode);
    const nextMode = visualModes[(currentIndex + 1) % visualModes.length];
    setVisualMode(nextMode.key);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (viewState !== 'HOME' && viewState !== 'HOVER_PLANET') return;
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      if (isTyping) return;

      if (event.key === 'Escape' && announcementOpen) {
        event.preventDefault();
        setAnnouncementOpen(false);
        return;
      }

      const currentIndex = hoveredPlanet ? themeList.findIndex((theme) => theme.key === hoveredPlanet) : -1;
      const lockTheme = (index: number) => {
        const theme = themeList[(index + themeList.length) % themeList.length];
        setHoveredPlanet(theme.key);
        setViewState('HOVER_PLANET');
      };

      if (/^[1-5]$/.test(event.key)) {
        event.preventDefault();
        lockTheme(Number(event.key) - 1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        lockTheme(currentIndex + 1);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        lockTheme(currentIndex <= 0 ? themeList.length - 1 : currentIndex - 1);
        return;
      }

      if (event.key === 'Enter' && hoveredPlanet) {
        event.preventDefault();
        setViewState('ENTERING_THEME');
        setActiveTheme(hoveredPlanet);
      }

      if (event.key === 'Escape' && hoveredPlanet) {
        event.preventDefault();
        setHoveredPlanet(null);
        setViewState('HOME');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [announcementOpen, hoveredPlanet, setActiveTheme, setHoveredPlanet, setViewState, themeList, viewState]);

  return (
    <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${announcementOpen ? 'z-[140]' : 'z-10'} ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <nav className="absolute top-0 left-0 hidden w-full p-8 md:flex justify-center pointer-events-auto">
        <ul className="hud-panel flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-full px-3 py-2 md:gap-2 md:px-4">
          {themeList.map(theme => {
            const themeKey = theme.key as NonNullThemeKey;
            const visited = Boolean(visitedThemes[themeKey]);
            const isLastVisited = lastVisitedTheme === theme.key && !hoveredPlanet;

            return (
            <li key={theme.key}>
              <button
                onClick={() => {
                  setViewState('ENTERING_THEME');
                  setActiveTheme(themeKey);
                }}
                onPointerEnter={() => {
                  if (viewState === 'HOME' || viewState === 'HOVER_PLANET') {
                    setHoveredPlanet(themeKey);
                    setViewState('HOVER_PLANET');
                  }
                }}
                onPointerLeave={() => {
                  if (hoveredPlanet === theme.key) {
                    setHoveredPlanet(null);
                    if (viewState === 'HOVER_PLANET') setViewState('HOME');
                  }
                }}
                onFocus={() => {
                  if (viewState === 'HOME' || viewState === 'HOVER_PLANET') {
                    setHoveredPlanet(themeKey);
                    setViewState('HOVER_PLANET');
                  }
                }}
                onBlur={() => {
                  if (hoveredPlanet === theme.key) {
                    setHoveredPlanet(null);
                    if (viewState === 'HOVER_PLANET') setViewState('HOME');
                  }
                }}
                className={`group relative flex items-center gap-2 rounded-full px-3 py-2 text-gray-400 transition-all duration-300 hover:text-white focus:outline-none focus-visible:text-white md:px-5 ${hoveredPlanet === themeKey || isLastVisited ? 'nav-lock text-white' : 'hover:bg-white/[0.035]'}`}
                style={{
                  ['--theme-color' as string]: theme.color,
                }}
              >
                <span
                  className={`hud-dot transition-all duration-300 ${hoveredPlanet === themeKey || isLastVisited ? 'opacity-100 scale-110' : visited ? 'opacity-75' : 'opacity-45 group-hover:opacity-100'}`}
                />
                <span className="uppercase tracking-[0.2em] text-[10px] md:text-xs font-medium whitespace-nowrap">{theme.title}</span>
                <span className="opacity-45 text-[10px] font-normal tracking-widest">|</span>
                <span className="tracking-widest text-[10px] md:text-xs font-medium whitespace-nowrap">{theme.chineseName}</span>
                <span className={`text-[9px] uppercase tracking-[0.18em] transition-opacity ${visited ? 'opacity-70' : 'opacity-0'}`}>Visited</span>
                <span className={`absolute left-4 right-4 -bottom-px h-px bg-[var(--theme-color)] shadow-[0_0_12px_var(--theme-color)] transition-opacity duration-300 ${hoveredPlanet === themeKey || isLastVisited ? 'opacity-100' : visited ? 'opacity-45' : 'opacity-0 group-hover:opacity-70'}`} />
                <span className={`absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-color)] to-transparent transition-opacity duration-300 ${hoveredPlanet === themeKey || isLastVisited ? 'opacity-70' : 'opacity-0 group-hover:opacity-40'}`} />
              </button>
            </li>
          );
          })}
        </ul>
      </nav>

      <nav className="absolute bottom-4 left-0 flex w-full justify-center px-4 pointer-events-auto md:hidden">
        <ul className="hud-panel grid w-full max-w-[24rem] grid-cols-5 gap-1 rounded-3xl px-2 py-2">
          {themeList.map(theme => {
            const themeKey = theme.key as NonNullThemeKey;
            const visited = Boolean(visitedThemes[themeKey]);
            const isLastVisited = lastVisitedTheme === theme.key && !hoveredPlanet;

            return (
            <li key={theme.key}>
              <button
                onClick={() => {
                  setViewState('ENTERING_THEME');
                  setActiveTheme(themeKey);
                }}
                onPointerEnter={() => {
                  if (viewState === 'HOME' || viewState === 'HOVER_PLANET') {
                    setHoveredPlanet(themeKey);
                    setViewState('HOVER_PLANET');
                  }
                }}
                onPointerLeave={() => {
                  if (hoveredPlanet === theme.key) {
                    setHoveredPlanet(null);
                    if (viewState === 'HOVER_PLANET') setViewState('HOME');
                  }
                }}
                className={`group flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 text-gray-400 transition-all duration-300 hover:text-white focus:outline-none focus-visible:text-white ${hoveredPlanet === themeKey || isLastVisited ? 'nav-lock text-white' : ''}`}
                style={{ ['--theme-color' as string]: theme.color }}
                aria-label={`${theme.title} | ${theme.chineseName}`}
              >
                <span className={`hud-dot transition-all duration-300 ${hoveredPlanet === themeKey || isLastVisited ? 'opacity-100 scale-125' : visited ? 'opacity-80' : 'opacity-55 group-hover:opacity-100'}`} />
                <span className="max-w-full truncate text-[9px] font-medium uppercase tracking-[0.1em]">{mobileLabels[String(theme.key)] ?? theme.label}</span>
                <span className="text-[10px] tracking-wider text-gray-500 group-hover:text-gray-300">{visited ? '已访' : theme.chineseName}</span>
              </button>
            </li>
          );
          })}
        </ul>
      </nav>

      <button
        type="button"
        onClick={cycleVisualMode}
        className="hud-panel group pointer-events-auto absolute left-4 top-4 flex h-10 items-center gap-2 rounded-full px-3 text-gray-500 opacity-45 transition-all duration-300 hover:opacity-100 hover:text-gray-200 focus:outline-none focus-visible:opacity-100 focus-visible:text-white md:left-8 md:top-28"
        style={{
          ['--theme-color' as string]: hudThemeColor,
          ['--hud-x' as string]: '12%',
          ['--hud-y' as string]: '18%',
        }}
        aria-label={`视觉模式：${activeVisualMode.title}，点击切换`}
        title={`${activeVisualMode.title} · 点击切换`}
      >
        <ActiveVisualModeIcon size={14} />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[10px] uppercase tracking-[0.16em] opacity-0 transition-all duration-300 group-hover:max-w-16 group-hover:opacity-100 group-focus-visible:max-w-16 group-focus-visible:opacity-100">
          {activeVisualMode.label}
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--theme-color)] opacity-60 shadow-[0_0_8px_var(--theme-color)]" />
      </button>

      <div className="absolute bottom-[6rem] left-1/2 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 text-center md:bottom-8 md:left-8 md:w-auto md:translate-x-0 md:text-left">
        <div
          className="hud-panel inline-flex flex-col items-center rounded-2xl px-5 py-3 transition-all duration-500 md:items-start"
          style={{
            ['--theme-color' as string]: hudThemeColor,
          }}
        >
          <div className="hud-kicker">
            <span className="hud-dot" />
            <span>{hudTitle}</span>
          </div>
          <p className="mt-2 text-xs font-light tracking-[0.18em] text-gray-400">
            {hudText}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAnnouncementOpen((open) => !open)}
        className="hud-panel pointer-events-auto absolute right-4 top-4 flex items-center gap-2 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-gray-500 transition-all duration-300 hover:-translate-y-0.5 hover:text-gray-200 focus:outline-none focus-visible:text-white md:right-8 md:top-28"
        style={{
          ['--theme-color' as string]: hudThemeColor,
        }}
        aria-expanded={announcementOpen}
        aria-label="打开最近更新公告"
      >
        <span className="hud-dot scale-75 opacity-70" />
        <span>公告</span>
      </button>

      {announcementOpen && (
        <div
          className="pointer-events-auto absolute inset-0 z-[150] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label="最近更新公告"
          onClick={() => setAnnouncementOpen(false)}
        >
          <div
            className="hud-panel relative z-[160] w-[min(34rem,calc(100vw-2rem))] rounded-[1.75rem] px-5 py-5 shadow-[0_0_80px_color-mix(in_srgb,var(--theme-color)_12%,transparent)] md:px-6 md:py-6"
            style={{
              ['--theme-color' as string]: hudThemeColor,
              ['--hud-x' as string]: '86%',
              ['--hud-y' as string]: '10%',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAnnouncementOpen(false)}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-xs text-gray-500 transition-colors hover:text-white"
              aria-label="关闭公告"
            >
              ×
            </button>

            <div className="relative z-10">
              <div className="mb-5 flex items-start justify-between gap-5 pr-9">
                <div>
                  <div className="hud-kicker mb-3">
                    <span className="hud-dot" />
                    <span>Software Update</span>
                  </div>
                  <h2 className="text-2xl font-light tracking-wide text-gray-100 md:text-3xl">DAZZLE 更新说明</h2>
                  <p className="mt-2 text-sm font-light leading-relaxed text-gray-500">版本 2026.05.20 · 公网发布准备</p>
                </div>
                <span className="mt-1 hidden rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-gray-400 sm:inline-flex">
                  Ready
                </span>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/20">
                {announcements.map((item, index) => (
                  <div key={item.code} className={`grid grid-cols-[2.5rem_1fr] gap-3 px-4 py-4 text-left ${index > 0 ? 'border-t border-white/[0.06]' : ''}`}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-[10px] font-medium tracking-wider text-gray-300">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-light tracking-wide text-gray-100">{item.title}</span>
                        <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-gray-500">{item.code}</span>
                      </div>
                      <p className="text-xs font-light leading-relaxed text-gray-500 md:text-sm">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
                  Recent Update · Live
                </div>
                <button
                  type="button"
                  onClick={() => setAnnouncementOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-light tracking-[0.12em] text-gray-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const themeListLength = (visitedThemes: Partial<Record<keyof typeof themes, boolean>>) =>
  Object.values(visitedThemes).filter(Boolean).length;
