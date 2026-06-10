import { create } from 'zustand';

export type ViewState = 'HOME' | 'HOVER_PLANET' | 'ENTERING_THEME' | 'THEME' | 'LEAVING_THEME';
export type ThemeKey = 'identity' | 'creations' | 'stack' | 'orbit' | 'signal' | null;
export type NonNullThemeKey = Exclude<ThemeKey, null>;
export type VisualMode = 'cinematic' | 'focus' | 'silent';

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

    const wasVisited = Boolean(state.visitedThemes[theme]);
    const visitedThemes = {
      ...state.visitedThemes,
      [theme]: true,
    };
    const visitSequence = wasVisited ? state.visitSequence : [...state.visitSequence, theme];
    const wasComplete = Object.keys(state.visitedThemes).length === 5;
    const isComplete = Object.keys(visitedThemes).length === 5;

    return {
      activeTheme: theme,
      visitedThemes,
      visitSequence,
      lastVisitedTheme: theme,
      completionPulseId: !wasComplete && isComplete ? state.completionPulseId + 1 : state.completionPulseId,
    };
  }),
  visitTheme: (theme) => set((state) => {
    const wasVisited = Boolean(state.visitedThemes[theme]);
    const visitedThemes = {
      ...state.visitedThemes,
      [theme]: true,
    };
    const wasComplete = Object.keys(state.visitedThemes).length === 5;
    const isComplete = Object.keys(visitedThemes).length === 5;

    return {
      visitedThemes,
      visitSequence: wasVisited ? state.visitSequence : [...state.visitSequence, theme],
      lastVisitedTheme: theme,
      completionPulseId: !wasComplete && isComplete ? state.completionPulseId + 1 : state.completionPulseId,
    };
  }),
  triggerCoreFirework: () => set((state) => ({ coreFireworkId: state.coreFireworkId + 1 })),
  setVisualMode: (mode) => set(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('galaxy-visual-mode', mode);
    }

    return { visualMode: mode };
  }),
  setPlanetPosition: (theme, x, y, z) => set((state) => {
    const position = state.planetPositions[theme];
    if (!position) {
      return {
        planetPositions: {
          ...state.planetPositions,
          [theme]: [x, y, z],
        },
      };
    }

    position[0] = x;
    position[1] = y;
    position[2] = z;
    return state;
  }),
}));
