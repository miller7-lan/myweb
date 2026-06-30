import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownRight, LocateFixed, Minus, Search } from 'lucide-react';
import { guideTargets, petPrompts, type GuideTarget, type PetMood } from '../../data/guide';
import { themes } from '../../data/themes';
import { useGalaxyStore, type NonNullThemeKey } from '../../store/useGalaxyStore';

type ChatLine = {
  from: 'pet' | 'user';
  text: string;
};

type PetPosition = {
  x: number;
  y: number;
};

type PixelEmoji = 'sparkle' | 'smile' | 'cool' | 'star' | 'heart';

type BubbleMode = 'text' | 'emoji' | 'mixed';

type IdleAction = 'rest' | 'micro' | 'wave' | 'scan';

type DragDirection = 'idle' | 'left' | 'right';

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  directionAnchorX: number;
  direction: DragDirection;
  originX: number;
  originY: number;
  moved: boolean;
};

type PanelLaunch = {
  x: number;
  y: number;
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

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const petPositionStorageKey = 'galaxy-guide-pet-position';
const petShellWidth = 68;
const petShellHeight = 100;
const petMargin = 12;
const petEmoji: PixelEmoji[] = ['sparkle', 'smile', 'cool', 'star', 'heart'];
const petEmojiGlyph: Record<PixelEmoji, string> = {
  sparkle: '✦',
  smile: '☺',
  cool: '☻',
  star: '★',
  heart: '♥',
};

const defaultPetPosition = (): PetPosition => {
  if (typeof window === 'undefined') return { x: 24, y: 24 };
  return clampPetPosition({
    x: window.innerWidth - petShellWidth - petMargin,
    y: window.innerHeight - petShellHeight - petMargin,
  });
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

const readPetPosition = () => {
  if (typeof window === 'undefined') return defaultPetPosition();
  const stored = window.localStorage.getItem(petPositionStorageKey);
  if (!stored) return defaultPetPosition();

  try {
    const parsed = JSON.parse(stored) as Partial<PetPosition>;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return clampPetPosition({ x: parsed.x, y: parsed.y });
    }
  } catch {
    window.localStorage.removeItem(petPositionStorageKey);
  }

  return defaultPetPosition();
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

const waitForTheme = async (theme: NonNullThemeKey) => {
  const deadline = Date.now() + 4200;
  while (Date.now() < deadline) {
    const state = useGalaxyStore.getState();
    if (state.activeTheme === theme && state.viewState === 'THEME') return true;
    await wait(80);
  }
  return false;
};

const waitForHomeAfterLeaving = async () => {
  const deadline = Date.now() + 2600;
  while (Date.now() < deadline) {
    const current = useGalaxyStore.getState();
    if (!current.activeTheme && (current.viewState === 'HOME' || current.viewState === 'HOVER_PLANET')) break;
    await wait(80);
  }
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

const currentPrompt = (theme: NonNullThemeKey | null) => {
  const key = theme ?? 'HOME';
  return petPrompts.find((prompt) => prompt.theme === key)?.text ?? petPrompts[0].text;
};

const occasionalPixelEmoji = (): PixelEmoji | null => {
  if (Math.random() > 0.34) return null;
  return petEmoji[Math.floor(Math.random() * petEmoji.length)];
};

const randomPixelEmoji = (): PixelEmoji => petEmoji[Math.floor(Math.random() * petEmoji.length)];

const shortBubbleText = (text: string) => {
  if (text.length <= 22) return text;
  return `${text.slice(0, 20)}...`;
};

const randomBubbleMode = (): BubbleMode => {
  const roll = Math.random();
  if (roll < 0.18) return 'emoji';
  if (roll < 0.48) return 'mixed';
  return 'text';
};

const bubbleWidthRem = (text: string, mode: BubbleMode) => {
  if (mode === 'emoji') return 4.6;
  const base = mode === 'mixed' ? 3.8 : 4.4;
  const charWidth = Array.from(text).some((char) => char.codePointAt(0)! > 255) ? 0.58 : 0.38;
  const max = mode === 'mixed' ? 10.8 : 12.25;
  return Math.min(max, Math.max(6.4, base + text.length * charWidth));
};

export const GuidePet: React.FC = () => {
  const { viewState, activeTheme, hoveredPlanet, visualMode, setActiveTheme, setViewState } = useGalaxyStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleClosing, setBubbleClosing] = useState(false);
  const [bubbleText, setBubbleText] = useState(() => petPrompts[0].text);
  const [bubbleEmoji, setBubbleEmoji] = useState<PixelEmoji | null>(null);
  const [bubbleMode, setBubbleMode] = useState<BubbleMode>('text');
  const [inputValue, setInputValue] = useState('');
  const [mood, setMood] = useState<PetMood>('idle');
  const [petPosition, setPetPosition] = useState<PetPosition>(() => readPetPosition());
  const [panelLaunch, setPanelLaunch] = useState<PanelLaunch>({ x: 0, y: 0 });
  const [panelClosing, setPanelClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<DragDirection>('idle');
  const [frameIndex, setFrameIndex] = useState(0);
  const [idleAction, setIdleAction] = useState<IdleAction>('rest');
  const [chatLines, setChatLines] = useState<ChatLine[]>([
    { from: 'pet', text: '导航小助手在线。你可以问我：下载利润助手、看证书、联系你、技术栈。' },
  ]);
  const idleTimerRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const bubbleCloseTimerRef = useRef<number | null>(null);
  const panelOpenTimerRef = useRef<number | null>(null);
  const panelCloseTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const bubbleVisibleRef = useRef(bubbleVisible);
  const bubbleClosingRef = useRef(bubbleClosing);
  const visibleTheme = activeTheme ?? hoveredPlanet;
  const themeColor = visibleTheme ? themes[visibleTheme].color : '#e2e8f0';
  const isInTheme = viewState === 'THEME' || viewState === 'LEAVING_THEME' || viewState === 'ENTERING_THEME';

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

  useEffect(() => {
    bubbleVisibleRef.current = bubbleVisible;
    bubbleClosingRef.current = bubbleClosing;
  }, [bubbleClosing, bubbleVisible]);

  const clearBubbleTimers = useCallback(() => {
    if (bubbleTimerRef.current) {
      window.clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = null;
    }
    if (bubbleCloseTimerRef.current) {
      window.clearTimeout(bubbleCloseTimerRef.current);
      bubbleCloseTimerRef.current = null;
    }
  }, []);

  const hideBubbleImmediately = useCallback(() => {
    clearBubbleTimers();
    bubbleVisibleRef.current = false;
    bubbleClosingRef.current = false;
    setBubbleVisible(false);
    setBubbleClosing(false);
  }, [clearBubbleTimers]);

  const hideBubble = useCallback((force = false) => {
    if (!force && !bubbleVisibleRef.current && !bubbleClosingRef.current) return;
    clearBubbleTimers();
    bubbleClosingRef.current = true;
    setBubbleClosing(true);
    bubbleCloseTimerRef.current = window.setTimeout(() => {
      bubbleVisibleRef.current = false;
      bubbleClosingRef.current = false;
      setBubbleVisible(false);
      setBubbleClosing(false);
      bubbleCloseTimerRef.current = null;
    }, 220);
  }, [clearBubbleTimers]);

  const showBubble = (
    text: string,
    emoji: PixelEmoji | null = occasionalPixelEmoji(),
    mode: BubbleMode = emoji ? 'mixed' : 'text',
    autoHideMs = 4200,
  ) => {
    clearBubbleTimers();
    setBubbleText(mode === 'mixed' ? shortBubbleText(text) : text);
    setBubbleEmoji(mode === 'emoji' ? emoji ?? randomPixelEmoji() : emoji);
    setBubbleMode(mode);
    bubbleVisibleRef.current = true;
    bubbleClosingRef.current = false;
    setBubbleClosing(false);
    setBubbleVisible(true);
    if (autoHideMs > 0) {
      bubbleTimerRef.current = window.setTimeout(() => {
        hideBubble(true);
        bubbleTimerRef.current = null;
      }, autoHideMs);
    }
  };

  const closePanel = () => {
    if (!panelOpen || panelClosing) return;
    if (panelCloseTimerRef.current) window.clearTimeout(panelCloseTimerRef.current);
    setPanelClosing(true);
    panelCloseTimerRef.current = window.setTimeout(() => {
      setPanelOpen(false);
      setPanelClosing(false);
      panelCloseTimerRef.current = null;
    }, 360);
  };

  const showIdleBubble = (text: string) => {
    const mode = randomBubbleMode();
    showBubble(
      text,
      mode === 'text' ? occasionalPixelEmoji() : randomPixelEmoji(),
      mode,
    );
  };

  useEffect(() => {
    const timer = window.setTimeout(() => hideBubble(), 0);
    return () => window.clearTimeout(timer);
  }, [activeTheme, hideBubble]);

  useEffect(() => {
    if (idleTimerRef.current) window.clearInterval(idleTimerRef.current);
    if (visualMode !== 'silent') return;

    idleTimerRef.current = window.setInterval(() => {
      hideBubble();
    }, 9000);

    return () => {
      if (idleTimerRef.current) window.clearInterval(idleTimerRef.current);
    };
  }, [hideBubble, visualMode]);

  useEffect(() => {
    return () => {
      clearBubbleTimers();
      if (panelOpenTimerRef.current) window.clearTimeout(panelOpenTimerRef.current);
      if (panelCloseTimerRef.current) window.clearTimeout(panelCloseTimerRef.current);
    };
  }, [clearBubbleTimers]);

  useEffect(() => {
    let timer: number | null = null;
    let nextActionTimer: number | null = null;
    let startTimer: number | null = null;
    
    const runFrameSequence = async (
      sequence: { frame: number; duration: number; action?: IdleAction }[],
    ) => {
      for (const step of sequence) {
        setIdleAction(step.action ?? 'micro');
        setFrameIndex(step.frame);
        await new Promise(resolve => {
          timer = window.setTimeout(resolve, step.duration);
        });
      }
      setFrameIndex(0);
      setIdleAction('rest');
    };

    const scheduleNextExpression = () => {
      const delay = Math.random() * 3000 + 2600;
      nextActionTimer = window.setTimeout(async () => {
        if (mood === 'idle' || mood === 'curious') {
          const rand = Math.random();
          if (rand < 0.48) {
            await runFrameSequence([{ frame: 1, duration: 140, action: 'micro' }]);
          } else if (rand < 0.68) {
            await runFrameSequence([
              { frame: 1, duration: 110, action: 'micro' },
              { frame: 0, duration: 90, action: 'rest' },
              { frame: 1, duration: 120, action: 'micro' },
            ]);
          } else if (rand < 0.86) {
            await runFrameSequence([
              { frame: 2, duration: 520, action: 'wave' },
              { frame: 3, duration: 520, action: 'wave' },
              { frame: 2, duration: 420, action: 'wave' },
            ]);
          } else {
            await runFrameSequence([
              { frame: 3, duration: 720, action: 'scan' },
              { frame: 1, duration: 160, action: 'scan' },
              { frame: 3, duration: 580, action: 'scan' },
            ]);
          }
        }
        scheduleNextExpression();
      }, delay);
    };

    startTimer = window.setTimeout(() => {
      if (mood === 'thinking') {
        setIdleAction('scan');
        const runThinkingLoop = () => {
          const delay = Math.random() * 2000 + 1500;
          timer = window.setTimeout(async () => {
            setFrameIndex(1);
            await new Promise(r => { timer = window.setTimeout(r, 120); });
            setFrameIndex(3);
            runThinkingLoop();
          }, delay);
        };
        setFrameIndex(3);
        runThinkingLoop();
      } else if (mood === 'guiding') {
        setIdleAction('wave');
        const runGuidingLoop = () => {
          const cycle = [0, 2, 3];
          let step = 0;
          const nextStep = () => {
            setFrameIndex(cycle[step]);
            step = (step + 1) % cycle.length;
            timer = window.setTimeout(nextStep, 250);
          };
          nextStep();
        };
        runGuidingLoop();
      } else if (mood === 'success') {
        setIdleAction('wave');
        const runSuccessLoop = () => {
          const delay = Math.random() * 3000 + 2000;
          timer = window.setTimeout(async () => {
            setFrameIndex(1);
            await new Promise(r => { timer = window.setTimeout(r, 120); });
            setFrameIndex(2);
            runSuccessLoop();
          }, delay);
        };
        setFrameIndex(2);
        runSuccessLoop();
      } else {
        setFrameIndex(0);
        setIdleAction('rest');
        scheduleNextExpression();
      }
    }, 0);

    return () => {
      if (startTimer) window.clearTimeout(startTimer);
      if (timer) window.clearTimeout(timer);
      if (nextActionTimer) window.clearTimeout(nextActionTimer);
      setIdleAction('rest');
    };
  }, [mood]);

  useEffect(() => {
    const handleResize = () => {
      setPetPosition((position) => {
        const next = clampPetPosition(position);
        window.localStorage.setItem(petPositionStorageKey, JSON.stringify(next));
        return next;
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const finishDrag = useCallback((clientX: number, clientY: number) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const finalPosition = clampPetPosition({
      x: dragState.originX + clientX - dragState.startX,
      y: dragState.originY + clientY - dragState.startY,
    });
    setPetPosition(finalPosition);
    window.localStorage.setItem(petPositionStorageKey, JSON.stringify(finalPosition));
    suppressNextClickRef.current = dragState.moved;
    if (dragState.moved && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    dragStateRef.current = null;
    setIsDragging(false);
    setDragDirection('idle');
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const finishFromWindow = (clientX?: number, clientY?: number) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      finishDrag(clientX ?? dragState.lastX, clientY ?? dragState.lastY);
    };
    const handlePointerDone = (event: PointerEvent) => finishFromWindow(event.clientX, event.clientY);
    const handleMouseDone = (event: MouseEvent) => finishFromWindow(event.clientX, event.clientY);
    const handleBlur = () => finishFromWindow();

    window.addEventListener('pointerup', handlePointerDone);
    window.addEventListener('pointercancel', handlePointerDone);
    window.addEventListener('mouseup', handleMouseDone);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('pointerup', handlePointerDone);
      window.removeEventListener('pointercancel', handlePointerDone);
      window.removeEventListener('mouseup', handleMouseDone);
      window.removeEventListener('blur', handleBlur);
    };
  }, [finishDrag, isDragging]);

  const addChat = (line: ChatLine) => {
    setChatLines((lines) => [...lines.slice(-5), line]);
  };

  const ensureTheme = async (theme: NonNullThemeKey) => {
    const state = useGalaxyStore.getState();
    if (state.activeTheme === theme && state.viewState === 'THEME') return true;

    if (state.viewState === 'THEME' && state.activeTheme && state.activeTheme !== theme) {
      setViewState('LEAVING_THEME');
      await waitForHomeAfterLeaving();
    }

    setActiveTheme(theme);
    setViewState('ENTERING_THEME');
    return waitForTheme(theme);
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

    setMood('guiding');
    showBubble(`正在定位：${target.label}`, 'sparkle', 'mixed');
    closePanel();

    const themeReady = await ensureTheme(target.theme);
    if (!themeReady) {
      setMood('curious');
      showBubble('主题还没有完成展开，稍后再试一次。', 'smile', 'mixed');
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
      showBubble('我进入了对应区域，但没有找到可高亮的锚点。', 'smile', 'mixed');
      return false;
    }

    scrollToElement(element);
    await wait(380);
    highlightElement(element);
    setMood('success');
    showBubble(target.description, 'sparkle', 'mixed');
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

    const best = findBestTarget(query);
    if (!best || best.score < 4) {
      setMood('curious');
      const fallback = petPrompts.find((prompt) => prompt.id === 'fail')?.text ?? '我暂时没匹配到目标。';
      showBubble(fallback, 'smile', 'mixed');
      addChat({ from: 'pet', text: fallback });
      return;
    }

    addChat({ from: 'pet', text: `收到，我带你去「${best.target.label}」。` });
    await guideTo(best.target.id);
  };

  const updateDragDirection = (clientX: number, dragState: DragState) => {
    const current = dragState.direction;
    const startDelta = clientX - dragState.startX;
    const anchorDelta = clientX - dragState.directionAnchorX;

    if (current === 'idle') {
      if (startDelta > 5) {
        dragState.directionAnchorX = clientX;
        dragState.direction = 'right';
        setDragDirection('right');
      } else if (startDelta < -5) {
        dragState.directionAnchorX = clientX;
        dragState.direction = 'left';
        setDragDirection('left');
      }
      return;
    }

    if (current === 'right') {
      if (clientX > dragState.directionAnchorX) {
        dragState.directionAnchorX = clientX;
      } else if (anchorDelta < -14) {
        dragState.directionAnchorX = clientX;
        dragState.direction = 'left';
        setDragDirection('left');
      }
      return;
    }

    if (clientX < dragState.directionAnchorX) {
      dragState.directionAnchorX = clientX;
    } else if (anchorDelta > 14) {
      dragState.directionAnchorX = clientX;
      dragState.direction = 'right';
      setDragDirection('right');
    }
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      directionAnchorX: event.clientX,
      direction: 'idle',
      originX: petPosition.x,
      originY: petPosition.y,
      moved: false,
    };
    setIsDragging(true);
    setDragDirection('idle');
    hideBubble();
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    dragState.lastX = event.clientX;
    dragState.lastY = event.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 5) {
      dragState.moved = true;
    }
    updateDragDirection(event.clientX, dragState);

    setPetPosition(clampPetPosition({
      x: dragState.originX + dx,
      y: dragState.originY + dy,
    }));
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    finishDrag(event.clientX, event.clientY);
  };

  const startMouseDrag = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || dragStateRef.current) return;

    dragStateRef.current = {
      pointerId: -1,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      directionAnchorX: event.clientX,
      direction: 'idle',
      originX: petPosition.x,
      originY: petPosition.y,
      moved: false,
    };
    setIsDragging(true);
    setDragDirection('idle');
    hideBubble();

    const handleMove = (moveEvent: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== -1) return;

      const dx = moveEvent.clientX - dragState.startX;
      const dy = moveEvent.clientY - dragState.startY;
      dragState.lastX = moveEvent.clientX;
      dragState.lastY = moveEvent.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 5) {
        dragState.moved = true;
      }
      updateDragDirection(moveEvent.clientX, dragState);

      setPetPosition(clampPetPosition({
        x: dragState.originX + dx,
        y: dragState.originY + dy,
      }));
    };

    const handleUp = (upEvent: MouseEvent) => {
      finishDrag(upEvent.clientX, upEvent.clientY);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const clickAvatar = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    closePanel();
    showIdleBubble(currentPrompt(useGalaxyStore.getState().activeTheme));
  };

  const openPanelFromBubble = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPanelLaunch({
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: rect.top + rect.height / 2 - window.innerHeight / 2,
    });
    setPanelClosing(false);
    hideBubbleImmediately();
    if (panelOpenTimerRef.current) window.clearTimeout(panelOpenTimerRef.current);
    panelOpenTimerRef.current = null;
    setPanelOpen(true);
  };

  const panel = panelOpen ? (
    <div
      className={`guide-pet-panel scan-card ${panelClosing ? 'is-closing' : 'is-opening'}`}
      role="dialog"
      aria-label="网页宠物导览助手"
      style={{
        ['--theme-color' as string]: themeColor,
        ['--guide-panel-launch-x' as string]: `${panelLaunch.x}px`,
        ['--guide-panel-launch-y' as string]: `${panelLaunch.y}px`,
      }}
    >
      <div className="guide-pet-panel-head">
        <div>
          <span className="guide-pet-bubble-kicker">
            <span className="hud-dot" />
            Pixel Navigator
          </span>
          <h2>太空小助手</h2>
        </div>
        <button type="button" onClick={closePanel} aria-label="最小化导览助手">
          <Minus size={16} />
        </button>
      </div>

      <div className="guide-pet-chat">
        {chatLines.map((line, index) => (
          <div key={`${line.from}-${index}`} className={`guide-pet-line ${line.from}`}>
            {line.text}
          </div>
        ))}
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
          placeholder="试试：下载利润助手 / /apk|dmg/i / 证书"
          aria-label="输入导览问题"
        />
        <button type="submit" aria-label="发送导览问题">
          <CornerDownRight size={15} />
        </button>
      </form>

      {inputValue.trim() && (
        <div className="guide-pet-matches" aria-label="高匹配导览结果">
          <div className="guide-pet-matches-head">
            <span>REGEX</span>
            <code>{queryPattern ?? 'INVALID'}</code>
          </div>
          {searchMatches.length > 0 ? (
            searchMatches.map((match) => (
              <button key={match.target.id} type="button" onClick={() => guideTo(match.target.id)}>
                <span className="guide-pet-match-score">{match.confidence}%</span>
                <span className="guide-pet-match-main">
                  <strong>{match.target.label}</strong>
                  <small>{match.reason}</small>
                </span>
                <span className="guide-pet-match-theme">{themes[match.target.theme].label}</span>
              </button>
            ))
          ) : (
            <div className="guide-pet-match-empty">没有找到高匹配结果</div>
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
  const bubbleWidth = bubbleWidthRem(bubbleText, bubbleMode);
  const bubbleSide =
    typeof window !== 'undefined' && petPosition.x < window.innerWidth * 0.46
      ? 'right'
      : 'left';
  const textBubbleFrame =
    bubbleSide === 'right'
      ? {
          shadow: 'M20 8h276v8h12v12h8v52h-8v12H76v12H56V92H20v-8H8V20h12z',
          border: 'M16 0h280v8h16v16h8v56h-8v16H80v16H52V96H16v-8H0V16h16z',
          fill: 'M20 8h272v8h12v12h8v48h-8v12H72v16H60V88H20v-8H8V24h12z',
        }
      : {
          shadow: 'M20 8h276v8h12v12h8v52h-8v12h-56v12h-20V92H20v-8H8V20h12z',
          border: 'M16 0h280v8h16v16h8v56h-8v16h-52v16h-28V96H16v-8H0V16h16z',
          fill: 'M20 8h272v8h12v12h8v48h-8v12h-56v16h-12V88H20v-8H8V24h12z',
        };
  const emojiBubbleFrame =
    bubbleSide === 'right'
      ? {
          shadow: 'M24 4h80v8h12v12h8v56h-8v12H76v8H56v8H40v-8H28v-8H12V80H4V28h8V16h12z',
          border: 'M20 0h80v8h12v12h8v56h-8v12H78v8H58v12H42V96H24v-8H8V76H0V24h8V12h12z',
          fill: 'M24 8h72v8h12v12h8v44h-8v12H74v8H58v12h-8V92H28v-8H12V72H4V28h8V16h12z',
        }
      : {
          shadow: 'M24 4h80v8h12v12h8v56h-8v12H96v8H72v8H56v-8H28v-8H12V80H4V28h8V16h12z',
          border: 'M20 0h80v8h12v12h8v56h-8v12H96v8H70v12H54V96H24v-8H8V76H0V24h8V12h12z',
          fill: 'M24 8h72v8h12v12h8v44h-8v12H92v8H66v12h-8V92H28v-8H12V72H4V28h8V16h12z',
        };

  return (
    <>
      <div
        className={`guide-pet-shell ${isInTheme ? 'is-theme' : 'is-home'} ${panelOpen ? 'is-open' : ''} ${isDragging ? 'is-dragging' : ''} drag-${dragDirection}`}
        style={{
          ['--theme-color' as string]: themeColor,
          transform: `translate3d(${petPosition.x}px, ${petPosition.y}px, 0)`,
        }}
      >
        {(bubbleVisible || bubbleClosing) && (!panelOpen || bubbleClosing) && (
          <button
            type="button"
            className={`guide-pet-bubble is-${bubbleMode} bubble-${bubbleSide} ${bubbleClosing ? 'is-closing' : 'is-opening'}`}
            onClick={openPanelFromBubble}
            aria-label="打开网页宠物导览助手"
            style={{ ['--bubble-width' as string]: `${bubbleWidth}rem` }}
          >
            <div className="guide-pet-bubble-body">
              {bubbleMode === 'emoji' ? (
                <svg className="guide-pet-bubble-frame" viewBox="0 0 128 112" preserveAspectRatio="none" aria-hidden="true">
                  <path className="guide-pet-frame-shadow" d={emojiBubbleFrame.shadow} />
                  <path className="guide-pet-frame-border" d={emojiBubbleFrame.border} />
                  <path className="guide-pet-frame-fill" d={emojiBubbleFrame.fill} />
                </svg>
              ) : (
                <svg className="guide-pet-bubble-frame" viewBox="0 0 320 112" preserveAspectRatio="none" aria-hidden="true">
                  <path className="guide-pet-frame-shadow" d={textBubbleFrame.shadow} />
                  <path className="guide-pet-frame-border" d={textBubbleFrame.border} />
                  <path className="guide-pet-frame-fill" d={textBubbleFrame.fill} />
                </svg>
              )}
              {bubbleMode === 'emoji' ? (
                <span
                  className={`pixel-emoji pixel-emoji-${bubbleEmoji ?? 'smile'} pixel-emoji-char`}
                  aria-hidden="true"
                >
                  {petEmojiGlyph[bubbleEmoji ?? 'smile']}
                </span>
              ) : (
                <p>
                  <span>{bubbleText}</span>
                  {bubbleEmoji && (
                    <span className={`pixel-emoji pixel-emoji-${bubbleEmoji} pixel-emoji-char`} aria-hidden="true">
                      {petEmojiGlyph[bubbleEmoji]}
                    </span>
                  )}
                </p>
              )}
            </div>
          </button>
        )}

        <button
          type="button"
          className={`guide-pet-avatar mood-${mood} action-${idleAction}`}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onMouseDown={startMouseDrag}
          onClick={clickAvatar}
          aria-label="打开像素太空导览助手"
          title="拖动移动 · 点击打开像素太空导览助手"
        >
          <span
            className="guide-pet-sprite"
            aria-hidden="true"
            style={{ backgroundPosition: `${(frameIndex * 100) / 3}% 0` }}
          />
        </button>
      </div>
      {panel && createPortal(panel, document.body)}
    </>
  );
};
