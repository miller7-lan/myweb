import gsap from 'gsap';
import { useGalaxyStore, type NonNullThemeKey } from '../store/useGalaxyStore';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const waitFor = async (check: () => boolean, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return true;
    await wait(80);
  }
  return false;
};

const nextFrame = () => new Promise((resolve) => window.requestAnimationFrame(resolve));

/**
 * Opens a theme from anywhere. From inside another theme it swaps the page
 * content in place (a short cross-fade) instead of flying back to the galaxy.
 */
export const openTheme = async (theme: NonNullThemeKey) => {
  const store = useGalaxyStore.getState();
  if (store.activeTheme === theme && store.viewState === 'THEME') return true;

  if (store.activeTheme && store.viewState === 'THEME') {
    await gsap.to('.theme-content', { opacity: 0, y: 10, duration: 0.18, ease: 'power2.in', overwrite: 'auto' });
    useGalaxyStore.getState().setActiveTheme(theme);
    await nextFrame();
    document.querySelector('[data-guide-scroll-container="theme"]')?.scrollTo({ top: 0 });
    gsap.fromTo('.theme-content', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
    return true;
  }

  if (store.activeTheme && store.activeTheme !== theme) {
    if (store.viewState !== 'THEME') return false;
    store.setViewState('LEAVING_THEME');
    await waitFor(() => {
      const current = useGalaxyStore.getState();
      return !current.activeTheme && (current.viewState === 'HOME' || current.viewState === 'HOVER_PLANET');
    }, 2600);
  }

  const current = useGalaxyStore.getState();
  current.setActiveTheme(theme);
  current.setViewState('ENTERING_THEME');
  return waitFor(() => {
    const next = useGalaxyStore.getState();
    return next.activeTheme === theme && next.viewState === 'THEME';
  }, 4200);
};
