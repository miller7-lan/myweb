import nodemailer from 'nodemailer';
import { clientIp, positiveInteger, rateLimit } from './_security.mjs';

const allowedOrigins = new Set([
  'https://dazzle-galaxy-show.pages.dev',
  'https://dazzle-galaxy-show.netlify.app',
  process.env.PUBLIC_ORIGIN,
].filter(Boolean));

const contactTo = process.env.CONTACT_TO;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;
const contactPerSecondLimit = positiveInteger(process.env.CONTACT_PER_SECOND_LIMIT, 1);
const contactWindowMs = positiveInteger(process.env.CONTACT_RATE_WINDOW_MS, 5000);
const contactBodyLimitBytes = positiveInteger(process.env.CONTACT_BODY_LIMIT_BYTES, 24 * 1024);
const isProduction = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';

const json = (statusCode, body, origin) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  },
  body: JSON.stringify(body),
});

const limitedJson = (origin, retryAfterSeconds) => ({
  statusCode: 429,
  headers: {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Retry-After': String(retryAfterSeconds),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  },
  body: JSON.stringify({ ok: false, message: '发送太频繁了，请稍后再试。' }),
});

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
    console.warn('[contact-function] turnstile verification failed', error);
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

export const handler = async (event) => {
  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const origin = allowedOrigins.has(requestOrigin) ? requestOrigin : 'https://dazzle-galaxy-show.pages.dev';

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: '请求方法无效。' }, origin);
  }

  if (requestOrigin && !allowedOrigins.has(requestOrigin)) {
    return json(403, { ok: false, message: '请求来源无效。' }, origin);
  }

  const ip = clientIp(event);
  const contactLimit = rateLimit({
    namespace: 'contact-second',
    key: ip,
    limit: contactPerSecondLimit,
    windowMs: contactWindowMs,
  });

  if (!contactLimit.allowed) {
    return limitedJson(origin, contactLimit.retryAfterSeconds);
  }

  let payload;
  try {
    const rawBody = event.body || '';
    const bodyBytes = Buffer.byteLength(rawBody, event.isBase64Encoded ? 'base64' : 'utf8');
    if (bodyBytes > contactBodyLimitBytes) {
      return json(413, { ok: false, message: '请求内容过大，请精简后再发送。' }, origin);
    }

    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, message: '请求内容无效。' }, origin);
  }

  const name = cleanSingleLine(payload.name);
  const email = cleanSingleLine(payload.email);
  const subject = cleanSingleLine(payload.subject);
  const message = cleanMessage(payload.message);
  const website = cleanSingleLine(payload.website);
  const turnstileToken = payload.turnstileToken;

  if (website) {
    return json(400, { ok: false, message: '请求未通过校验。' }, origin);
  }

  if (!name || !email || !subject || !message) {
    return json(400, { ok: false, message: '请完整填写姓名、邮箱、主题和消息。' }, origin);
  }

  if (!isEmail(email)) {
    return json(400, { ok: false, message: '请填写有效的邮箱地址。' }, origin);
  }

  if (message.length > 3000 || subject.length > 120 || name.length > 80 || email.length > 160) {
    return json(400, { ok: false, message: '内容太长了，请稍微精简后再发送。' }, origin);
  }

  if ([name, email, subject, message].some(hasControlChars)) {
    return json(400, { ok: false, message: '内容包含无效字符，请检查后再发送。' }, origin);
  }

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return json(400, { ok: false, message: '人机校验未通过，请刷新后再试。' }, origin);
  }

  const submittedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const safeName = mailDisplayName(name) || '访客';

  try {
    if (!contactTo) {
      throw new Error('CONTACT_TO is not configured.');
    }

    await transporter().sendMail({
      from: `"Galaxy Portfolio" <${smtpUser}>`,
      to: contactTo,
      replyTo: `"${safeName}" <${email}>`,
      subject: `Galaxy Portfolio 联系：${subject}`,
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

    return json(200, { ok: true }, origin);
  } catch (error) {
    console.error('[contact-function] failed to send mail', error);
    return json(500, { ok: false, message: '消息暂时发送失败，请稍后再试。' }, origin);
  }
};
