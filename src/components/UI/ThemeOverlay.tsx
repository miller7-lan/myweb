import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useGalaxyStore, type NonNullThemeKey, type ThemeKey } from '../../store/useGalaxyStore';
import { themes } from '../../data/themes';
import { openTheme } from '../../utils/themeNavigation';
import { useCappedScroll } from '../../utils/cappedScroll';
import { ArrowLeft } from 'lucide-react';
import gsap from 'gsap';

const themeContentLoaders: Record<NonNullThemeKey, () => Promise<{ default: React.FC }>> = {
  identity: () => import('../Themes/IdentityContent').then((module) => ({ default: module.IdentityContent })),
  creations: () => import('../Themes/CreationsContent').then((module) => ({ default: module.CreationsContent })),
  stack: () => import('../Themes/StackContent').then((module) => ({ default: module.StackContent })),
  orbit: () => import('../Themes/OrbitContent').then((module) => ({ default: module.OrbitContent })),
  signal: () => import('../Themes/SignalContent').then((module) => ({ default: module.SignalContent })),
};

// One request per page, shared by the preload below and React.lazy.
const themeContentRequests: Partial<Record<NonNullThemeKey, Promise<{ default: React.FC }>>> = {};
const loadThemeContent = (key: NonNullThemeKey) => (themeContentRequests[key] ??= themeContentLoaders[key]());

const themeContentModules = Object.fromEntries(
  (Object.keys(themeContentLoaders) as NonNullThemeKey[]).map((key) => [key, lazy(() => loadThemeContent(key))]),
) as Record<NonNullThemeKey, React.LazyExoticComponent<React.FC>>;

type Rect = { x: number; y: number; w: number; h: number };

/*
 * Bottom module switcher with a liquid selection pill (a first try at the
 * "droplets merging" idea): on a switch the pill pours from the old tab into
 * the new one. Two blobs under a goo filter (blur + alpha threshold) fuse into
 * one stretched drop while travelling, then the old one pinches off.
 */
const ThemeSwitcher: React.FC<{ activeTheme: ThemeKey; viewState: string; visitedThemes: Record<string, boolean> }> = ({
  activeTheme,
  viewState,
  visitedThemes,
}) => {
  const itemRefs = useRef<Partial<Record<NonNullThemeKey, HTMLButtonElement | null>>>({});
  const tailRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef(0);
  const pouringRef = useRef(false);

  const rectOf = (key: NonNullThemeKey): Rect | null => {
    const item = itemRefs.current[key];
    return item ? { x: item.offsetLeft, y: item.offsetTop, w: item.offsetWidth, h: item.offsetHeight } : null;
  };

  const paint = (blob: HTMLSpanElement | null, rect: Rect, scale = 1) => {
    if (!blob) return;
    blob.style.width = `${rect.w}px`;
    blob.style.height = `${rect.h}px`;
    blob.style.transform = `translate(${rect.x}px, ${rect.y}px) scale(${scale})`;
  };

  const settle = useCallback(() => {
    if (!activeTheme || pouringRef.current) return;
    const rect = rectOf(activeTheme);
    if (!rect) return;
    paint(headRef.current, rect);
    paint(tailRef.current, rect, 0);
  }, [activeTheme]);

  useLayoutEffect(() => {
    settle();
    window.addEventListener('resize', settle);
    return () => window.removeEventListener('resize', settle);
  }, [settle]);

  useEffect(() => () => window.cancelAnimationFrame(frameRef.current), []);

  const pourTo = (key: NonNullThemeKey) => {
    const from = activeTheme ? rectOf(activeTheme) : null;
    const to = rectOf(key);
    if (!from || !to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.cancelAnimationFrame(frameRef.current);
    pouringRef.current = true;

    // Spring on the head's position, iOS-soft: one small overshoot.
    const stiffness = 320;
    const damping = 28;
    let x = from.x;
    let velocity = 0;
    let last = 0;
    let started = 0;

    const step = (now: number) => {
      if (!started) {
        started = now;
        last = now;
      }
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      velocity += (-stiffness * (x - to.x) - damping * velocity) * dt;
      x += velocity * dt;
      const travelled = Math.min(1, Math.abs(x - from.x) / Math.max(1, Math.abs(to.x - from.x)));
      // Stretch along the motion while it moves fast, thinner as it stretches.
      const stretch = Math.min(0.35, Math.abs(velocity) / 2400);
      const w = from.w + (to.w - from.w) * travelled;
      const h = from.h + (to.h - from.h) * travelled;
      paint(headRef.current, { x: x - (w * stretch) / 2, y: from.y + (to.y - from.y) * travelled, w: w * (1 + stretch), h: h * (1 - stretch * 0.35) });
      // The drop it leaves behind shrinks and pinches off.
      const left = Math.max(0, 1 - (now - started) / 280);
      paint(tailRef.current, from, left);
      if (Math.abs(x - to.x) > 0.3 || Math.abs(velocity) > 4 || left > 0) {
        frameRef.current = window.requestAnimationFrame(step);
      } else {
        pouringRef.current = false;
        paint(headRef.current, to);
      }
    };
    frameRef.current = window.requestAnimationFrame(step);
  };

  return (
    <nav className="theme-switcher pointer-events-auto" aria-label="切换模块">
      <svg className="theme-switcher-goo-defs" aria-hidden="true" width="0" height="0">
        <filter id="theme-switcher-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
        </filter>
      </svg>
      <span className="theme-switcher-liquid" aria-hidden="true">
        <span ref={tailRef} className="theme-switcher-blob" />
        <span ref={headRef} className="theme-switcher-blob" />
      </span>
      {Object.values(themes).map((item) => {
        const key = item.key as NonNullThemeKey;
        const current = key === activeTheme;
        return (
          <button
            key={key}
            ref={(node) => {
              itemRefs.current[key] = node;
            }}
            type="button"
            className={`theme-switcher-item ${current ? 'is-current' : ''} ${visitedThemes[key] ? 'is-visited' : ''}`}
            style={{ ['--theme-color' as string]: item.color }}
            aria-current={current ? 'page' : undefined}
            disabled={viewState !== 'THEME'}
            onClick={() => {
              if (current) return;
              pourTo(key);
              void openTheme(key);
            }}
          >
            <span className="theme-switcher-dot" aria-hidden="true" />
            <span>{item.chineseName}</span>
          </button>
        );
      })}
    </nav>
  );
};

export const ThemeOverlay: React.FC = () => {
  const { viewState, activeTheme, visitedThemes, setViewState } = useGalaxyStore();
  const theme = activeTheme ? themes[activeTheme] : null;
  const scanLabels: Record<string, string> = {
    identity: 'Identity Core Online',
    creations: 'Archive Linked',
    stack: 'Stack Matrix Synced',
    orbit: 'Release Orbit Synced',
    signal: 'Signal Channel Open',
  };

  // We show the theme overlay visually when in THEME or LEAVING_THEME state
  const isVisible = viewState === 'THEME' || viewState === 'LEAVING_THEME';
  const scrollRef = useRef<HTMLDivElement>(null);
  useCappedScroll(scrollRef, isVisible && Boolean(theme));
  
  const handleReturn = () => {
    if (viewState !== 'THEME') return;
    setViewState('LEAVING_THEME');
    // The GalaxyScene handles the 3D transition.
    // Once LEAVING_THEME is done, it will reset to HOME and activeTheme to null.
  };

  // Fetch the page while the black hole plays, so it is there when the hole bursts open.
  useEffect(() => {
    if (viewState === 'ENTERING_THEME' && activeTheme) void loadThemeContent(activeTheme);
  }, [viewState, activeTheme]);

  useEffect(() => {
    if (viewState === 'THEME') {
      // The black-hole transition reveals the page, so the backdrop is there at once.
      gsap.set('.theme-backdrop', { opacity: 1 });

      gsap.fromTo('.theme-scan-intro',
        { opacity: 0 },
        { opacity: 1, duration: 0.18, ease: 'power2.out' }
      );

      gsap.to('.theme-scan-intro', {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.inOut',
        delay: 0.95
      });
      
      gsap.fromTo('.theme-content', 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: 0.05 }
      );
    }
    // Leaving needs no fade here: the black-hole transition closes over the
    // page and hides it (PortalTransition.tsx).
  }, [viewState]);

  if (!isVisible || !theme) return null;

  const ActiveThemeContent = activeTheme ? themeContentModules[activeTheme] : null;

  return (
    <div
      className="theme-shell absolute inset-0 pointer-events-none z-20 flex flex-col"
      style={{ ['--theme-color' as string]: theme.color }}
    >
      {/* Background Dimmer & Blur */}
      <div className="theme-backdrop absolute inset-0 bg-[#020204]/75 backdrop-blur-2xl opacity-0 pointer-events-auto">
        <div className="theme-grid-backdrop" />
        <div className="theme-orb right-[12%] top-[18%] h-56 w-56" />
        <div className="theme-orb bottom-[10%] left-[8%] h-72 w-72 opacity-[0.07]" />
      </div>

      <div className="theme-scan-intro absolute inset-0 z-40 flex items-center justify-center opacity-0 pointer-events-none">
        <div className="relative rounded-full border border-white/[0.08] bg-[#020204]/70 px-5 py-2 text-xs uppercase tracking-[0.28em] text-gray-300 backdrop-blur-md">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--theme-color)] shadow-[0_0_14px_var(--theme-color)]" />
          {scanLabels[String(activeTheme)] ?? 'Signal Locked'}
        </div>
      </div>
      
      {/* Sticky glass bar: return on the left, current module in the middle. */}
      <div className="theme-toolbar absolute top-0 left-0 w-full z-50 pointer-events-none">
        <div className="theme-bar pointer-events-auto">
          <button
            type="button"
            onClick={handleReturn}
            className="theme-return group"
            aria-label="返回星图"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>星图</span>
          </button>
          <div className="theme-location theme-content">
            <span className="hud-dot" />
            <span className="theme-location-zh">{theme.chineseName}</span>
            <span className="theme-location-en">{theme.title}</span>
          </div>
          <span className="theme-bar-spacer" aria-hidden="true" />
        </div>
      </div>

      {/* Module switcher: jump to a sibling module without going back to the galaxy first. */}
      <ThemeSwitcher activeTheme={activeTheme} viewState={viewState} visitedThemes={visitedThemes} />

      {/* Scrollable Container */}
      <div ref={scrollRef} className="theme-scroll absolute inset-0 pointer-events-auto overflow-y-auto z-30 flex flex-col" data-guide-scroll-container="theme">
        {/* Grows with the page (never shrinks to one screen), so its bottom padding always clears the module switcher. */}
        <div className="theme-layout w-full max-w-6xl mx-auto flex flex-col grow shrink-0 min-h-full pb-24">
          <div className="theme-content opacity-0 flex-1" data-guide-id={activeTheme ? `theme-${activeTheme}` : undefined}>
            <Suspense fallback={null}>
              {ActiveThemeContent ? <ActiveThemeContent /> : null}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};
