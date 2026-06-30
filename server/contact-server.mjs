import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const app = express();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const contactTo = process.env.CONTACT_TO;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const trustProxy = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';
const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const contactDailyLimit = positiveInteger(process.env.CONTACT_DAILY_LIMIT, 3);
const publicOrigin = process.env.PUBLIC_ORIGIN;
const cookieSecret = process.env.CONTACT_COOKIE_SECRET || crypto.randomBytes(32).toString('hex');
const contactClientCookie = 'gp_contact_client';
const cookieSecure = process.env.CONTACT_COOKIE_SECURE === '1' || publicOrigin?.startsWith('https://');
const allowLocalOrigins = process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_ORIGINS === '1';
const configuredRateStorePath = process.env.CONTACT_RATE_STORE_PATH || '.contact-rate-limits.json';
const contactRateStorePath = path.isAbsolute(configuredRateStorePath)
  ? configuredRateStorePath
  : path.join(rootDir, configuredRateStorePath);
const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;
const isProduction = process.env.NODE_ENV === 'production';

if (trustProxy) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use((_, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

const requireJsonContent = (req, res, next) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ ok: false, message: '请求格式无效。' });
  }

  return next();
};

app.use(express.json({ limit: '24kb', strict: true, type: 'application/json' }));

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError || error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
    return res.status(400).json({ ok: false, message: '请求内容无效。' });
  }

  return next(error);
});

const contactAttempts = new Map();
const hashKey = (value) => crypto.createHash('sha256').update(value).digest('hex');

const loadContactAttempts = () => {
  try {
    const stored = JSON.parse(fs.readFileSync(contactRateStorePath, 'utf8'));
    if (!stored || typeof stored !== 'object' || !Array.isArray(stored.entries)) return;

    const day = shanghaiDayKey();
    for (const entry of stored.entries) {
      if (
        entry &&
        typeof entry.key === 'string' &&
        entry.day === day &&
        Number.isInteger(entry.count) &&
        entry.count > 0
      ) {
        contactAttempts.set(entry.key, { count: entry.count, day: entry.day });
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('[contact] failed to load rate limit store', error);
    }
  }
};

const saveContactAttempts = () => {
  try {
    fs.mkdirSync(path.dirname(contactRateStorePath), { recursive: true });
    const entries = Array.from(contactAttempts, ([key, value]) => ({ key, ...value }));
    const tempPath = `${contactRateStorePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify({ entries }, null, 2), { mode: 0o600 });
    fs.renameSync(tempPath, contactRateStorePath);
  } catch (error) {
    console.warn('[contact] failed to save rate limit store', error);
  }
};

const clientIp = (req) => (req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
const clientIpKey = (req) => `ip:${hashKey(clientIp(req))}`;

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        try {
          return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
        } catch {
          return [part.slice(0, index), ''];
        }
      }),
  );

const signValue = (value) => crypto.createHmac('sha256', cookieSecret).update(value).digest('base64url');

const createSignedClientId = () => {
  const id = crypto.randomBytes(18).toString('base64url');
  return `${id}.${signValue(id)}`;
};

const validSignedClientId = (value) => {
  const [id, signature] = String(value || '').split('.');
  if (!id || !signature || !/^[A-Za-z0-9_-]{20,40}$/.test(id)) return false;

  const expected = signValue(id);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

const getClientId = (req, res) => {
  const cookies = parseCookies(req.get('cookie'));
  const existing = cookies[contactClientCookie];
  const clientId = validSignedClientId(existing) ? existing : createSignedClientId();

  if (clientId !== existing) {
    res.cookie(contactClientCookie, clientId, {
      httpOnly: true,
      sameSite: 'strict',
      secure: cookieSecure,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  return `client:${hashKey(clientId)}`;
};

const shanghaiParts = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce((parts, part) => {
      if (part.type !== 'literal') parts[part.type] = Number(part.value);
      return parts;
    }, {});

const shanghaiDayKey = (date = new Date()) => {
  const parts = shanghaiParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

const secondsUntilNextShanghaiDay = (date = new Date()) => {
  const parts = shanghaiParts(date);
  const utcNow = Date.now();
  const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
  const todayUtcMidnight = Date.UTC(parts.year, parts.month - 1, parts.day) - shanghaiOffsetMs;
  const nextUtcMidnight = todayUtcMidnight + 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((nextUtcMidnight - utcNow) / 1000));
};

const sameOrigin = (req) => {
  const origin = req.get('origin');
  if (!origin) return true;

  // Allow all local development origins to facilitate seamless local cross-port testing
  const isLocal = origin.startsWith('http://localhost:') || 
                  origin.startsWith('http://127.0.0.1:') || 
                  origin.startsWith('http://0.0.0.0:');
  if (allowLocalOrigins && isLocal) return true;

  if (publicOrigin) {
    return origin === publicOrigin;
  }

  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto = forwardedProto || req.protocol;
  return origin === `${proto}://${req.get('host')}`;
};

const consumeContactLimit = (req, res) => {
  const day = shanghaiDayKey();
  const resetIn = secondsUntilNextShanghaiDay();
  const keys = [clientIpKey(req), getClientId(req, res)];

  for (const key of keys) {
    const current = contactAttempts.get(key);

    if (current?.day === day && current.count >= contactDailyLimit) {
      res.setHeader('Retry-After', String(resetIn));
      res.status(429).json({ ok: false, message: '今天发送次数已达上限，请明天再试。' });
      return false;
    }
  }

  for (const key of keys) {
    const current = contactAttempts.get(key);
    const count = current?.day === day ? current.count + 1 : 1;
    contactAttempts.set(key, { count, day });
  }

  saveContactAttempts();
  return true;
};

const requireSameOrigin = (req, res, next) => {
  if (!sameOrigin(req)) {
    return res.status(403).json({ ok: false, message: '请求来源无效。' });
  }

  return next();
};

setInterval(() => {
  const day = shanghaiDayKey();
  let changed = false;
  for (const [key, value] of contactAttempts) {
    if (value.day !== day) {
      contactAttempts.delete(key);
      changed = true;
    }
  }
  if (changed) saveContactAttempts();
}, 60 * 60 * 1000).unref();

const cleanSingleLine = (value) => String(value || '').replace(/[\r\n]+/g, ' ').trim();
const cleanMessage = (value) => String(value || '').replace(/\r\n?/g, '\n').trim();
const escapeHtml = (value) =>
  cleanSingleLine(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeMessageHtml = (value) =>
  cleanMessage(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hasControlChars = (value) => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const mailDisplayName = (value) => cleanSingleLine(value).replace(/[<>"]/g, '').slice(0, 80);

const verifyTurnstile = async (token, ip) => {
  if (!turnstileSecretKey) return !isProduction;
  if (!token || typeof token !== 'string' || token.length > 2048) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({
        secret: turnstileSecretKey,
        response: token,
        remoteip: ip,
      }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    return Boolean(response.ok && result?.success);
  } catch (error) {
    console.warn('[contact] turnstile verification failed', error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const transporter = () => {
  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials are not configured.');
  }

  return nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    disableFileAccess: true,
    disableUrlAccess: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

loadContactAttempts();

app.post('/api/contact', requireSameOrigin, requireJsonContent, async (req, res) => {
  const name = cleanSingleLine(req.body?.name);
  const email = cleanSingleLine(req.body?.email);
  const subject = cleanSingleLine(req.body?.subject);
  const message = cleanMessage(req.body?.message);
  const website = cleanSingleLine(req.body?.website);
  const turnstileToken = req.body?.turnstileToken;

  if (website) {
    return res.status(400).json({ ok: false, message: '请求未通过校验。' });
  }

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ ok: false, message: '请完整填写姓名、邮箱、主题和消息。' });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ ok: false, message: '请填写有效的邮箱地址。' });
  }

  if (message.length > 3000 || subject.length > 120 || name.length > 80 || email.length > 160) {
    return res.status(400).json({ ok: false, message: '内容太长了，请稍微精简后再发送。' });
  }

  if ([name, email, subject, message].some(hasControlChars)) {
    return res.status(400).json({ ok: false, message: '内容包含无效字符，请检查后再发送。' });
  }

  if (!(await verifyTurnstile(turnstileToken, clientIp(req)))) {
    return res.status(400).json({ ok: false, message: '人机校验未通过，请刷新后再试。' });
  }

  if (!consumeContactLimit(req, res)) {
    return;
  }

  const submittedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const safeSubject = `Galaxy Portfolio 联系：${subject}`;
  const safeName = mailDisplayName(name) || '访客';

  try {
    if (!contactTo) {
      throw new Error('CONTACT_TO is not configured.');
    }

    await transporter().sendMail({
      from: `"Galaxy Portfolio" <${smtpUser}>`,
      to: contactTo,
      replyTo: `"${safeName}" <${email}>`,
      subject: safeSubject,
      disableFileAccess: true,
      disableUrlAccess: true,
      text: [
        `姓名：${name}`,
        `邮箱：${email}`,
        `主题：${subject}`,
        `时间：${submittedAt}`,
        '',
        '消息：',
        message,
      ].join('\n'),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.7; color: #111827;">
          <h2 style="margin: 0 0 16px;">Galaxy Portfolio 新留言</h2>
          <p><strong>姓名：</strong>${escapeHtml(name)}</p>
          <p><strong>邮箱：</strong>${escapeHtml(email)}</p>
          <p><strong>主题：</strong>${escapeHtml(subject)}</p>
          <p><strong>时间：</strong>${escapeHtml(submittedAt)}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p>${escapeMessageHtml(message)}</p>
        </div>
      `,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('[contact] failed to send mail', error);
    return res.status(500).json({ ok: false, message: '消息暂时发送失败，请稍后再试。' });
  }
});

app.use(express.static(distDir));

app.use((req, res, next) => {
  if (req.method !== 'GET' || !req.accepts('html')) {
    return next();
  }

  return res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, host, (error) => {
  if (error) {
    console.error('[contact] failed to start server', error);
    process.exit(1);
  }

  console.log(`Contact server listening on http://${host}:${port}`);
});
