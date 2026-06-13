import { create } from 'zustand';

export type ViewState = 'HOME' | 'HOVER_PLANET' | 'ENTERING_THEME' | 'THEME' | 'LEAVING_THEME';
export type ThemeKey = 'identity' | 'creations' | 'stack' | 'orbit' | 'signal' | null;
export type NonNullThemeKey = Exclude<ThemeKey, null>;
export type VisualMode = 'cinematic' | 'focus' | 'silent';

const themeKeys: NonNullThemeKey[] = ['identity', 'creations', 'stack', 'orbit', 'signal'];
export const themeCount = themeKeys.length;

interface GalaxyState {
  viewState: ViewState;
  hoveredPlanet: ThemeKey;
  activeTheme: ThemeKey;
  visitedThemes: Partial<Record<NonNullThemeKey, boolean>>;
  visitSequence: NonNullThemeKey[];
  lastVisitedTheme: ThemeKey;
  completionPulseId: number;
  coreFireworkId: number;
  visualMode: VisualMode;
  planetPositions: Partial<Record<NonNullThemeKey, [number, number, number]>>;
  setViewState: (state: ViewState) => void;
  setHoveredPlanet: (theme: ThemeKey) => void;
  setActiveTheme: (theme: ThemeKey) => void;
  visitTheme: (theme: NonNullThemeKey) => void;
  triggerCoreFirework: () => void;
  setVisualMode: (mode: VisualMode) => void;
  setPlanetPosition: (theme: NonNullThemeKey, x: number, y: number, z: number) => void;
}

const readInitialVisualMode = (): VisualMode => {
  if (typeof window === 'undefined') return 'cinematic';
  const storedMode = window.localStorage.getItem('galaxy-visual-mode');
  return storedMode === 'focus' || storedMode === 'silent' || storedMode === 'cinematic'
    ? storedMode
    : 'cinematic';
};

const markThemeVisited = (state: GalaxyState, theme: NonNullThemeKey) => {
  const wasVisited = Boolean(state.visitedThemes[theme]);
  const visitedThemes = {
    ...state.visitedThemes,
    [theme]: true,
  };
  const visitSequence = wasVisited ? state.visitSequence : [...state.visitSequence, theme];
  const wasComplete = Object.keys(state.visitedThemes).length === themeCount;
  const isComplete = Object.keys(visitedThemes).length === themeCount;

  return {
    visitedThemes,
    visitSequence,
    lastVisitedTheme: theme,
    completionPulseId: !wasComplete && isComplete ? state.completionPulseId + 1 : state.completionPulseId,
  };
};

export const useGalaxyStore = create<GalaxyState>((set) => ({
  viewState: 'HOME',
  hoveredPlanet: null,
  activeTheme: null,
  visitedThemes: {},
  visitSequence: [],
  lastVisitedTheme: null,
  completionPulseId: 0,
  coreFireworkId: 0,
  visualMode: readInitialVisualMode(),
  planetPositions: {
    identity: [0, 0, 0],
    creations: [0, 0, 0],
    stack: [0, 0, 0],
    orbit: [0, 0, 0],
    signal: [0, 0, 0],
  },
  setViewState: (state) => set({ viewState: state }),
  setHoveredPlanet: (theme) => set({ hoveredPlanet: theme }),
  setActiveTheme: (theme) => set((state) => {
    if (!theme) {
      return { activeTheme: null };
    }

    return {
      ...markThemeVisited(state, theme),
      activeTheme: theme,
    };
  }),
  visitTheme: (theme) => set((state) => markThemeVisited(state, theme)),
  triggerCoreFirework: () => set((state) => ({ coreFireworkId: state.coreFireworkId + 1 })),
  setVisualMode: (mode) => set(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('galaxy-visual-mode', mode);
    }

    return { visualMode: mode };
  }),
  setPlanetPosition: (theme, x, y, z) => set((state) => ({
    planetPositions: {
      ...state.planetPositions,
      [theme]: [x, y, z],
    },
  })),
}));
