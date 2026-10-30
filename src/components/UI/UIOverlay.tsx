import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, Gauge, Lock, LogOut, Moon, Pencil, Plus, RefreshCw, Save, Sparkles, Trash2, Upload, type LucideIcon } from 'lucide-react';
import { themeCount, useGalaxyStore, type NonNullThemeKey, type VisualMode } from '../../store/useGalaxyStore';
import { themes } from '../../data/themes';
import { canRaid } from '../../utils/raid';
import { canStartFinale } from '../../utils/finale';
import { announceSiteContent } from '../../utils/useSiteContent';
import {
  createCertificateAddon,
  createCreationAddon,
  createIdentityAddon,
  defaultSiteContent,
  type CreationAddon,
  type DynamicCertificate,
  type IdentityAddon,
  type SiteContentDocument,
} from '../../data/siteContent';

type AnnouncementItem = {
  code: string;
  title: string;
  detail: string;
};

type AnnouncementDocument = {
  title: string;
  subtitle: string;
  status: string;
  items: AnnouncementItem[];
  updatedAt: string;
  updatedBy: string;
};

type AdminSession = {
  authenticated: boolean;
  username: string | null;
  csrf: string | null;
};

type AdminContentTab = 'announcement' | 'identity' | 'certificates' | 'creations';

const defaultAnnouncement: AnnouncementDocument = {
  title: 'DAZZLE 更新说明',
  subtitle: '版本 2026.05.21 · 性能与稳定性优化',
  status: 'Ready',
  updatedAt: '2026-05-21T00:00:00.000Z',
  updatedBy: 'system',
  items: [
    {
      code: 'PERF',
      title: '场景性能优化',
      detail: '优化动画帧内的数据同步，减少不必要的 React / Zustand 更新。',
    },
    {
      code: 'GC',
      title: '内存分配收敛',
      detail: '复用星球、流星、飞船和鼠标光源计算中的临时对象，降低 GC 抖动。',
    },
    {
      code: 'VISUAL',
      title: '效果保持不变',
      detail: '保留当前视觉效果、交互节奏和动效参数，仅做底层稳定性清理。',
    },
  ],
};

const emptyAdminSession: AdminSession = {
  authenticated: false,
  username: null,
  csrf: null,
};

const createEmptyAnnouncementItem = (): AnnouncementItem => ({
  code: 'NOTE',
  title: '',
  detail: '',
});

const splitListInput = (value: string, limit = 8) =>
  value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);

const joinListInput = (items: string[]) => items.join('，');

/**
 * A comma-separated list field (tags, highlights). It keeps exactly what is
 * being typed, trailing comma or space included, and hands back the split
 * list; the text is only rebuilt when the list changes from outside (a load
 * or a save).
 */
const ListInput: React.FC<Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string[];
  onChange: (items: string[]) => void;
}> = ({ value, onChange, ...props }) => {
  const [text, setText] = useState(() => joinListInput(value));
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    if (splitListInput(text).join('\n') !== value.join('\n')) setText(joinListInput(value));
  }
  return (
    <input
      {...props}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(splitListInput(event.target.value));
      }}
    />
  );
};

/** On a save button: there are edits that are not saved yet. */
const UnsavedMark: React.FC = () => (
  <>
    <span aria-hidden="true" title="有未保存的修改" className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fcd34d]" />
    <span className="sr-only">（有未保存的修改）</span>
  </>
);

// What an editor holds, without the save stamps: drafts with the same content are the same.
const announcementContent = (doc: AnnouncementDocument) => JSON.stringify([doc.title, doc.subtitle, doc.status, doc.items]);
const siteContentEntries = (doc: SiteContentDocument) => JSON.stringify([doc.identityAddons, doc.certificates, doc.creationAddons]);

const entryLabel = (index: number) => String(index + 1).padStart(2, '0');

/** Why the announcement can't be saved yet (the server would refuse it), or null. */
const announcementProblem = (draft: AnnouncementDocument) => {
  if (draft.items.length === 0) return '至少保留一条公告';
  for (const [index, item] of draft.items.entries()) {
    const missing = [!item.code.trim() && '代码', !item.title.trim() && '标题', !item.detail.trim() && '详情'].filter(Boolean);
    if (missing.length) return `条目 ${entryLabel(index)} 还缺${missing.join('、')}`;
  }
  return null;
};

/** The same for 个人介绍, 奖状 and 作品. */
const siteContentProblem = (draft: SiteContentDocument) => {
  const identity = draft.identityAddons.findIndex((item) => !item.title.trim() || !item.body.trim());
  if (identity >= 0) return `个人介绍 ${entryLabel(identity)} 需要标题和内容`;
  const certificate = draft.certificates.findIndex((item) => !item.title.trim() || !item.imageKey);
  if (certificate >= 0) {
    return draft.certificates[certificate].imageKey ? `奖状 ${entryLabel(certificate)} 需要标题` : `奖状 ${entryLabel(certificate)} 还没上传图片`;
  }
  const creation = draft.creationAddons.findIndex((item) => !item.title.trim() || !item.description.trim());
  if (creation >= 0) return `作品 ${entryLabel(creation)} 需要名称和介绍`;
  return null;
};

// An emptied 排序 field is NaN while editing (so it can be cleared and
// retyped); it saves as the entry's position.
const readSortOrder = (value: string) => (value.trim() === '' ? Number.NaN : Number(value));
const withSortOrders = <T extends { sortOrder: number }>(items: T[]) =>
  items.map((item, index) => (Number.isFinite(item.sortOrder) ? item : { ...item, sortOrder: index }));

/** A response's JSON, or {} when the body isn't JSON (a gateway error page, say). */
const readJson = async <T,>(response: Response): Promise<T & { error?: string }> => {
  try {
    return await response.json() as T & { error?: string };
  } catch {
    return {} as T & { error?: string };
  }
};

const maxUploadSide = 2400;

/**
 * Re-encodes an image before it is uploaded: phone photos are often over the
 * 4 MB limit, and re-encoding also drops their metadata (EXIF can hold where
 * a photo was taken). PNG stays PNG unless it is still too big.
 */
const prepareUpload = async (file: File): Promise<File> => {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxUploadSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    const encode = (type: string, background?: string, quality?: number) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (background) {
        context.fillStyle = background;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(bitmap!, 0, 0, canvas.width, canvas.height);
      return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    };
    let blob = file.type === 'image/png' ? await encode('image/png') : null;
    if (!blob || blob.size > 3.8 * 1024 * 1024) {
      blob = file.type === 'image/webp' ? await encode('image/webp', undefined, 0.9) : await encode('image/jpeg', '#ffffff', 0.88);
    }
    if (!blob) return file;
    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'certificate'}.${extension}`, { type: blob.type });
  } catch {
    // Not something this browser can decode: let the server judge the original.
    return file;
  } finally {
    bitmap?.close();
  }
};

const visualModes: Array<{
  key: VisualMode;
  label: string;
  zh: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}> = [
  { key: 'cinematic', label: 'Cinematic', zh: '全效', title: 'Cinematic · 全效', description: '粒子、流星和光效全部开启', Icon: Sparkles },
  { key: 'focus', label: 'Focus', zh: '清晰', title: 'Focus · 清晰', description: '减弱动效，让文字和星球更清楚', Icon: Gauge },
  { key: 'silent', label: 'Silent', zh: '低功耗', title: 'Silent · 低功耗', description: '只保留必要动画，适合省电', Icon: Moon },
];

const ExplorationStars: React.FC<{
  visitedThemes: Partial<Record<NonNullThemeKey, boolean>>;
  activeKey?: NonNullThemeKey | null;
}> = ({ visitedThemes, activeKey }) => (
  <span className="exploration-stars" aria-hidden="true">
    {Object.values(themes).map((theme) => {
      const key = theme.key as NonNullThemeKey;
      return (
        <span
          key={key}
          className={`exploration-star ${visitedThemes[key] ? 'is-lit' : ''} ${activeKey === key ? 'is-active' : ''}`}
          style={{ ['--theme-color' as string]: theme.color }}
        />
      );
    })}
  </span>
);

const themeList = Object.values(themes);

export const UIOverlay: React.FC = () => {
  const { viewState, hoveredPlanet, visitedThemes, lastVisitedTheme, completionPulseId, visualMode, setVisualMode, setViewState, setHoveredPlanet, setActiveTheme } = useGalaxyStore();
  const transitionStyle = useGalaxyStore((state) => state.transitionStyle);
  const setTransitionStyle = useGalaxyStore((state) => state.setTransitionStyle);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementClosing, setAnnouncementClosing] = useState(false);
  const [announcement, setAnnouncement] = useState<AnnouncementDocument>(defaultAnnouncement);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementNotice, setAnnouncementNotice] = useState('');
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminSession>(emptyAdminSession);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [editorDraft, setEditorDraft] = useState<AnnouncementDocument>(defaultAnnouncement);
  const [siteDraft, setSiteDraft] = useState<SiteContentDocument>(defaultSiteContent);
  // What each editor was last loaded or saved from: a draft that differs has
  // unsaved edits, and no refresh overwrites them.
  const [editorBaseline, setEditorBaseline] = useState<AnnouncementDocument>(defaultAnnouncement);
  const [siteBaseline, setSiteBaseline] = useState<SiteContentDocument>(defaultSiteContent);
  const announcementDirty = announcementContent(editorDraft) !== announcementContent(editorBaseline);
  const siteDirty = siteContentEntries(siteDraft) !== siteContentEntries(siteBaseline);
  const announcementDirtyRef = useRef(false);
  const siteDirtyRef = useRef(false);
  // The newest announcement seen: a refresh that brings back an older one
  // (the store still catching up after a save) is ignored.
  const latestAnnouncementAtRef = useRef(0);
  // A click only closes the dialog if it also started on the backdrop, so a
  // text selection dragged out of a field doesn't close it.
  const backdropPressRef = useRef(false);
  const [adminContentTab, setAdminContentTab] = useState<AdminContentTab>('announcement');
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [uploadingCertificateId, setUploadingCertificateId] = useState<string | null>(null);
  const [isMobilePortrait, setIsMobilePortrait] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
  const announcementButtonRef = useRef<HTMLButtonElement>(null);
  const announcementPanelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const finaleRunning = useGalaxyStore((state) => Boolean(state.finale));
  const requestFinale = useGalaxyStore((state) => state.requestFinale);
  const isVisible = (viewState === 'HOME' || viewState === 'HOVER_PLANET') && !finaleRunning;
  const focusedTheme = hoveredPlanet ? themes[hoveredPlanet] : null;
  const lastVisited = lastVisitedTheme ? themes[lastVisitedTheme] : null;
  const visitedCount = themeListLength(visitedThemes);
  const isComplete = visitedCount === themeCount;
  const hudThemeColor = focusedTheme?.color ?? (isComplete ? '#f8fafc' : lastVisited?.color) ?? '#e2e8f0';
  const focusedThemeKey = focusedTheme?.key as NonNullThemeKey | undefined;
  const hudTitle = focusedTheme && focusedThemeKey
    ? visitedThemes[focusedThemeKey] ? '再次锁定' : '信号锁定'
    : completionPulseId > 0 && isComplete
      ? '星图已全部点亮'
      : '探索进度';
  const hudText = focusedTheme && focusedThemeKey
    ? `${focusedTheme.chineseName} · ${focusedTheme.tagline}`
    : completionPulseId > 0 && isComplete
      ? `${themeCount} 个模块都已探索，随时可以重访`
      : lastVisited
        ? `上次停留：${lastVisited.chineseName} · 已点亮 ${visitedCount}/${themeCount}`
        : `点击星球或导航进入档案 · 已点亮 ${visitedCount}/${themeCount}`;
  const activeVisualMode = visualModes.find((mode) => mode.key === visualMode) ?? visualModes[0];
  const ActiveVisualModeIcon = activeVisualMode.Icon;
  const [visualMenuOpen, setVisualMenuOpen] = useState(false);
  const visualMenuRef = useRef<HTMLDivElement>(null);
  const raidActive = useGalaxyStore((state) => Boolean(state.raid));
  const requestRaid = useGalaxyStore((state) => state.requestRaid);
  const openAnnouncement = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setAnnouncementClosing(false);
    setAnnouncementOpen(true);
  }, []);
  const closeAnnouncement = useCallback(() => {
    if (!announcementOpen || announcementClosing) return;
    setAnnouncementClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setAnnouncementOpen(false);
      setAnnouncementClosing(false);
      closeTimerRef.current = null;
    }, 360);
  }, [announcementClosing, announcementOpen]);
  const toggleAnnouncement = useCallback(() => {
    if (announcementOpen) {
      closeAnnouncement();
    } else {
      openAnnouncement();
    }
  }, [announcementOpen, closeAnnouncement, openAnnouncement]);
  const loadAnnouncement = useCallback(async (silent = false) => {
    if (!silent) setAnnouncementLoading(true);
    try {
      const response = await fetch('/api/announcements', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('announcement api unavailable');
      const payload = await response.json() as { announcement?: AnnouncementDocument };
      const next = payload.announcement;
      const nextAt = Date.parse(next?.updatedAt ?? '');
      if (!next || nextAt < latestAnnouncementAtRef.current) return;
      if (Number.isFinite(nextAt)) latestAnnouncementAtRef.current = nextAt;
      setAnnouncement(next);
      // The editor follows the live version only while it has no unsaved edits.
      if (!announcementDirtyRef.current) {
        setEditorDraft(next);
        setEditorBaseline(next);
      }
    } catch {
      // Keep what is shown: a failed refresh is no reason to drop it.
    } finally {
      if (!silent) setAnnouncementLoading(false);
    }
  }, []);
  const loadSiteContent = useCallback(async () => {
    try {
      const response = await fetch('/api/site-content', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('site content unavailable');
      const payload = await response.json() as { siteContent?: SiteContentDocument };
      if (!payload.siteContent || siteDirtyRef.current) return;
      setSiteDraft(payload.siteContent);
      setSiteBaseline(payload.siteContent);
    } catch {
      // Keep the draft as it is.
    }
  }, []);
  const checkAdminSession = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/session', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('session unavailable');
      const payload = await response.json() as AdminSession;
      setAdminSession({
        authenticated: Boolean(payload.authenticated),
        username: payload.username ?? null,
        csrf: payload.csrf ?? null,
      });
    } catch {
      // Offline for a moment: stay signed in rather than dropping to the login form.
    }
  }, []);
  // The session ran out (it lasts 12 hours): back to the login form, with
  // every unsaved edit kept for after signing in again.
  const expireSession = useCallback(() => {
    setAdminSession(emptyAdminSession);
    setAdminError('登录已过期，请重新登录。未保存的修改都还在，登录后再保存即可');
  }, []);
  const openAdminPanel = useCallback(() => {
    setAdminPanelOpen((open) => !open);
    setAdminError('');
    setAnnouncementNotice('');
    void checkAdminSession();
  }, [checkAdminSession]);
  const handleLogin = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminBusy(true);
    setAdminError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const payload = await response.json() as AdminSession & { ok?: boolean; error?: string };
      if (!response.ok || !payload.authenticated && !payload.csrf) {
        throw new Error(payload.error || '登录失败');
      }
      setAdminSession({
        authenticated: true,
        username: payload.username ?? loginForm.username,
        csrf: payload.csrf ?? null,
      });
      setLoginForm({ username: '', password: '' });
      setAnnouncementNotice('已进入公告编辑模式');
      void loadSiteContent();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : '登录失败');
    } finally {
      setAdminBusy(false);
    }
  }, [loadSiteContent, loginForm]);
  const handleLogout = useCallback(async () => {
    setAdminBusy(true);
    setAdminError('');
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
    } finally {
      setAdminSession(emptyAdminSession);
      setAdminContentTab('announcement');
      setAdminBusy(false);
      setAnnouncementNotice('已退出管理模式');
    }
  }, []);
  const updateDraftItem = useCallback((index: number, field: keyof AnnouncementItem, value: string) => {
    setEditorDraft((draft) => ({
      ...draft,
      items: draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  }, []);
  const addDraftItem = useCallback(() => {
    setEditorDraft((draft) => ({
      ...draft,
      items: draft.items.length >= 5 ? draft.items : [...draft.items, createEmptyAnnouncementItem()],
    }));
  }, []);
  const removeDraftItem = useCallback((index: number) => {
    setEditorDraft((draft) => ({
      ...draft,
      items: draft.items.length <= 1 ? draft.items : draft.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }, []);
  const saveAnnouncement = useCallback(async () => {
    if (!adminSession.csrf) {
      expireSession();
      return;
    }
    const problem = announcementProblem(editorDraft);
    if (problem) {
      setAdminError(problem);
      return;
    }
    setAdminBusy(true);
    setAdminError('');
    try {
      const response = await fetch('/api/announcements', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-gp-admin-csrf': adminSession.csrf,
        },
        body: JSON.stringify(editorDraft),
      });
      const payload = await readJson<{ announcement?: AnnouncementDocument }>(response);
      if (response.status === 401) {
        expireSession();
        return;
      }
      if (!response.ok || !payload.announcement) {
        throw new Error(payload.error || `保存失败（${response.status}）`);
      }
      latestAnnouncementAtRef.current = Date.parse(payload.announcement.updatedAt) || Date.now();
      setAnnouncement(payload.announcement);
      setEditorDraft(payload.announcement);
      setEditorBaseline(payload.announcement);
      setAnnouncementNotice('公告已同步到线上');
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setAdminBusy(false);
    }
  }, [adminSession.csrf, editorDraft, expireSession]);
  const saveSiteContent = useCallback(async () => {
    if (!adminSession.csrf) {
      expireSession();
      return;
    }
    const problem = siteContentProblem(siteDraft);
    if (problem) {
      setAdminError(problem);
      return;
    }
    setAdminBusy(true);
    setAdminError('');
    try {
      const response = await fetch('/api/site-content', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-gp-admin-csrf': adminSession.csrf,
        },
        body: JSON.stringify({
          ...siteDraft,
          identityAddons: withSortOrders(siteDraft.identityAddons),
          certificates: withSortOrders(siteDraft.certificates),
          creationAddons: withSortOrders(siteDraft.creationAddons),
        }),
      });
      const payload = await readJson<{ siteContent?: SiteContentDocument }>(response);
      if (response.status === 401) {
        expireSession();
        return;
      }
      if (!response.ok || !payload.siteContent) {
        throw new Error(payload.error || `保存失败（${response.status}）`);
      }
      setSiteDraft(payload.siteContent);
      setSiteBaseline(payload.siteContent);
      setAnnouncementNotice('内容已同步到线上');
      announceSiteContent(payload.siteContent);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setAdminBusy(false);
    }
  }, [adminSession.csrf, expireSession, siteDraft]);
  const uploadCertificateImage = useCallback(async (certificateId: string, file: File | undefined) => {
    if (!file) return;
    if (!adminSession.csrf) {
      expireSession();
      return;
    }
    setUploadingCertificateId(certificateId);
    setAdminError('');
    try {
      const formData = new FormData();
      formData.append('file', await prepareUpload(file));
      const response = await fetch('/api/site-content/assets', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'x-gp-admin-csrf': adminSession.csrf,
        },
        body: formData,
      });
      const payload = await readJson<{ asset?: { key: string; url: string } }>(response);
      if (response.status === 401) {
        expireSession();
        return;
      }
      if (!response.ok || !payload.asset) {
        throw new Error(payload.error || `上传失败（${response.status}）`);
      }
      setSiteDraft((draft) => ({
        ...draft,
        certificates: draft.certificates.map((certificate) => certificate.id === certificateId
          ? { ...certificate, imageKey: payload.asset!.key, imageUrl: payload.asset!.url }
          : certificate),
      }));
      setAnnouncementNotice('图片已上传，点「保存内容」后前台显示');
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploadingCertificateId(null);
    }
  }, [adminSession.csrf, expireSession]);

  const updateIdentityAddon = useCallback((index: number, patch: Partial<IdentityAddon>) => {
    setSiteDraft((draft) => ({
      ...draft,
      identityAddons: draft.identityAddons.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }, []);
  const updateCertificateAddon = useCallback((index: number, patch: Partial<DynamicCertificate>) => {
    setSiteDraft((draft) => ({
      ...draft,
      certificates: draft.certificates.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }, []);
  const updateCreationAddon = useCallback((index: number, patch: Partial<CreationAddon>) => {
    setSiteDraft((draft) => ({
      ...draft,
      creationAddons: draft.creationAddons.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }, []);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobilePortrait(window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnnouncement(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAnnouncement]);

  useEffect(() => {
    if (!visualMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!visualMenuRef.current?.contains(event.target as Node)) setVisualMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setVisualMenuOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visualMenuOpen]);

  useEffect(() => {
    if (!announcementOpen) return;
    const timeoutId = window.setTimeout(() => {
      void loadAnnouncement(true);
    }, 0);
    const intervalId = window.setInterval(() => {
      void loadAnnouncement(true);
    }, 30000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [announcementOpen, loadAnnouncement]);

  useEffect(() => {
    if (!adminPanelOpen || !adminSession.authenticated) return;
    const timeoutId = window.setTimeout(() => {
      void loadSiteContent();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [adminPanelOpen, adminSession.authenticated, loadSiteContent]);

  useEffect(() => {
    announcementDirtyRef.current = announcementDirty;
    siteDirtyRef.current = siteDirty;
  }, [announcementDirty, siteDirty]);

  // While the admin edits, the galaxy behind the dialog holds still: it is
  // under a blurred glass panel, and redrawing it every frame made typing lag.
  const adminEditing = announcementOpen && adminPanelOpen && adminSession.authenticated;
  const setSceneHeld = useGalaxyStore((state) => state.setSceneHeld);
  useEffect(() => {
    setSceneHeld(adminEditing);
    return () => setSceneHeld(false);
  }, [adminEditing, setSceneHeld]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return;
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      if (isTyping) return;

      if (event.key === 'Escape' && announcementOpen) {
        event.preventDefault();
        closeAnnouncement();
        return;
      }
      // The planet shortcuts don't reach past the open announcement dialog.
      if (announcementOpen) return;

      const currentIndex = hoveredPlanet ? themeList.findIndex((theme) => theme.key === hoveredPlanet) : -1;
      const lockTheme = (index: number) => {
        const theme = themeList[(index + themeList.length) % themeList.length];
        setHoveredPlanet(theme.key);
        setViewState('HOVER_PLANET');
      };

      const requestedThemeIndex = Number(event.key) - 1;
      if (Number.isInteger(requestedThemeIndex) && requestedThemeIndex >= 0 && requestedThemeIndex < themeList.length) {
        event.preventDefault();
        lockTheme(requestedThemeIndex);
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
  }, [announcementOpen, closeAnnouncement, hoveredPlanet, isVisible, setActiveTheme, setHoveredPlanet, setViewState]);

  useEffect(() => {
    if (!announcementOpen || !announcementPanelRef.current || !announcementButtonRef.current) return;

    const buttonRect = announcementButtonRef.current.getBoundingClientRect();
    const panelRect = announcementPanelRef.current.getBoundingClientRect();
    const originX = buttonRect.left + buttonRect.width / 2 - panelRect.left;
    const originY = buttonRect.top + buttonRect.height / 2 - panelRect.top;
    announcementPanelRef.current.style.setProperty('--announcement-origin-x', `${originX}px`);
    announcementPanelRef.current.style.setProperty('--announcement-origin-y', `${originY}px`);
  }, [announcementOpen]);

  useEffect(() => () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  return (
    <div inert={!isVisible} className={`home-interface absolute inset-0 pointer-events-none transition-opacity duration-700 ${announcementOpen ? 'z-[140]' : 'z-10'} ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <nav aria-label="主题导航" className="home-navigation absolute top-0 left-0 hidden w-full p-8 md:flex justify-center pointer-events-auto">
        <ul className="hud-panel no-scrollbar flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-full px-3 py-2 md:gap-2 md:px-4">
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
                <span aria-hidden="true" className={`nav-visited text-[9px] uppercase tracking-[0.18em] transition-opacity ${visited ? 'opacity-70' : 'opacity-0'}`}>Visited</span>
                <span className={`absolute left-4 right-4 -bottom-px h-px bg-[var(--theme-color)] shadow-[0_0_12px_var(--theme-color)] transition-opacity duration-300 ${hoveredPlanet === themeKey || isLastVisited ? 'opacity-100' : visited ? 'opacity-45' : 'opacity-0 group-hover:opacity-70'}`} />
                <span className={`absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-color)] to-transparent transition-opacity duration-300 ${hoveredPlanet === themeKey || isLastVisited ? 'opacity-70' : 'opacity-0 group-hover:opacity-40'}`} />
              </button>
            </li>
          );
          })}
        </ul>
      </nav>

      <nav className={`absolute bottom-4 left-0 w-full justify-center px-4 pointer-events-auto md:hidden ${isMobilePortrait ? 'hidden' : 'flex'}`}>
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
                <span className="max-w-full truncate text-xs font-medium">{theme.chineseName}</span>
                <span className="text-[10px] tracking-wider text-gray-500 group-hover:text-gray-300">{visited ? '已探索' : theme.label}</span>
              </button>
            </li>
          );
          })}
        </ul>
      </nav>

      <div
        ref={visualMenuRef}
        className="visual-mode-control pointer-events-auto absolute left-4 top-4 md:left-8 md:top-28"
        style={{ ['--theme-color' as string]: hudThemeColor }}
      >
        <button
          type="button"
          onClick={() => setVisualMenuOpen((open) => !open)}
          className="visual-mode-trigger hud-panel"
          aria-haspopup="menu"
          aria-expanded={visualMenuOpen}
          aria-label={`视觉模式：${activeVisualMode.title}`}
        >
          <ActiveVisualModeIcon size={15} />
          <span className="visual-mode-label">视觉<span aria-hidden="true">·</span><strong>{activeVisualMode.zh}</strong></span>
          <ChevronDown size={13} className={`transition-transform duration-300 ${visualMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {(viewState === 'HOME' || viewState === 'HOVER_PLANET') && (
          <button
            type="button"
            className="ufo-trigger hud-panel"
            onClick={() => { if (canRaid()) requestRaid(); }}
            disabled={raidActive}
            aria-label="召唤外星飞船"
            title="召唤外星飞船"
          >
            UFO
          </button>
        )}
        {visualMenuOpen && (
          <div className="visual-mode-menu hud-panel" role="menu" aria-label="选择视觉模式">
            {visualModes.map((mode) => {
              const ModeIcon = mode.Icon;
              const selected = mode.key === visualMode;
              return (
                <button
                  key={mode.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`visual-mode-option ${selected ? 'is-selected' : ''}`}
                  onClick={() => {
                    setVisualMode(mode.key);
                    setVisualMenuOpen(false);
                  }}
                >
                  <span className="visual-mode-option-icon"><ModeIcon size={15} /></span>
                  <span className="min-w-0">
                    <span className="visual-mode-option-title">{mode.zh}<em>{mode.label}</em></span>
                    <span className="visual-mode-option-desc">{mode.description}</span>
                  </span>
                  {selected && <Check size={14} className="ml-auto shrink-0" />}
                </button>
              );
            })}
            <div className="transition-style-row">
              <span className="transition-style-label">
                转场动画
                <em>{visualMode === 'silent' ? '低功耗模式下自动简短' : transitionStyle === 'full' ? '黑洞或虫洞，随机' : '快速黑洞'}</em>
              </span>
              <span className="transition-style-toggle" role="group" aria-label="转场动画">
                {(['full', 'short'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    role="menuitemradio"
                    aria-checked={transitionStyle === style}
                    className={transitionStyle === style ? 'is-selected' : ''}
                    onClick={() => setTransitionStyle(style)}
                  >
                    {style === 'full' ? '动效' : '简短'}
                  </button>
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={`home-status absolute left-1/2 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 md:bottom-8 md:left-8 md:w-auto md:translate-x-0 ${isMobilePortrait ? 'bottom-6' : 'bottom-[6rem]'}`}>
        <div
          className="hud-panel home-status-card"
          style={{ ['--theme-color' as string]: hudThemeColor }}
          aria-live="polite"
        >
          <div className="home-status-head">
            {isComplete && !focusedTheme ? (
              // Everything lit: the title takes the visitor out to the finale again.
              <button
                type="button"
                className="hud-kicker home-status-replay pointer-events-auto"
                onClick={() => { if (canStartFinale()) requestFinale(); }}
                title="再去一次：总有一个星系属于你"
              >
                <span className="hud-dot" />
                <span>{hudTitle}</span>
                <ArrowUpRight size={12} aria-hidden="true" />
              </button>
            ) : (
              <span className="hud-kicker">
                <span className="hud-dot" />
                <span>{hudTitle}</span>
              </span>
            )}
            <ExplorationStars visitedThemes={visitedThemes} activeKey={focusedThemeKey ?? (lastVisitedTheme as NonNullThemeKey | null)} />
          </div>
          <p>{hudText}</p>
        </div>
      </div>

      <button
        ref={announcementButtonRef}
        type="button"
        onClick={toggleAnnouncement}
        className={`announcement-control hud-panel pointer-events-auto absolute right-4 top-4 flex items-center gap-2 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-gray-500 transition-all duration-300 hover:-translate-y-0.5 hover:text-gray-200 focus:outline-none focus-visible:text-white md:right-8 md:top-28 ${announcementOpen ? 'announcement-button-active text-gray-200' : ''}`}
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
          className={`announcement-backdrop pointer-events-auto absolute inset-0 z-[150] flex items-start justify-center overflow-y-auto px-4 py-4 sm:items-center ${announcementClosing ? 'is-closing' : 'is-opening'}`}
          role="dialog"
          aria-modal="true"
          aria-label="最近更新公告"
          onPointerDown={(event) => { backdropPressRef.current = event.target === event.currentTarget; }}
          onClick={(event) => {
            if (backdropPressRef.current && event.target === event.currentTarget) closeAnnouncement();
            backdropPressRef.current = false;
          }}
        >
          <div
            ref={announcementPanelRef}
            className={`announcement-card hud-panel relative z-[160] w-[min(34rem,calc(100vw-2rem))] rounded-[1.75rem] px-5 py-5 shadow-[0_0_80px_color-mix(in_srgb,var(--theme-color)_12%,transparent)] md:px-6 md:py-6 ${announcementClosing ? 'is-closing' : 'is-opening'}`}
            style={{
              ['--theme-color' as string]: hudThemeColor,
              ['--hud-x' as string]: '86%',
              ['--hud-y' as string]: '10%',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeAnnouncement}
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
                  <h2 className="text-2xl font-light tracking-wide text-gray-100 md:text-3xl">{announcement.title}</h2>
                  <p className="mt-2 text-sm font-light leading-relaxed text-gray-500">{announcement.subtitle}</p>
                </div>
                <span className="mt-1 hidden rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-gray-400 sm:inline-flex">
                  {announcement.status}
                </span>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/20">
                {announcement.items.map((item, index) => (
                  <div key={`${index}-${item.code}`} className={`grid grid-cols-[2.5rem_1fr] gap-3 px-4 py-4 text-left ${index > 0 ? 'border-t border-white/[0.06]' : ''}`}>
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

              {adminPanelOpen && (
                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                  {adminSession.authenticated ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Admin Console</div>
                          <div className="mt-1 text-xs text-gray-400">当前账号：{adminSession.username}</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleLogout}
                          disabled={adminBusy}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-400 transition-colors hover:text-white disabled:opacity-50"
                        >
                          <LogOut size={13} />
                          退出
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.06] bg-black/20 p-1">
                        {([
                          ['announcement', '公告'],
                          ['identity', '个人介绍'],
                          ['certificates', '奖状'],
                          ['creations', '作品'],
                        ] as Array<[AdminContentTab, string]>).map(([tab, label]) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setAdminContentTab(tab)}
                            className={`rounded-xl px-2 py-2 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                              adminContentTab === tab
                                ? 'bg-white/[0.08] text-gray-100'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {adminContentTab === 'announcement' && (
                        <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_0.55fr]">
                        <label className="space-y-1.5">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">标题</span>
                          <input
                            value={editorDraft.title}
                            onChange={(event) => setEditorDraft((draft) => ({ ...draft, title: event.target.value }))}
                            maxLength={64}
                            className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-white/25"
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">状态</span>
                          <input
                            value={editorDraft.status}
                            onChange={(event) => setEditorDraft((draft) => ({ ...draft, status: event.target.value }))}
                            maxLength={24}
                            className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-white/25"
                          />
                        </label>
                      </div>

                      <label className="block space-y-1.5">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">副标题</span>
                        <input
                          value={editorDraft.subtitle}
                          onChange={(event) => setEditorDraft((draft) => ({ ...draft, subtitle: event.target.value }))}
                          maxLength={120}
                          className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-white/25"
                        />
                      </label>

                      <div className="space-y-3">
                        {editorDraft.items.map((item, index) => (
                          // Keyed by position, not by the code being typed, so the fields keep focus.
                          <div key={index} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">条目 {String(index + 1).padStart(2, '0')}</span>
                              <button
                                type="button"
                                onClick={() => removeDraftItem(index)}
                                disabled={editorDraft.items.length <= 1 || adminBusy}
                                className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-gray-500 transition-colors hover:text-white disabled:opacity-35"
                              >
                                删除
                              </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-[0.35fr_1fr]">
                              <input
                                value={item.code}
                                onChange={(event) => updateDraftItem(index, 'code', event.target.value)}
                                maxLength={12}
                                aria-label={`公告 ${index + 1} 代码`}
                                className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs uppercase tracking-[0.16em] text-gray-300 outline-none transition-colors focus:border-white/25"
                              />
                              <input
                                value={item.title}
                                onChange={(event) => updateDraftItem(index, 'title', event.target.value)}
                                maxLength={48}
                                aria-label={`公告 ${index + 1} 标题`}
                                className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-200 outline-none transition-colors focus:border-white/25"
                              />
                            </div>
                            <textarea
                              value={item.detail}
                              onChange={(event) => updateDraftItem(index, 'detail', event.target.value)}
                              maxLength={180}
                              rows={2}
                              aria-label={`公告 ${index + 1} 详情`}
                              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs leading-relaxed text-gray-300 outline-none transition-colors focus:border-white/25"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={addDraftItem}
                          disabled={editorDraft.items.length >= 5 || adminBusy}
                          className="inline-flex items-center rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-400 transition-colors hover:text-white disabled:opacity-40"
                        >
                          添加条目
                        </button>
                        <button
                          type="button"
                          onClick={saveAnnouncement}
                          disabled={adminBusy}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-color)]/35 bg-[var(--theme-color)]/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-100 transition-colors hover:border-[var(--theme-color)]/65 disabled:opacity-50"
                        >
                          <Save size={13} />
                          保存并同步
                          {announcementDirty && <UnsavedMark />}
                        </button>
                      </div>
                        </div>
                      )}

                      {adminContentTab === 'identity' && (
                        <div className="space-y-3">
                          {siteDraft.identityAddons.map((item, index) => (
                            <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">介绍 {String(index + 1).padStart(2, '0')}</span>
                                <button
                                  type="button"
                                  onClick={() => setSiteDraft((draft) => ({ ...draft, identityAddons: draft.identityAddons.filter((_, itemIndex) => itemIndex !== index) }))}
                                  disabled={adminBusy}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] text-gray-500 transition-colors hover:text-white disabled:opacity-35"
                                >
                                  <Trash2 size={11} />
                                  删除
                                </button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-[1fr_0.32fr]">
                                <input
                                  value={item.title}
                                  onChange={(event) => updateIdentityAddon(index, { title: event.target.value })}
                                  maxLength={64}
                                  placeholder="标题"
                                  className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-200 outline-none transition-colors focus:border-white/25"
                                />
                                <input
                                  type="number"
                                  value={Number.isFinite(item.sortOrder) ? item.sortOrder : ''}
                                  onChange={(event) => updateIdentityAddon(index, { sortOrder: readSortOrder(event.target.value) })}
                                  aria-label={`个人介绍 ${index + 1} 排序`}
                                  className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-300 outline-none transition-colors focus:border-white/25"
                                />
                              </div>
                              <textarea
                                value={item.body}
                                onChange={(event) => updateIdentityAddon(index, { body: event.target.value })}
                                maxLength={520}
                                rows={3}
                                placeholder="补充介绍内容"
                                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs leading-relaxed text-gray-300 outline-none transition-colors focus:border-white/25"
                              />
                              <ListInput
                                value={item.tags}
                                onChange={(tags) => updateIdentityAddon(index, { tags })}
                                maxLength={160}
                                placeholder="标签，用逗号分隔"
                                className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-300 outline-none transition-colors focus:border-white/25"
                              />
                              <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500">
                                <input
                                  type="checkbox"
                                  checked={item.visible}
                                  onChange={(event) => updateIdentityAddon(index, { visible: event.target.checked })}
                                  className="accent-white"
                                />
                                前台显示
                              </label>
                            </div>
                          ))}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setSiteDraft((draft) => ({ ...draft, identityAddons: [...draft.identityAddons, createIdentityAddon(draft.identityAddons.length)] }))}
                              disabled={siteDraft.identityAddons.length >= 12 || adminBusy}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-400 transition-colors hover:text-white disabled:opacity-40"
                            >
                              <Plus size={12} />
                              添加介绍
                            </button>
                            <button
                              type="button"
                              onClick={saveSiteContent}
                              disabled={adminBusy}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-color)]/35 bg-[var(--theme-color)]/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-100 transition-colors hover:border-[var(--theme-color)]/65 disabled:opacity-50"
                            >
                              <Save size={13} />
                              保存内容
                              {siteDirty && <UnsavedMark />}
                            </button>
                          </div>
                        </div>
                      )}

                      {adminContentTab === 'certificates' && (
                        <div className="space-y-3">
                          {siteDraft.certificates.map((item, index) => (
                            <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">奖状 {String(index + 1).padStart(2, '0')}</span>
                                <button
                                  type="button"
                                  onClick={() => setSiteDraft((draft) => ({ ...draft, certificates: draft.certificates.filter((_, itemIndex) => itemIndex !== index) }))}
                                  disabled={adminBusy}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] text-gray-500 transition-colors hover:text-white disabled:opacity-35"
                                >
                                  <Trash2 size={11} />
                                  删除
                                </button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-[1fr_0.32fr]">
                                <input
                                  value={item.title}
                                  onChange={(event) => updateCertificateAddon(index, { title: event.target.value })}
                                  maxLength={80}
                                  placeholder="奖状标题"
                                  className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-200 outline-none transition-colors focus:border-white/25"
                                />
                                <input
                                  type="number"
                                  value={Number.isFinite(item.sortOrder) ? item.sortOrder : ''}
                                  onChange={(event) => updateCertificateAddon(index, { sortOrder: readSortOrder(event.target.value) })}
                                  aria-label={`奖状 ${index + 1} 排序`}
                                  className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-300 outline-none transition-colors focus:border-white/25"
                                />
                              </div>
                              <textarea
                                value={item.description}
                                onChange={(event) => updateCertificateAddon(index, { description: event.target.value })}
                                maxLength={180}
                                rows={2}
                                placeholder="奖状说明"
                                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs leading-relaxed text-gray-300 outline-none transition-colors focus:border-white/25"
                              />
                              <div className="mt-2 grid gap-2 sm:grid-cols-[96px_1fr]">
                                <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <Upload size={18} className="text-gray-600" />
                                  )}
                                </div>
                                <div className="flex flex-col justify-center gap-2">
                                  <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-400 transition-colors hover:text-white">
                                    <Upload size={12} />
                                    {uploadingCertificateId === item.id ? '上传中' : '上传图片'}
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      disabled={adminBusy || uploadingCertificateId === item.id}
                                      onChange={(event) => {
                                        const file = event.currentTarget.files?.[0];
                                        if (file) {
                                          void uploadCertificateImage(item.id, file);
                                        }
                                        event.currentTarget.value = '';
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                  <p className="text-[10px] leading-relaxed text-gray-600">JPG / PNG / WebP，单张不超过 4 MB</p>
                                </div>
                              </div>
                              <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500">
                                <input
                                  type="checkbox"
                                  checked={item.visible}
                                  onChange={(event) => updateCertificateAddon(index, { visible: event.target.checked })}
                                  className="accent-white"
                                />
                                前台显示
                              </label>
                            </div>
                          ))}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setSiteDraft((draft) => ({ ...draft, certificates: [...draft.certificates, createCertificateAddon(draft.certificates.length)] }))}
                              disabled={siteDraft.certificates.length >= 24 || adminBusy}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-400 transition-colors hover:text-white disabled:opacity-40"
                            >
                              <Plus size={12} />
                              添加奖状
                            </button>
                            <button
                              type="button"
                              onClick={saveSiteContent}
                              disabled={adminBusy}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-color)]/35 bg-[var(--theme-color)]/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-100 transition-colors hover:border-[var(--theme-color)]/65 disabled:opacity-50"
                            >
                              <Save size={13} />
                              保存内容
                              {siteDirty && <UnsavedMark />}
                            </button>
                          </div>
                        </div>
                      )}

                      {adminContentTab === 'creations' && (
                        <div className="space-y-3">
                          {siteDraft.creationAddons.map((item, index) => (
                            <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">作品 {String(index + 1).padStart(2, '0')}</span>
                                <button
                                  type="button"
                                  onClick={() => setSiteDraft((draft) => ({ ...draft, creationAddons: draft.creationAddons.filter((_, itemIndex) => itemIndex !== index) }))}
                                  disabled={adminBusy}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] text-gray-500 transition-colors hover:text-white disabled:opacity-35"
                                >
                                  <Trash2 size={11} />
                                  删除
                                </button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-[1fr_0.32fr]">
                                <input
                                  value={item.title}
                                  onChange={(event) => updateCreationAddon(index, { title: event.target.value })}
                                  maxLength={72}
                                  placeholder="作品名称"
                                  className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-200 outline-none transition-colors focus:border-white/25"
                                />
                                <input
                                  type="number"
                                  value={Number.isFinite(item.sortOrder) ? item.sortOrder : ''}
                                  onChange={(event) => updateCreationAddon(index, { sortOrder: readSortOrder(event.target.value) })}
                                  aria-label={`作品 ${index + 1} 排序`}
                                  className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-300 outline-none transition-colors focus:border-white/25"
                                />
                              </div>
                              <input
                                value={item.subtitle}
                                onChange={(event) => updateCreationAddon(index, { subtitle: event.target.value })}
                                maxLength={80}
                                placeholder="副标题 / 类型"
                                className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-300 outline-none transition-colors focus:border-white/25"
                              />
                              <textarea
                                value={item.description}
                                onChange={(event) => updateCreationAddon(index, { description: event.target.value })}
                                maxLength={520}
                                rows={3}
                                placeholder="作品介绍"
                                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs leading-relaxed text-gray-300 outline-none transition-colors focus:border-white/25"
                              />
                              <ListInput
                                value={item.highlights}
                                onChange={(highlights) => updateCreationAddon(index, { highlights })}
                                maxLength={180}
                                placeholder="亮点，用逗号分隔"
                                className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-300 outline-none transition-colors focus:border-white/25"
                              />
                              <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500">
                                <input
                                  type="checkbox"
                                  checked={item.visible}
                                  onChange={(event) => updateCreationAddon(index, { visible: event.target.checked })}
                                  className="accent-white"
                                />
                                前台显示
                              </label>
                            </div>
                          ))}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setSiteDraft((draft) => ({ ...draft, creationAddons: [...draft.creationAddons, createCreationAddon(draft.creationAddons.length)] }))}
                              disabled={siteDraft.creationAddons.length >= 16 || adminBusy}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-400 transition-colors hover:text-white disabled:opacity-40"
                            >
                              <Plus size={12} />
                              添加作品
                            </button>
                            <button
                              type="button"
                              onClick={saveSiteContent}
                              disabled={adminBusy}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-color)]/35 bg-[var(--theme-color)]/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-100 transition-colors hover:border-[var(--theme-color)]/65 disabled:opacity-50"
                            >
                              <Save size={13} />
                              保存内容
                              {siteDirty && <UnsavedMark />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={handleLogin}>
                      <label className="space-y-1.5">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">账号</span>
                        <input
                          value={loginForm.username}
                          onChange={(event) => setLoginForm((form) => ({ ...form, username: event.target.value }))}
                          autoComplete="username"
                          className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-white/25"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">密码</span>
                        <input
                          type="password"
                          value={loginForm.password}
                          onChange={(event) => setLoginForm((form) => ({ ...form, password: event.target.value }))}
                          autoComplete="current-password"
                          className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-white/25"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={adminBusy}
                        className="inline-flex items-center justify-center gap-2 self-end rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-gray-300 transition-colors hover:text-white disabled:opacity-50"
                      >
                        <Lock size={13} />
                        登录
                      </button>
                    </form>
                  )}

                  {(adminError || announcementNotice) && (
                    <div className={`mt-3 text-xs ${adminError ? 'text-red-300' : 'text-gray-400'}`}>
                      {adminError || announcementNotice}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gray-500">
                  <span>Recent Update · Live</span>
                  <button
                    type="button"
                    onClick={() => void loadAnnouncement(false)}
                    disabled={announcementLoading}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-gray-500 transition-colors hover:text-white disabled:opacity-40"
                    aria-label="刷新公告"
                    title="刷新公告"
                  >
                    <RefreshCw size={12} className={announcementLoading ? 'animate-spin' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={openAdminPanel}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-gray-600 transition-colors hover:text-gray-300"
                    aria-label="公告管理"
                    title="公告管理"
                  >
                    {adminSession.authenticated ? <Pencil size={12} /> : <Lock size={12} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={closeAnnouncement}
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
