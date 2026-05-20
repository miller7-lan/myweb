import type { ThemeKey } from '../store/useGalaxyStore';

export interface ThemeDef {
  key: ThemeKey;
  label: string;
  title: string;
  subtitle: string;
  chineseName: string;
  description?: string;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
}

export const themes: Record<Exclude<ThemeKey, null>, ThemeDef> = {
  identity: {
    key: 'identity',
    label: 'Identity',
    title: 'Identity',
    subtitle: 'Who I Am',
    chineseName: '身份',
    description: 'A personal space shaped by code, design, and long-term curiosity.',
    color: '#f87171', // soft identity red
    orbitRadius: 8.5,
    orbitSpeed: 0.09,
    orbitOffset: 0,
  },
  creations: {
    key: 'creations',
    label: 'Creations',
    title: 'Creations',
    subtitle: 'What I Build',
    chineseName: '作品',
    color: '#93c5fd', // cold blue signal
    orbitRadius: 8.5,
    orbitSpeed: 0.09,
    orbitOffset: Math.PI * 0.4,
  },
  stack: {
    key: 'stack',
    label: 'Stack',
    title: 'Stack',
    subtitle: 'Tools, Languages, Systems',
    chineseName: '技术栈',
    color: '#b6bbc6', // graphite silver
    orbitRadius: 8.5,
    orbitSpeed: 0.09,
    orbitOffset: Math.PI * 0.8,
  },
  orbit: {
    key: 'orbit',
    label: 'Orbit',
    title: 'Orbit',
    subtitle: 'Where I Am Going',
    chineseName: '轨道',
    color: '#c4b5fd', // pale orbital violet
    orbitRadius: 8.5,
    orbitSpeed: 0.09,
    orbitOffset: Math.PI * 1.2,
  },
  signal: {
    key: 'signal',
    label: 'Signal',
    title: 'Signal',
    subtitle: 'Find Me Online',
    chineseName: '信号',
    color: '#fde68a', // pale signal gold
    orbitRadius: 8.5,
    orbitSpeed: 0.09,
    orbitOffset: Math.PI * 1.6,
  }
};
