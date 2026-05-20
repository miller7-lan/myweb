import React, { useEffect } from 'react';
import { useGalaxyStore, type NonNullThemeKey } from '../../store/useGalaxyStore';
import { themes } from '../../data/themes';

export const UIOverlay: React.FC = () => {
  const { viewState, hoveredPlanet, visitedThemes, visitSequence, lastVisitedTheme, completionPulseId, setViewState, setHoveredPlanet, setActiveTheme } = useGalaxyStore();
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (viewState !== 'HOME' && viewState !== 'HOVER_PLANET') return;
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      if (isTyping) return;

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
  }, [hoveredPlanet, setActiveTheme, setHoveredPlanet, setViewState, themeList, viewState]);

  return (
    <div className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
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
    </div>
  );
};

const themeListLength = (visitedThemes: Partial<Record<keyof typeof themes, boolean>>) =>
  Object.values(visitedThemes).filter(Boolean).length;
