import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownRight, LocateFixed, Minus, Search } from 'lucide-react';
import { guideTargets, petPrompts, type GuideTarget, type PetMood } from '../../data/guide';
import { themes } from '../../data/themes';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { openTheme } from '../../utils/themeNavigation';
import type { PetReaction } from '../../utils/raid';

/*
 * 星仔 — the site's pixel guide.
 * Behaviour is modelled on desktop pets such as Clawd on Desk: the eyes follow the
 * cursor, every state has its own animation (idle, thinking, guiding, success,
 * curious, asleep, dragged), it can tuck itself into a screen edge and peek out,
 * and it talks through small floating notification cards instead of comic bubbles.
 */

type ChatLine = {
  from: 'pet' | 'user';
  text: string;
};

type PetPosition = {
  x: number;
  y: number;
};

type DockSide = 'left' | 'right' | null;

type Emote = 'heart' | 'star' | 'note' | 'alert' | 'question' | 'sparkle';

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  lastX: number;
  moved: boolean;
};

type BubbleMode = 'text' | 'emoji' | 'mixed';

type PixelEmoji = 'sparkle' | 'smile' | 'cool' | 'star' | 'heart';

type BubbleState = {
  id: number;
  text: string;
  mode: BubbleMode;
  emoji: PixelEmoji | null;
};

type GuideSearchMatch = {
  target: GuideTarget;
  score: number;
  confidence: number;
  reason: string;
};

type GuideEventDetail = {
  target: GuideTarget;
};

declare global {
  interface WindowEventMap {
    'galaxy-guide-open': CustomEvent<GuideEventDetail>;
  }
}

const quickCommands = [
  { label: '看作品', targetId: 'theme-creations' },
  { label: '找下载', targetId: 'theme-orbit' },
  { label: '联系我', targetId: 'theme-signal' },
  { label: '看证书', targetId: 'identity-growth' },
  { label: '技术栈', targetId: 'theme-stack' },
];

// While 星仔 is inside a black hole (the opening animation and the
// transitions draw a stand-in and set this class), the real one stays put:
// no strolling, hopping or dragging until it has climbed back out.
const subscribePortaling = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};
const readPortaling = () => document.documentElement.classList.contains('pet-portaling');
const usePetPortaling = () => useSyncExternalStore(subscribePortaling, readPortaling, () => false);

// Written out so the stylesheet keeps these rules.
const reactionClass: Record<PetReaction, string> = { shock: 'is-shock', throw: 'is-throw', cheer: 'is-cheer', catch: 'is-catch', read: 'is-read' };
// How long each reaction lasts, in ms.
const reactionLength: Record<PetReaction, number> = { shock: 1100, throw: 260, cheer: 1600, catch: 600, read: 4200 };

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const petPositionStorageKey = 'galaxy-guide-pet-position';
const petDockStorageKey = 'galaxy-guide-pet-dock';
const petShellWidth = 72;
const petShellHeight = 72;
const petMargin = 12;
const sleepAfterMs = 45000;
const walkSpeed = 36; // px per second, a slow stroll
const walkPauseMin = 7000;
const walkPauseMax = 18000;
const mobileQuery = '(max-width: 768px)';

const moodLabels: Record<PetMood | 'asleep', string> = {
  idle: '在线',
  curious: '有点好奇',
  guiding: '导航中',
  success: '已定位',
  thinking: '思考中',
  asleep: '打盹中',
};

/*
 * Pixel emotes, drawn as 1-unit squares on a 9x9 grid like a sprite sheet,
 * in the spirit of Clawd on Desk's pixel bubbles. '#' is the emote's colour,
 * 'o' a lighter accent, '.' empty.
 */
const emoteArt: Record<Emote, string[]> = {
  heart: [
    '.##...##.',
    '####.####',
    '#########',
    '#o#######',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....',
    '.........',
  ],
  star: [
    '....#....',
    '....#....',
    '...o#o...',
    '#########',
    '...###...',
    '..#o#o#..',
    '.##...##.',
    '.#.....#.',
    '.........',
  ],
  note: [
    '......###',
    '......#o#',
    '......###',
    '......#..',
    '..#####..',
    '..#...#..',
    '.###..#..',
    '.#o#.###.',
    '.###.#o#.',
  ],
  alert: [
    '...###...',
    '...#o#...',
    '...###...',
    '...###...',
    '...#o#...',
    '....#....',
    '.........',
    '...###...',
    '...###...',
  ],
  question: [
    '..#####..',
    '.##...##.',
    '......##.',
    '....###..',
    '...##....',
    '...##....',
    '.........',
    '...##....',
    '...##....',
  ],
  sparkle: [
    '....#....',
    '...o#o...',
    '....#....',
    '.#.....#.',
    '#o#####o#',
    '.#.....#.',
    '....#....',
    '...o#o...',
    '....#....',
  ],
};

const PixelEmote: React.FC<{ type: Emote }> = ({ type }) => (
  <svg viewBox="0 0 9 9" width="18" height="18" shapeRendering="crispEdges" aria-hidden="true">
    {emoteArt[type].flatMap((row, y) =>
      row.split('').map((cell, x) =>
        cell === '.' ? null : (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" opacity={cell === 'o' ? 0.45 : 1} />
        ),
      ),
    )}
  </svg>
);

const idleEmotes: Emote[] = ['heart', 'star', 'note', 'sparkle'];


/* ---------- the original pixel speech bubble (restored as dazzle designed it) ---------- */

const petEmoji: PixelEmoji[] = ['sparkle', 'smile', 'cool', 'star', 'heart'];
const petEmojiGlyph: Record<PixelEmoji, string> = {
  sparkle: '\u2726',
  smile: '\u263a',
  cool: '\u263b',
  star: '\u2605',
  heart: '\u2665',
};

const randomPixelEmoji = (): PixelEmoji => petEmoji[Math.floor(Math.random() * petEmoji.length)];

// Time-of-day leaning for the pet's unprompted emoji bubbles.
const bubbleEmojiForHour = (hour: number): PixelEmoji => {
  const pool: PixelEmoji[] =
    hour >= 23 || hour < 6 ? ['smile', 'star', 'star'] :
    hour < 10 ? ['sparkle', 'smile', 'cool'] :
    hour < 18 ? ['cool', 'star', 'sparkle', 'heart'] :
    ['heart', 'smile', 'star'];
  return pool[Math.floor(Math.random() * pool.length)];
};

const shortBubbleText = (text: string) => {
  if (text.length <= 22) return text;
  return `${text.slice(0, 20)}...`;
};

const bubbleWidthRem = (text: string, mode: BubbleMode) => {
  if (mode === 'emoji') return 4.6;
  const base = mode === 'mixed' ? 3.8 : 4.4;
  const charWidth = Array.from(text).some((char) => char.codePointAt(0)! > 255) ? 0.58 : 0.38;
  const max = mode === 'mixed' ? 10.8 : 12.25;
  return Math.min(max, Math.max(6.4, base + text.length * charWidth));
};

const textBubbleFrames = {
  right: {
    shadow: 'M20 8h276v8h12v12h8v52h-8v12H76v12H56V92H20v-8H8V20h12z',
    border: 'M16 0h280v8h16v16h8v56h-8v16H80v16H52V96H16v-8H0V16h16z',
    fill: 'M20 8h272v8h12v12h8v48h-8v12H72v16H60V88H20v-8H8V24h12z',
  },
  left: {
    shadow: 'M20 8h276v8h12v12h8v52h-8v12h-56v12h-20V92H20v-8H8V20h12z',
    border: 'M16 0h280v8h16v16h8v56h-8v16h-52v16h-28V96H16v-8H0V16h16z',
    fill: 'M20 8h272v8h12v12h8v48h-8v12h-56v16h-12V88H20v-8H8V24h12z',
  },
};

const emojiBubbleFrames = {
  right: {
    shadow: 'M24 4h80v8h12v12h8v56h-8v12H76v8H56v8H40v-8H28v-8H12V80H4V28h8V16h12z',
    border: 'M20 0h80v8h12v12h8v56h-8v12H78v8H58v12H42V96H24v-8H8V76H0V24h8V12h12z',
    fill: 'M24 8h72v8h12v12h8v44h-8v12H74v8H58v12h-8V92H28v-8H12V72H4V28h8V16h12z',
  },
  left: {
    shadow: 'M24 4h80v8h12v12h8v56h-8v12H96v8H72v8H56v-8H28v-8H12V80H4V28h8V16h12z',
    border: 'M20 0h80v8h12v12h8v56h-8v12H96v8H70v12H54V96H24v-8H8V76H0V24h8V12h12z',
    fill: 'M24 8h72v8h12v12h8v44h-8v12H92v8H66v12h-8V92H28v-8H12V72H4V28h8V16h12z',
  },
};

const clampPetPosition = (position: PetPosition): PetPosition => {
  if (typeof window === 'undefined') return position;
  const maxX = Math.max(petMargin, window.innerWidth - petShellWidth - petMargin);
  const maxY = Math.max(petMargin, window.innerHeight - petShellHeight - petMargin);
  return {
    x: Math.min(Math.max(petMargin, position.x), maxX),
    y: Math.min(Math.max(petMargin, position.y), maxY),
  };
};

const defaultPetPosition = (): PetPosition => {
  if (typeof window === 'undefined') return { x: 24, y: 24 };
  return clampPetPosition({
    x: window.innerWidth - petShellWidth - petMargin - 8,
    y: window.innerHeight - petShellHeight - petMargin - 8,
  });
};

const readStorage = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private windows; the pet just forgets its spot.
  }
};

const readPetPosition = () => {
  if (typeof window === 'undefined') return defaultPetPosition();
  const stored = readStorage(petPositionStorageKey);
  if (!stored) return defaultPetPosition();

  try {
    const parsed = JSON.parse(stored) as Partial<PetPosition>;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return clampPetPosition({ x: parsed.x, y: parsed.y });
    }
  } catch {
    // Fall through to the default spot.
  }

  return defaultPetPosition();
};

const readDockSide = (): DockSide => {
  if (typeof window === 'undefined') return null;
  const stored = readStorage(petDockStorageKey);
  return stored === 'left' || stored === 'right' ? stored : null;
};

const normalizeQuery = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const queryTokens = (value: string) =>
  normalizeQuery(value).split(/\s+/).filter((part) => part.length > 0);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseGuideRegex = (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const literalRegex = trimmed.match(/^\/(.+)\/([dgimsuvy]*)$/);
  if (literalRegex) {
    try {
      return {
        regex: new RegExp(literalRegex[1], literalRegex[2].includes('i') ? literalRegex[2] : `${literalRegex[2]}i`),
        source: `/${literalRegex[1]}/${literalRegex[2].includes('i') ? literalRegex[2] : `${literalRegex[2]}i`}`,
      };
    } catch {
      return null;
    }
  }

  const parts = normalizeQuery(trimmed).split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const source = parts.map(escapeRegExp).join('.*?');
  return {
    regex: new RegExp(source, 'i'),
    source: `/${source}/i`,
  };
};

const targetSearchFields = (target: GuideTarget) => [
  { name: '标签', value: target.label },
  { name: '说明', value: target.description },
  { name: '模块', value: target.theme },
  { name: 'ID', value: target.id },
  { name: '关键词', value: target.keywords.join(' ') },
];

const scoreTarget = (target: GuideTarget, query: string): GuideSearchMatch => {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return { target, score: 0, confidence: 0, reason: '等待输入' };
  }

  const fields = targetSearchFields(target);
  const haystack = fields.map((field) => field.value).join(' ').toLowerCase();
  const regexInfo = parseGuideRegex(query);
  const reasons: string[] = [];

  let score = haystack.includes(normalized) ? 12 : 0;
  if (score) reasons.push('完整短语');

  const tokens = queryTokens(query);
  if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) {
    score += 18 + tokens.length * 4;
    reasons.push('深度匹配');
  }

  if (regexInfo) {
    fields.forEach((field) => {
      if (regexInfo.regex.test(field.value)) {
        score += field.name === '关键词' ? 22 : 16;
        reasons.push(`正则:${field.name}`);
      }
      regexInfo.regex.lastIndex = 0;
    });
  }

  target.keywords.forEach((keyword) => {
    const term = keyword.toLowerCase();
    if (normalized.includes(term)) {
      score += 10 + Math.min(term.length, 8);
      reasons.push(`关键词:${keyword}`);
    }
    if (term.includes(normalized)) {
      score += 5;
      reasons.push(`包含:${keyword}`);
    }
  });

  tokens.forEach((part) => {
    if (part.length > 1 && haystack.includes(part)) {
      score += 4;
      reasons.push(part);
    }
  });

  return {
    target,
    score,
    confidence: Math.min(99, Math.round((score / 58) * 100)),
    reason: [...new Set(reasons)].slice(0, 3).join(' · ') || '弱匹配',
  };
};

const findBestTarget = (query: string) => {
  return guideTargets
    .map((target) => scoreTarget(target, query))
    .sort((a, b) => b.score - a.score)[0];
};

const waitForElement = async (selector: string) => {
  const deadline = Date.now() + 2400;
  while (Date.now() < deadline) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) return element;
    await wait(70);
  }
  return null;
};

// Every so often 星仔 reminds visitors it can show them around.
const guideHints = ['点我，可以快速导览哦', '想去哪？点我带路', '迷路了？点我一下'];

const currentPrompt = (theme: string | null) => {
  const key = theme ?? 'HOME';
  return petPrompts.find((prompt) => prompt.theme === key)?.text ?? petPrompts[0].text;
};

/** 20 × 18 pixel sprite. Every moving part is its own group so CSS can animate it per state. */
export const PetSprite: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`pet-sprite ${className ?? ''}`} viewBox="0 0 20 18" shapeRendering="crispEdges" aria-hidden="true">
    <ellipse className="pet-shadow" cx="10" cy="17.4" rx="6.5" ry="0.7" />
    <g className="pet-legs">
      <rect className="pet-leg pet-leg-1" x="4" y="14" width="2" height="3" />
      <rect className="pet-leg pet-leg-2" x="7" y="14" width="2" height="3" />
      <rect className="pet-leg pet-leg-3" x="11" y="14" width="2" height="3" />
      <rect className="pet-leg pet-leg-4" x="14" y="14" width="2" height="3" />
    </g>
    <g className="pet-body">
      <g className="pet-antenna">
        <rect className="pet-antenna-stem" x="10" y="1" width="1" height="2" />
        <rect className="pet-antenna-tip" x="10" y="0" width="1" height="1" />
      </g>
      <rect className="pet-arm pet-arm-left" x="1" y="8" width="2" height="3" />
      <rect className="pet-arm pet-arm-right" x="17" y="8" width="2" height="3" />
      <rect className="pet-fill" x="4" y="3" width="12" height="11" />
      <rect className="pet-fill" x="3" y="4" width="14" height="9" />
      <rect className="pet-shade" x="3" y="11" width="14" height="2" />
      <rect className="pet-shade" x="4" y="13" width="12" height="1" />
      <rect className="pet-light" x="4" y="4" width="2" height="1" />
      <rect className="pet-light" x="4" y="5" width="1" height="1" />
      <rect className="pet-visor" x="6" y="5" width="8" height="5" />
      <rect className="pet-visor" x="5" y="6" width="10" height="3" />
      <g className="pet-eyes">
        <g className="pet-eyes-open">
          <rect x="7" y="6" width="2" height="3" />
          <rect x="11" y="6" width="2" height="3" />
        </g>
        <g className="pet-eyes-happy">
          <rect x="6" y="7" width="1" height="1" />
          <rect x="7" y="6" width="1" height="1" />
          <rect x="8" y="7" width="1" height="1" />
          <rect x="11" y="7" width="1" height="1" />
          <rect x="12" y="6" width="1" height="1" />
          <rect x="13" y="7" width="1" height="1" />
        </g>
        <g className="pet-eyes-closed">
          <rect x="7" y="8" width="2" height="1" />
          <rect x="11" y="8" width="2" height="1" />
        </g>
      </g>
      <rect className="pet-cheek" x="5" y="10" width="1" height="1" />
      <rect className="pet-cheek" x="14" y="10" width="1" height="1" />
    </g>
  </svg>
);

export const GuidePet: React.FC = () => {
  const { viewState, activeTheme, hoveredPlanet, visualMode } = useGalaxyStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const [bubble, setBubble] = useState<BubbleState | null>(null);
  const [bubbleClosing, setBubbleClosing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [mood, setMood] = useState<PetMood>('idle');
  const [reaction, setReaction] = useState<PetReaction | null>(null);
  const [asleep, setAsleep] = useState(false);
  const [emote, setEmote] = useState<{ id: number; type: Emote } | null>(null);
  const [poke, setPoke] = useState(0);
  const [hop, setHop] = useState(0);
  const [petPosition, setPetPosition] = useState<PetPosition>(() => readPetPosition());
  const [dockSide, setDockSide] = useState<DockSide>(() => readDockSide());
  const [isDragging, setIsDragging] = useState(false);
  const [isWalking, setIsWalking] = useState(false);
  const [facing, setFacing] = useState<'left' | 'right'>('left');
  const [dragLean, setDragLean] = useState<'left' | 'right' | 'none'>('none');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(mobileQuery).matches);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [hiddenByScroll, setHiddenByScroll] = useState(false);
  const [chatLines, setChatLines] = useState<ChatLine[]>([
    { from: 'pet', text: '我是星仔，这里的导航员。你可以问我：下载利润助手、看证书、联系你、技术栈。' },
  ]);
  const spriteWrapRef = useRef<HTMLButtonElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const livePositionRef = useRef<PetPosition>(petPosition);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const bubbleTimerRef = useRef<number | null>(null);
  const bubbleCloseTimerRef = useRef<number | null>(null);
  const panelCloseTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef(0);
  const lookOverrideUntilRef = useRef(0);
  const bubbleIdRef = useRef(0);
  const visibleTheme = activeTheme ?? hoveredPlanet;
  const themeColor = visibleTheme ? themes[visibleTheme].color : '#bfe3ff';
  const isInTheme = viewState === 'THEME' || viewState === 'LEAVING_THEME' || viewState === 'ENTERING_THEME';
  const reduceMotion = visualMode === 'silent';
  const portaling = usePetPortaling();

  const relatedTargets = useMemo(() => {
    const theme = activeTheme ?? hoveredPlanet;
    if (!theme) return guideTargets.filter((target) => target.id.startsWith('theme-'));
    return guideTargets.filter((target) => target.theme === theme).slice(0, 6);
  }, [activeTheme, hoveredPlanet]);

  const searchMatches = useMemo(() => {
    if (!inputValue.trim()) return [];
    return guideTargets
      .map((target) => scoreTarget(target, inputValue))
      .filter((match) => match.score >= 4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [inputValue]);
  const queryPattern = useMemo(() => parseGuideRegex(inputValue)?.source ?? null, [inputValue]);

  /* ---------- bubble ---------- */

  const clearBubbleTimers = useCallback(() => {
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (bubbleCloseTimerRef.current) window.clearTimeout(bubbleCloseTimerRef.current);
    bubbleTimerRef.current = null;
    bubbleCloseTimerRef.current = null;
  }, []);

  const hideBubble = useCallback((immediate = false) => {
    clearBubbleTimers();
    if (immediate) {
      setBubble(null);
      setBubbleClosing(false);
      return;
    }
    setBubbleClosing(true);
    bubbleCloseTimerRef.current = window.setTimeout(() => {
      setBubble(null);
      setBubbleClosing(false);
      bubbleCloseTimerRef.current = null;
    }, 220);
  }, [clearBubbleTimers]);

  const showBubble = useCallback((
    text: string,
    options: { mode?: BubbleMode; emoji?: PixelEmoji | null; autoHideMs?: number } = {},
  ) => {
    const autoHideMs = options.autoHideMs ?? 5200;
    const mode = options.mode ?? (options.emoji ? 'mixed' : 'text');
    const emoji = mode === 'emoji' ? options.emoji ?? randomPixelEmoji() : options.emoji ?? null;
    clearBubbleTimers();
    bubbleIdRef.current += 1;
    setBubbleClosing(false);
    setBubble({ id: bubbleIdRef.current, text: mode === 'mixed' ? shortBubbleText(text) : text, mode, emoji });
    if (autoHideMs > 0) {
      bubbleTimerRef.current = window.setTimeout(() => hideBubble(), autoHideMs);
    }
  }, [clearBubbleTimers, hideBubble]);

  const showEmote = useCallback((type: Emote) => {
    setEmote({ id: Date.now(), type });
  }, []);

  // The UFO (UfoRaid): jump in shock, throw stars at it, cheer when it flees.
  // A visitor's message (PaperPlane): catch the paper plane, unfold it and read it.
  useEffect(() => {
    let timer = 0;
    const react = (event: WindowEventMap['galaxy-pet-react']) => {
      const next = event.detail.reaction;
      window.clearTimeout(timer);
      setAsleep(false);
      setReaction(next);
      if (next === 'shock') {
        showEmote('alert');
        setHop((value) => value + 1);
      } else if (next === 'cheer') {
        showEmote('star');
        setHop((value) => value + 1);
      } else if (next === 'catch') {
        setHop((value) => value + 1);
      }
      timer = window.setTimeout(() => {
        setReaction(null);
        // Done reading: it liked the message.
        if (next === 'read') showEmote('heart');
      }, reactionLength[next]);
    };
    window.addEventListener('galaxy-pet-react', react);
    return () => {
      window.removeEventListener('galaxy-pet-react', react);
      window.clearTimeout(timer);
    };
  }, [showEmote]);

  useEffect(() => {
    if (!emote) return;
    const timer = window.setTimeout(() => setEmote(null), 1700);
    return () => window.clearTimeout(timer);
  }, [emote]);

  useEffect(() => {
    const timer = window.setTimeout(() => hideBubble(), 0);
    return () => window.clearTimeout(timer);
  }, [activeTheme, hideBubble]);

  useEffect(() => () => {
    clearBubbleTimers();
    if (panelCloseTimerRef.current) window.clearTimeout(panelCloseTimerRef.current);
  }, [clearBubbleTimers]);

  /* ---------- panel ---------- */

  const closePanel = useCallback(() => {
    if (!panelOpen || panelClosing) return;
    if (panelCloseTimerRef.current) window.clearTimeout(panelCloseTimerRef.current);
    setPanelClosing(true);
    panelCloseTimerRef.current = window.setTimeout(() => {
      setPanelOpen(false);
      setPanelClosing(false);
      panelCloseTimerRef.current = null;
    }, 320);
  }, [panelClosing, panelOpen]);

  const openPanel = () => {
    hideBubble(true);
    setPanelClosing(false);
    setPanelOpen(true);
    setAsleep(false);
  };

  useEffect(() => {
    if (!panelOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePanel, panelOpen]);

  /* ---------- layout: mobile, resize, scroll ---------- */

  useEffect(() => {
    const query = window.matchMedia(mobileQuery);
    const sync = () => setIsMobile(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPetPosition((position) => clampPetPosition(position));
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // On phones the pet slides out of the way while the page scrolls, then peeks back.
  useEffect(() => {
    if (!isMobile || !isInTheme) return;
    const container = document.querySelector<HTMLElement>('[data-guide-scroll-container="theme"]');
    if (!container) return;
    let timer: number | null = null;
    const handleScroll = () => {
      setHiddenByScroll(true);
      setMobileExpanded(false);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setHiddenByScroll(false), 900);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [isInTheme, isMobile, viewState]);

  // A tapped-out pet tucks itself back into the edge once it has nothing to say.
  useEffect(() => {
    if (!isMobile || !mobileExpanded || bubble || panelOpen) return;
    const timer = window.setTimeout(() => setMobileExpanded(false), 2600);
    return () => window.clearTimeout(timer);
  }, [bubble, isMobile, mobileExpanded, panelOpen]);

  /* ---------- eyes follow the cursor, sleep when nobody is around ---------- */

  useEffect(() => {
    const sprite = spriteWrapRef.current;
    if (!sprite) return;
    lastActivityRef.current = Date.now();
    let frame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      lastActivityRef.current = Date.now();
      if (Date.now() < lookOverrideUntilRef.current) return;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = sprite.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height * 0.38);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 160);
        sprite.style.setProperty('--eye-x', ((dx / distance) * reach).toFixed(2));
        sprite.style.setProperty('--eye-y', ((dy / distance) * reach * 0.75).toFixed(2));
      });
    };
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('keydown', markActive);
    window.addEventListener('wheel', markActive, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('wheel', markActive);
    };
  }, []);

  useEffect(() => {
    if (!isWalking) livePositionRef.current = petPosition;
  }, [isWalking, petPosition]);

  const lookAt = useCallback((x: number, y: number, ms: number) => {
    const sprite = spriteWrapRef.current;
    if (!sprite) return;
    lookOverrideUntilRef.current = Date.now() + ms;
    sprite.style.setProperty('--eye-x', String(x));
    sprite.style.setProperty('--eye-y', String(y));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (asleep) {
        if (idleFor < 1500) {
          setAsleep(false);
          showEmote('alert');
        }
        return;
      }
      if (idleFor > sleepAfterMs && mood === 'idle' && !panelOpen && !bubble && !isDragging) {
        setAsleep(true);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [asleep, bubble, isDragging, mood, panelOpen, showEmote]);

  // Small idle routines: glance around, hop, or float a little emote.
  useEffect(() => {
    if (asleep || mood !== 'idle' || isDragging || reduceMotion || portaling) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        const roll = Math.random();
        if (roll < 0.45) {
          lookAt(Math.random() > 0.5 ? 1 : -1, Math.random() * 0.6 - 0.3, 1100);
        } else if (roll < 0.7) {
          setHop((value) => value + 1);
        } else if (roll < 0.85) {
          showEmote(idleEmotes[Math.floor(Math.random() * idleEmotes.length)]);
        }
        schedule();
      }, 4200 + Math.random() * 4200);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [asleep, isDragging, lookAt, mood, portaling, reduceMotion, showEmote]);

  // Every so often the pet pops an emoji bubble that suits the time of day,
  // or says it can show the visitor around (tapping the bubble opens the guide).
  // The first time is a reminder, a few seconds after the opening animation.
  const introPlaying = useGalaxyStore((state) => state.introPlaying);
  const raidActive = useGalaxyStore((state) => Boolean(state.raid));
  const hintedRef = useRef(false);
  useEffect(() => {
    if (introPlaying || portaling || asleep || isDragging || panelOpen || bubble) return;
    const first = !hintedRef.current;
    if (reduceMotion && !first) return;
    const timer = window.setTimeout(() => {
      if (first || Math.random() < 0.5) {
        hintedRef.current = true;
        showBubble(guideHints[Math.floor(Math.random() * guideHints.length)], { autoHideMs: 5600 });
        return;
      }
      showBubble('', { mode: 'emoji', emoji: bubbleEmojiForHour(new Date().getHours()), autoHideMs: 2600 });
    }, first ? 3500 : 18000 + Math.random() * 26000);
    return () => window.clearTimeout(timer);
  }, [asleep, bubble, introPlaying, isDragging, panelOpen, portaling, reduceMotion, showBubble]);

  /* ---------- wandering (desktop) ---------- */

  // Like a desktop pet, 星仔 strolls to a new spot now and then and stays there.
  const canWander =
    !isMobile && !portaling && !introPlaying && !raidActive && !reaction && !isDragging && !panelOpen && !bubble && !asleep && !dockSide && !reduceMotion && mood === 'idle';

  useEffect(() => {
    if (!canWander) return;
    let frame = 0;
    let timer = 0;
    let cancelled = false;

    const strollTo = (target: PetPosition) => {
      const start = { ...livePositionRef.current };
      const distance = Math.hypot(target.x - start.x, target.y - start.y);
      if (distance < 40) {
        queue();
        return;
      }
      const duration = (distance / walkSpeed) * 1000;
      const startedAt = performance.now();
      setFacing(target.x < start.x ? 'left' : 'right');
      setIsWalking(true);

      const step = (now: number) => {
        if (cancelled) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        const position = {
          x: start.x + (target.x - start.x) * progress,
          y: start.y + (target.y - start.y) * progress,
        };
        livePositionRef.current = position;
        if (shellRef.current) {
          shellRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
        }
        if (progress < 1) {
          frame = window.requestAnimationFrame(step);
          return;
        }
        frame = 0;
        setIsWalking(false);
        setPetPosition(position);
        writeStorage(petPositionStorageKey, JSON.stringify(position));
        queue();
      };

      frame = window.requestAnimationFrame(step);
    };

    const queue = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const maxX = Math.max(petMargin, window.innerWidth - petShellWidth - petMargin);
        const maxY = Math.max(petMargin, window.innerHeight - petShellHeight - petMargin);
        // Stay in the lower band of the screen, where it does not cover the content.
        const minY = Math.max(petMargin, maxY - 240);
        strollTo({
          x: petMargin + Math.random() * (maxX - petMargin),
          y: minY + Math.random() * Math.max(1, maxY - minY),
        });
      }, walkPauseMin + Math.random() * (walkPauseMax - walkPauseMin));
    };

    queue();
    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      setIsWalking(false);
      setPetPosition(clampPetPosition(livePositionRef.current));
    };
  }, [canWander]);

  /* ---------- guiding ---------- */

  const addChat = (line: ChatLine) => {
    setChatLines((lines) => [...lines.slice(-5), line]);
  };

  const highlightElement = (element: HTMLElement) => {
    document.querySelectorAll('.guide-target-active').forEach((node) => {
      node.classList.remove('guide-target-active');
    });
    element.classList.add('guide-target-active');
    window.setTimeout(() => element.classList.remove('guide-target-active'), 3200);
  };

  const scrollToElement = (element: HTMLElement) => {
    const scrollContainer = document.querySelector<HTMLElement>('[data-guide-scroll-container="theme"]');
    if (scrollContainer && scrollContainer.contains(element)) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = element.getBoundingClientRect();
      const top = scrollContainer.scrollTop + targetRect.top - containerRect.top - 120;
      scrollContainer.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  };

  const runOpenAction = async (target: GuideTarget) => {
    window.dispatchEvent(new CustomEvent('galaxy-guide-open', { detail: { target } }));
    if (target.openAction?.type === 'focus-field') {
      await wait(250);
      document.getElementById(target.openAction.value)?.focus();
    }
    if (target.openAction) await wait(360);
  };

  const guideTo = async (targetId: string) => {
    const target = guideTargets.find((item) => item.id === targetId);
    if (!target) return false;

    setAsleep(false);
    setMood('guiding');
    showBubble(`正在前往：${target.label}`, { autoHideMs: 0 });
    closePanel();

    const themeReady = await openTheme(target.theme);
    if (!themeReady) {
      setMood('curious');
      showEmote('question');
      showBubble('页面还在展开，稍后再试一次。');
      window.setTimeout(() => setMood('idle'), 2400);
      return false;
    }

    await runOpenAction(target);

    const selector = target.selector ?? `[data-guide-id="${target.id}"]`;
    let element = await waitForElement(selector);
    if (!element && target.openAction?.type === 'focus-field') {
      element = document.getElementById(target.openAction.value);
    }

    if (!element) {
      setMood('curious');
      showEmote('question');
      showBubble('到了对应区域，但没找到可以高亮的位置。');
      window.setTimeout(() => setMood('idle'), 2400);
      return false;
    }

    scrollToElement(element);
    await wait(380);
    highlightElement(element);
    setMood('success');
    showBubble(target.description);
    addChat({ from: 'pet', text: `已定位：${target.label}。${target.description}` });
    window.setTimeout(() => setMood('idle'), 2200);
    return true;
  };

  const submitQuery = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    addChat({ from: 'user', text: query });
    setInputValue('');
    setMood('thinking');
    await wait(420);

    const best = findBestTarget(query);
    if (!best || best.score < 4) {
      setMood('curious');
      showEmote('question');
      const fallback = petPrompts.find((prompt) => prompt.id === 'fail')?.text ?? '我暂时没匹配到目标。';
      addChat({ from: 'pet', text: fallback });
      window.setTimeout(() => setMood('idle'), 2400);
      return;
    }

    addChat({ from: 'pet', text: `收到，我带你去「${best.target.label}」。` });
    await guideTo(best.target.id);
  };

  /* ---------- drag (desktop) ---------- */

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (isMobile || portaling || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: petPosition.x,
      originY: petPosition.y,
      lastX: event.clientX,
      moved: false,
    };
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (!dragState.moved && Math.abs(dx) + Math.abs(dy) > 5) {
      dragState.moved = true;
      setIsDragging(true);
      setDockSide(null);
      setAsleep(false);
      hideBubble();
    }
    if (!dragState.moved) return;
    const step = event.clientX - dragState.lastX;
    if (Math.abs(step) > 1) setDragLean(step > 0 ? 'right' : 'left');
    dragState.lastX = event.clientX;
    setPetPosition(clampPetPosition({ x: dragState.originX + dx, y: dragState.originY + dy }));
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (!dragState.moved) return;

    const finalPosition = clampPetPosition({
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY,
    });
    const maxX = window.innerWidth - petShellWidth - petMargin;
    // Dropping the pet against a side edge tucks it in, like a desktop pet's mini mode.
    const nextDock: DockSide = finalPosition.x <= petMargin + 2 ? 'left' : finalPosition.x >= maxX - 2 ? 'right' : null;
    setPetPosition(finalPosition);
    setDockSide(nextDock);
    writeStorage(petPositionStorageKey, JSON.stringify(finalPosition));
    writeStorage(petDockStorageKey, nextDock ?? '');
    suppressNextClickRef.current = true;
    setIsDragging(false);
    setDragLean('none');
    if (nextDock) showEmote('note');
  };

  /* ---------- clicks ---------- */

  const clickAvatar = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    lastActivityRef.current = Date.now();
    setPoke((value) => value + 1);

    if (asleep) {
      setAsleep(false);
      showEmote('alert');
      return;
    }

    if (isMobile && !mobileExpanded) {
      setMobileExpanded(true);
      showBubble(currentPrompt(useGalaxyStore.getState().activeTheme), { autoHideMs: 7000 });
      return;
    }

    if (panelOpen) {
      closePanel();
      return;
    }

    if (bubble && !bubbleClosing) {
      openPanel();
      return;
    }

    showBubble(currentPrompt(useGalaxyStore.getState().activeTheme), { autoHideMs: 7000 });
  };

  /* ---------- render ---------- */

  const petState = asleep ? 'asleep' : isDragging ? 'dragging' : mood;
  const stateLabel = moodLabels[asleep ? 'asleep' : mood];
  const bubbleSide = isMobile || dockSide === 'right' || petPosition.x > window.innerWidth * 0.5 ? 'left' : 'right';
  const bubblePlacement = !isMobile && petPosition.y < 190 ? 'below' : 'above';
  const bubbleTail: 'left' | 'right' = bubbleSide === 'left' ? 'left' : 'right';

  // On desktop the guide opens next to 星仔 and follows it: above it in the
  // lower half of the screen, below it in the upper half, and toward the
  // middle of the screen on whichever side 星仔 is, growing out of its corner.
  const panelPlacement = (): React.CSSProperties => {
    if (isMobile) return {};
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const onRight = petPosition.x + petShellWidth / 2 > vw / 2;
    const below = petPosition.y + petShellHeight / 2 < vh / 2;
    const horizontal = onRight
      ? { left: 'auto', right: Math.max(16, vw - petPosition.x - petShellWidth) }
      : { right: 'auto', left: Math.max(16, petPosition.x) };
    const vertical = below
      ? { bottom: 'auto', top: Math.min(vh - 220, petPosition.y + petShellHeight + gap) }
      : { top: 'auto', bottom: Math.min(vh - 220, vh - petPosition.y + gap) };
    return {
      ...horizontal,
      ...vertical,
      maxHeight: `min(36rem, ${Math.round(below ? vh - (vertical.top as number) - 16 : vh - (vertical.bottom as number) - 16)}px)`,
      transformOrigin: `${onRight ? '90%' : '10%'} ${below ? '0%' : '100%'}`,
    };
  };

  const panel = panelOpen ? (
    <div
      className={`guide-pet-panel ${panelClosing ? 'is-closing' : 'is-opening'}`}
      role="dialog"
      aria-label="星仔导览助手"
      style={{ ['--theme-color' as string]: themeColor, ...panelPlacement() }}
    >
      <div className="guide-pet-panel-head">
        <div className="guide-pet-panel-id">
          <span className={`guide-pet-panel-avatar state-${petState}`}>
            <PetSprite />
          </span>
          <div>
            <h2>星仔</h2>
            <span className="guide-pet-panel-status">
              <i />
              {stateLabel} · 太空导览
            </span>
          </div>
        </div>
        <button type="button" onClick={closePanel} aria-label="收起导览助手">
          <Minus size={16} />
        </button>
      </div>

      <div className="guide-pet-chat">
        {chatLines.map((line, index) => (
          <div key={`${line.from}-${index}`} className={`guide-pet-line ${line.from}`}>
            {line.text}
          </div>
        ))}
        {mood === 'thinking' && (
          <div className="guide-pet-line pet is-typing" aria-label="星仔正在思考">
            <span /><span /><span />
          </div>
        )}
      </div>

      <div className="guide-pet-chips" aria-label="快捷导览">
        {quickCommands.map((command) => (
          <button key={command.targetId} type="button" onClick={() => guideTo(command.targetId)}>
            <LocateFixed size={12} />
            <span>{command.label}</span>
          </button>
        ))}
      </div>

      <form className="guide-pet-form" onSubmit={submitQuery}>
        <Search size={14} />
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="试试：下载利润助手 / 证书 / 联系"
          aria-label="输入导览问题"
        />
        <button type="submit" aria-label="发送导览问题">
          <CornerDownRight size={15} />
        </button>
      </form>

      {inputValue.trim() && (
        <div className="guide-pet-matches" aria-label="匹配结果">
          <div className="guide-pet-matches-head">
            <span>匹配</span>
            <code>{queryPattern ?? '无效表达式'}</code>
          </div>
          {searchMatches.length > 0 ? (
            searchMatches.map((match) => (
              <button key={match.target.id} type="button" onClick={() => guideTo(match.target.id)}>
                <span className="guide-pet-match-score">{match.confidence}%</span>
                <span className="guide-pet-match-main">
                  <strong>{match.target.label}</strong>
                  <small>{match.reason}</small>
                </span>
                <span className="guide-pet-match-theme">{themes[match.target.theme].chineseName}</span>
              </button>
            ))
          ) : (
            <div className="guide-pet-match-empty">没有找到匹配的位置</div>
          )}
        </div>
      )}

      <div className="guide-pet-related">
        {relatedTargets.slice(0, 5).map((target) => (
          <button key={target.id} type="button" onClick={() => guideTo(target.id)}>
            {target.label}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const shellClasses = [
    'guide-pet-shell',
    isMobile ? 'is-mobile' : 'is-desktop',
    isInTheme ? 'is-theme' : 'is-home',
    isDragging ? 'is-dragging' : '',
    isWalking ? 'is-walking' : '',
    `face-${facing}`,
    dockSide && !isMobile ? `is-docked dock-${dockSide}` : '',
    isMobile && !mobileExpanded && !panelOpen ? 'is-peeking' : '',
    isMobile && hiddenByScroll && !panelOpen ? 'is-tucked' : '',
    panelOpen ? 'is-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div
        ref={shellRef}
        className={shellClasses}
        style={{
          ['--theme-color' as string]: themeColor,
          ...(isMobile ? {} : { transform: `translate3d(${petPosition.x}px, ${petPosition.y}px, 0)` }),
        }}
      >
        {bubble && !panelOpen && (
          <button
            key={bubble.id}
            type="button"
            className={`guide-pet-bubble is-${bubble.mode} bubble-${bubbleSide === 'left' ? 'left' : 'right'} place-${bubblePlacement} ${bubbleClosing ? 'is-closing' : 'is-opening'}`}
            onClick={openPanel}
            aria-label="打开星仔导览助手"
            style={{ ['--bubble-width' as string]: `${bubbleWidthRem(bubble.text, bubble.mode)}rem` }}
          >
            <div className="guide-pet-bubble-body">
              {bubble.mode === 'emoji' ? (
                <svg className="guide-pet-bubble-frame" viewBox="0 0 128 112" preserveAspectRatio="none" aria-hidden="true">
                  <path className="guide-pet-frame-shadow" d={emojiBubbleFrames[bubbleTail].shadow} />
                  <path className="guide-pet-frame-border" d={emojiBubbleFrames[bubbleTail].border} />
                  <path className="guide-pet-frame-fill" d={emojiBubbleFrames[bubbleTail].fill} />
                </svg>
              ) : (
                <svg className="guide-pet-bubble-frame" viewBox="0 0 320 112" preserveAspectRatio="none" aria-hidden="true">
                  <path className="guide-pet-frame-shadow" d={textBubbleFrames[bubbleTail].shadow} />
                  <path className="guide-pet-frame-border" d={textBubbleFrames[bubbleTail].border} />
                  <path className="guide-pet-frame-fill" d={textBubbleFrames[bubbleTail].fill} />
                </svg>
              )}
              {bubble.mode === 'emoji' ? (
                <span className={`pixel-emoji pixel-emoji-${bubble.emoji ?? 'smile'} pixel-emoji-char`} aria-hidden="true">
                  {petEmojiGlyph[bubble.emoji ?? 'smile']}
                </span>
              ) : (
                <p>
                  <span>{bubble.text}</span>
                  {bubble.emoji && (
                    <span className={`pixel-emoji pixel-emoji-${bubble.emoji} pixel-emoji-char`} aria-hidden="true">
                      {petEmojiGlyph[bubble.emoji]}
                    </span>
                  )}
                </p>
              )}
            </div>
          </button>
        )}

        <button
          ref={spriteWrapRef}
          type="button"
          className={`guide-pet-avatar state-${petState} lean-${dragLean} ${reaction ? reactionClass[reaction] : ''}`}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={clickAvatar}
          aria-label="星仔导览助手"
          title={isMobile ? '点一下和星仔说话' : '拖动移动 · 拖到屏幕边缘可收起 · 点击说话'}
        >
          <span key={`hop-${hop}`} className={`guide-pet-hop ${hop ? 'is-hopping' : ''}`}>
            <span key={`poke-${poke}`} className={`guide-pet-squish ${poke ? 'is-poked' : ''}`}>
              <PetSprite />
            </span>
          </span>
          {mood === 'thinking' && !asleep && (
            <span className="guide-pet-thinking" aria-hidden="true"><i /><i /><i /></span>
          )}
          {mood === 'success' && !asleep && (
            <span className="guide-pet-sparkles" aria-hidden="true"><i /><i /><i /><i /></span>
          )}
          {asleep && (
            <span className="guide-pet-zzz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>
          )}
          {(reaction === 'catch' || reaction === 'read') && (
            <span className="guide-pet-letter" aria-hidden="true">
              <svg viewBox="0 0 14 11" shapeRendering="crispEdges">
                <rect className="letter-edge" x="0" y="0" width="14" height="11" />
                <rect className="letter-paper" x="1" y="1" width="12" height="9" />
                <rect className="letter-fold" x="7" y="1" width="1" height="9" />
                <rect className="letter-ink" x="2" y="3" width="4" height="1" />
                <rect className="letter-ink" x="2" y="5" width="3" height="1" />
                <rect className="letter-ink" x="2" y="7" width="4" height="1" />
                <rect className="letter-ink" x="9" y="3" width="3" height="1" />
                <rect className="letter-ink" x="9" y="5" width="2" height="1" />
                <rect className="letter-stamp" x="9" y="7" width="2" height="2" />
              </svg>
            </span>
          )}
          {emote && (
            <span key={emote.id} className={`guide-pet-emote emote-${emote.type}`} aria-hidden="true">
              <PixelEmote type={emote.type} />
            </span>
          )}
        </button>
      </div>
      {panel && createPortal(panel, document.body)}
    </>
  );
};
