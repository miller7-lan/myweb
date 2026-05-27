import { clientIp, positiveInteger, rateLimit } from './_security.mjs';

const downloadPerSecondLimit = positiveInteger(process.env.DOWNLOAD_PER_SECOND_LIMIT, 12);
const downloadWindowMs = positiveInteger(process.env.DOWNLOAD_RATE_WINDOW_MS, 5000);
const siteOrigin = 'https://dazzle-galaxy-show.netlify.app';

const allowedFiles = new Set([
  '/downloads/Dazzle-Secretary-macOS.dmg',
  '/downloads/Dazzle-Secretary-macOS.zip',
  '/downloads/DazzleSecretary-Android-debug.apk.1.1',
  '/downloads/DazzleSecretaryPro-Windows-解压即用.zip',
  '/downloads/内网穿透控制台-macOS.dmg',
  '/downloads/内网穿透控制台-macOS.zip',
  '/downloads/利润助手-macOS.dmg',
  '/downloads/利润助手-macOS.zip',
  '/downloads/本机检测-macOS.dmg',
  '/downloads/本机检测-macOS.zip',
]);

const text = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  },
  body,
});

const normalizeFile = (value) => {
  const decoded = String(value || '').trim();
  if (!decoded || decoded.includes('\0')) return '';
  return decoded.startsWith('/') ? decoded : `/${decoded}`;
};

export const handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return text(405, 'Method Not Allowed');
  }

  const file = normalizeFile(event.queryStringParameters?.file);
  if (!allowedFiles.has(file)) {
    return text(404, 'Download not found');
  }

  const limit = rateLimit({
    namespace: 'download-second',
    key: clientIp(event),
    limit: downloadPerSecondLimit,
    windowMs: downloadWindowMs,
  });

  if (!limit.allowed) {
    return text(429, 'Too many download requests. Please retry later.', {
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  return {
    statusCode: 302,
    headers: {
      Location: `${siteOrigin}${encodeURI(file)}`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
    },
    body: '',
  };
};
