export type AnnouncementItem = {
  code: string;
  title: string;
  detail: string;
};

export type AnnouncementDocument = {
  title: string;
  subtitle: string;
  status: string;
  items: AnnouncementItem[];
  updatedAt: string;
  updatedBy: string;
};

export type AnnouncementEnv = {
  ANNOUNCEMENTS_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
};

const announcementKey = 'announcement:home';
const maxRequestBytes = 12 * 1024;

export const defaultAnnouncement: AnnouncementDocument = {
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

const clampText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

export const json = (body: unknown, status = 200, headers: HeadersInit = {}) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet, noai, noimageai',
      'referrer-policy': 'same-origin',
      ...headers,
    },
  });
};

export const apiError = (error: unknown) => {
  if (error instanceof Response) return error;
  return json({ ok: false, error: '服务暂时不可用' }, 500);
};

export const readJsonBody = async (request: Request) => {
  const body = await request.text();
  if (body.length > maxRequestBytes) {
    throw new Response(JSON.stringify({ ok: false, error: '请求内容过大' }), {
      status: 413,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  try {
    return JSON.parse(body || '{}') as Record<string, unknown>;
  } catch {
    throw new Response(JSON.stringify({ ok: false, error: 'JSON 格式不正确' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
};

export const loadAnnouncement = async (env: AnnouncementEnv): Promise<AnnouncementDocument> => {
  const stored = await env.ANNOUNCEMENTS_KV?.get(announcementKey);
  if (!stored) return defaultAnnouncement;

  try {
    return normalizeAnnouncement(JSON.parse(stored), false);
  } catch {
    return defaultAnnouncement;
  }
};

export const saveAnnouncement = async (env: AnnouncementEnv, doc: AnnouncementDocument) => {
  if (!env.ANNOUNCEMENTS_KV) {
    throw new Response(JSON.stringify({ ok: false, error: 'ANNOUNCEMENTS_KV 未绑定' }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  await env.ANNOUNCEMENTS_KV.put(announcementKey, JSON.stringify(doc));
};

export const normalizeAnnouncement = (input: unknown, requireItems = true): AnnouncementDocument => {
  const source = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const itemsSource = Array.isArray(source.items) ? source.items : [];
  const items = itemsSource
    .slice(0, 5)
    .map((item) => {
      const row = typeof item === 'object' && item ? item as Record<string, unknown> : {};
      return {
        code: clampText(row.code, 12).toUpperCase(),
        title: clampText(row.title, 48),
        detail: clampText(row.detail, 180),
      };
    })
    .filter((item) => item.code && item.title && item.detail);

  if (requireItems && items.length === 0) {
    throw new Response(JSON.stringify({ ok: false, error: '至少保留一条公告内容' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const normalized = {
    title: clampText(source.title, 64) || defaultAnnouncement.title,
    subtitle: clampText(source.subtitle, 120) || defaultAnnouncement.subtitle,
    status: clampText(source.status, 24) || defaultAnnouncement.status,
    items: items.length ? items : defaultAnnouncement.items,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
    updatedBy: clampText(source.updatedBy, 48) || 'admin',
  };

  return normalized;
};
