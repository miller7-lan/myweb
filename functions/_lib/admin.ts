import { json, readJsonBody } from './announcement';

export type AdminEnv = {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SESSION_SECRET?: string;
  ADMIN_LOGIN_BURST_LIMIT?: string;
  ADMIN_LOGIN_DAILY_LIMIT?: string;
  ANNOUNCEMENTS_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
};

export type AdminSession = {
  username: string;
  csrf: string;
};

const cookieName = 'gp_admin_session';
const sessionSeconds = 60 * 60 * 12;
const loginWindowSeconds = 15 * 60;
const defaultLoginBurstLimit = 6;
const defaultLoginDailyLimit = 12;
const defaultActionWindowSeconds = 15 * 60;

const encoder = new TextEncoder();

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toBase64Url = (bytes: ArrayBuffer | Uint8Array) => {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

const fromBase64Url = (value: string) => {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const randomToken = (bytes = 24) => {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return toBase64Url(buffer);
};

const sha256 = async (value: string) => toBase64Url(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

const timingSafeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
};

const sign = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
};

const parseCookies = (request: Request) => {
  const header = request.headers.get('cookie') || '';
  const cookies = new Map<string, string>();
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (!rawName || rest.length === 0) continue;
    cookies.set(rawName, decodeURIComponent(rest.join('=')));
  }
  return cookies;
};

const sameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
};

export const requireSameOrigin = (request: Request) => {
  if (!sameOrigin(request)) {
    throw json({ ok: false, error: '跨站请求已被拒绝' }, 403);
  }
};

export const requireJsonRequest = (request: Request) => {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw json({ ok: false, error: '请求格式不正确' }, 415);
  }
};

export const requireAdminConfig = (env: AdminEnv) => {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) {
    throw json({ ok: false, error: '管理员账号环境变量未配置' }, 503);
  }
};

export const verifyPassword = async (password: string, encodedHash: string) => {
  const [algorithm, rawIterations, saltValue, hashValue] = encodedHash.split('$');
  const iterations = Number(rawIterations);
  if (algorithm !== 'pbkdf2-sha256' || !Number.isInteger(iterations) || iterations < 100000 || !saltValue || !hashValue) {
    return false;
  }

  try {
    const passwordKey = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: fromBase64Url(saltValue),
        iterations,
      },
      passwordKey,
      256,
    );

    return timingSafeEqual(new Uint8Array(derived), fromBase64Url(hashValue));
  } catch {
    return false;
  }
};

export const createSessionCookie = async (request: Request, env: AdminEnv) => {
  requireAdminConfig(env);
  const expiresAt = Date.now() + sessionSeconds * 1000;
  const csrf = randomToken(18);
  const passwordFingerprint = (await sha256(env.ADMIN_PASSWORD_HASH || '')).slice(0, 32);
  const payload = toBase64Url(encoder.encode(JSON.stringify({
    username: env.ADMIN_USERNAME,
    csrf,
    exp: expiresAt,
    ph: passwordFingerprint,
  })));
  const signature = await sign(env.ADMIN_SESSION_SECRET || '', payload);
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const cookie = `${cookieName}=${encodeURIComponent(`${payload}.${signature}`)}; HttpOnly; Path=/; Max-Age=${sessionSeconds}; SameSite=Strict${secure}`;

  return { cookie, csrf, expiresAt };
};

export const clearSessionCookie = (request: Request) => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secure}`;
};

export const getAdminSession = async (request: Request, env: AdminEnv): Promise<AdminSession | null> => {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) return null;
  const token = parseCookies(request).get(cookieName);
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expectedSignature = await sign(env.ADMIN_SESSION_SECRET, payload);
  if (!timingSafeEqual(encoder.encode(signature), encoder.encode(expectedSignature))) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as {
      username?: string;
      csrf?: string;
      exp?: number;
      ph?: string;
    };
    const passwordFingerprint = (await sha256(env.ADMIN_PASSWORD_HASH)).slice(0, 32);
    if (parsed.username !== env.ADMIN_USERNAME || parsed.ph !== passwordFingerprint) return null;
    if (!parsed.exp || parsed.exp < Date.now() || !parsed.csrf) return null;
    return { username: parsed.username, csrf: parsed.csrf };
  } catch {
    return null;
  }
};

export const requireAdminSessionWithCsrf = async (request: Request, env: AdminEnv) => {
  requireSameOrigin(request);
  const session = await getAdminSession(request, env);
  const csrfHeader = request.headers.get('x-gp-admin-csrf') || '';
  if (!session || !csrfHeader || !timingSafeEqual(encoder.encode(csrfHeader), encoder.encode(session.csrf))) {
    throw json({ ok: false, error: '管理员登录已失效' }, 401);
  }
  return session;
};

export const requireAdminSession = async (request: Request, env: AdminEnv) => {
  requireJsonRequest(request);
  return requireAdminSessionWithCsrf(request, env);
};

const getClientKey = async (request: Request, username: string) => {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const userHash = (await sha256(username.toLowerCase())).slice(0, 20);
  return `${ip}:${userHash}`;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const readCounter = async (env: AdminEnv, key: string) => Number(await env.ANNOUNCEMENTS_KV?.get(key)) || 0;

export const assertLoginAllowed = async (request: Request, env: AdminEnv, username: string) => {
  if (!env.ANNOUNCEMENTS_KV) return;
  const clientKey = await getClientKey(request, username);
  const windowId = Math.floor(Date.now() / (loginWindowSeconds * 1000));
  const day = todayKey();
  const burstLimit = positiveInteger(env.ADMIN_LOGIN_BURST_LIMIT, defaultLoginBurstLimit);
  const dailyLimit = positiveInteger(env.ADMIN_LOGIN_DAILY_LIMIT, defaultLoginDailyLimit);
  const burstKey = `admin:login:fail:burst:${clientKey}:${windowId}`;
  const dayKey = `admin:login:fail:day:${clientKey}:${day}`;
  const [burstFailures, dayFailures] = await Promise.all([
    readCounter(env, burstKey),
    readCounter(env, dayKey),
  ]);

  if (burstFailures >= burstLimit) {
    throw json({ ok: false, error: '登录尝试过多，请稍后再试' }, 429);
  }
  if (dayFailures >= dailyLimit) {
    throw json({ ok: false, error: '今日失败次数已达上限，请明天再试' }, 429);
  }
};

export const recordFailedLogin = async (request: Request, env: AdminEnv, username: string) => {
  if (!env.ANNOUNCEMENTS_KV) return;
  const clientKey = await getClientKey(request, username);
  const windowId = Math.floor(Date.now() / (loginWindowSeconds * 1000));
  const day = todayKey();
  const burstKey = `admin:login:fail:burst:${clientKey}:${windowId}`;
  const dayKey = `admin:login:fail:day:${clientKey}:${day}`;
  const [burstFailures, dayFailures] = await Promise.all([
    readCounter(env, burstKey),
    readCounter(env, dayKey),
  ]);
  await Promise.all([
    env.ANNOUNCEMENTS_KV.put(burstKey, String(burstFailures + 1), { expirationTtl: loginWindowSeconds + 60 }),
    env.ANNOUNCEMENTS_KV.put(dayKey, String(dayFailures + 1), { expirationTtl: 60 * 60 * 30 }),
  ]);
};

export const assertAdminActionAllowed = async (
  request: Request,
  env: AdminEnv,
  username: string,
  action: string,
  limit: number,
  windowSeconds = defaultActionWindowSeconds,
) => {
  if (!env.ANNOUNCEMENTS_KV) return;
  const safeAction = action.replace(/[^a-z0-9:-]/gi, '').slice(0, 40) || 'action';
  const clientKey = await getClientKey(request, username);
  const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `admin:rate:${safeAction}:${clientKey}:${windowId}`;
  const count = await readCounter(env, key);

  if (count >= limit) {
    throw json({ ok: false, error: '操作过于频繁，请稍后再试' }, 429);
  }

  await env.ANNOUNCEMENTS_KV.put(key, String(count + 1), { expirationTtl: windowSeconds + 60 });
};

export const readLoginBody = async (request: Request) => {
  const body = await readJsonBody(request);
  return {
    username: typeof body.username === 'string' ? body.username.trim() : '',
    password: typeof body.password === 'string' ? body.password : '',
  };
};
