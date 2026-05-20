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
  visualMode: VisualMode;
  planetPositions: Partial<Record<NonNullThemeKey, [number, number, number]>>;
  setViewState: (state: ViewState) => void;
  setHoveredPlanet: (theme: ThemeKey) => void;
  setActiveTheme: (theme: ThemeKey) => void;
  visitTheme: (theme: NonNullThemeKey) => void;
  setVisualMode: (mode: VisualMode) => void;
  setPlanetPosition: (theme: NonNullThemeKey, position: [number, number, number]) => void;
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
  visualMode: readInitialVisualMode(),
  planetPositions: {},
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
  setVisualMode: (mode) => set(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('galaxy-visual-mode', mode);
    }

    return { visualMode: mode };
  }),
  setPlanetPosition: (theme, position) => set((state) => ({
    planetPositions: {
      ...state.planetPositions,
      [theme]: position,
    },
  })),
}));
