import { json } from './announcement';

export type IdentityAddon = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  visible: boolean;
  sortOrder: number;
};

export type DynamicCertificate = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageKey: string;
  visible: boolean;
  sortOrder: number;
};

export type CreationAddon = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  visible: boolean;
  sortOrder: number;
};

export type SiteContentDocument = {
  identityAddons: IdentityAddon[];
  certificates: DynamicCertificate[];
  creationAddons: CreationAddon[];
  updatedAt: string;
  updatedBy: string;
};

export type SiteContentEnv = {
  ANNOUNCEMENTS_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
};

const siteContentKey = 'site-content:v1';
const maxContentBytes = 64 * 1024;

export const defaultSiteContent: SiteContentDocument = {
  identityAddons: [],
  certificates: [],
  creationAddons: [],
  updatedAt: '2026-07-09T00:00:00.000Z',
  updatedBy: 'system',
};

const clampText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const clampList = (value: unknown, maxItems: number, maxLength: number) => {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => clampText(item, maxLength))
    .filter(Boolean);
};

const clampSortOrder = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const clampBoolean = (value: unknown) => value !== false;

const normalizeId = (value: unknown, prefix: string, index: number) =>
  clampText(value, 80) || `${prefix}-${Date.now()}-${index}`;

export const readSiteContentBody = async (request: Request) => {
  const body = await request.text();
  if (body.length > maxContentBytes) {
    throw json({ ok: false, error: '请求内容过大' }, 413);
  }

  try {
    return JSON.parse(body || '{}') as Record<string, unknown>;
  } catch {
    throw json({ ok: false, error: 'JSON 格式不正确' }, 400);
  }
};

export const normalizeSiteContent = (input: unknown): SiteContentDocument => {
  const source = typeof input === 'object' && input ? input as Record<string, unknown> : {};

  const identityAddons = (Array.isArray(source.identityAddons) ? source.identityAddons : [])
    .slice(0, 12)
    .map((item, index) => {
      const row = typeof item === 'object' && item ? item as Record<string, unknown> : {};
      return {
        id: normalizeId(row.id, 'identity', index),
        title: clampText(row.title, 64),
        body: clampText(row.body, 520),
        tags: clampList(row.tags, 8, 24),
        visible: clampBoolean(row.visible),
        sortOrder: clampSortOrder(row.sortOrder, index),
      };
    })
    .filter((item) => item.title && item.body);

  const certificates = (Array.isArray(source.certificates) ? source.certificates : [])
    .slice(0, 24)
    .map((item, index) => {
      const row = typeof item === 'object' && item ? item as Record<string, unknown> : {};
      return {
        id: normalizeId(row.id, 'certificate', index),
        title: clampText(row.title, 80),
        description: clampText(row.description, 180),
        imageUrl: clampText(row.imageUrl, 240),
        imageKey: clampText(row.imageKey, 160),
        visible: clampBoolean(row.visible),
        sortOrder: clampSortOrder(row.sortOrder, index),
      };
    })
    .filter((item) => item.title && item.imageUrl && item.imageKey);

  const creationAddons = (Array.isArray(source.creationAddons) ? source.creationAddons : [])
    .slice(0, 16)
    .map((item, index) => {
      const row = typeof item === 'object' && item ? item as Record<string, unknown> : {};
      return {
        id: normalizeId(row.id, 'creation', index),
        title: clampText(row.title, 72),
        subtitle: clampText(row.subtitle, 80),
        description: clampText(row.description, 520),
        highlights: clampList(row.highlights, 8, 28),
        visible: clampBoolean(row.visible),
        sortOrder: clampSortOrder(row.sortOrder, index),
      };
    })
    .filter((item) => item.title && item.description);

  return {
    identityAddons,
    certificates,
    creationAddons,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
    updatedBy: clampText(source.updatedBy, 48) || 'admin',
  };
};

export const loadSiteContent = async (env: SiteContentEnv): Promise<SiteContentDocument> => {
  const stored = await env.ANNOUNCEMENTS_KV?.get(siteContentKey);
  if (!stored) return defaultSiteContent;

  try {
    return normalizeSiteContent(JSON.parse(stored));
  } catch {
    return defaultSiteContent;
  }
};

export const saveSiteContent = async (env: SiteContentEnv, doc: SiteContentDocument) => {
  if (!env.ANNOUNCEMENTS_KV) {
    throw json({ ok: false, error: 'ANNOUNCEMENTS_KV 未绑定' }, 503);
  }

  await env.ANNOUNCEMENTS_KV.put(siteContentKey, JSON.stringify(doc));
};
