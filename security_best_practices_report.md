# Security Best Practices Report

Date: 2026-05-20

## Executive Summary

The project is primarily a Vite + React + TypeScript portfolio with Three.js visuals, a small Express / Nodemailer contact endpoint, and static desktop download links. The React frontend remains clean for common DOM XSS risks: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `document.write`, dynamic `window.open`, or untrusted external URLs were found in app code.

The public-deployment items found in the initial review have now been addressed in code:

- Contact endpoint now has IP-based rate limiting, same-origin validation, and a hidden honeypot field.
- Express now sets baseline browser security headers and disables the `X-Powered-By` fingerprint.
- Download entries now show SHA-256 checksums for published packages.
- Vite dev server now defaults to `127.0.0.1`; tunnel exposure requires the explicit `dev:tunnel` script.
- `.env.example` now uses placeholder email addresses and documents public deployment knobs.

Production dependency audit was run with the official npm registry because the configured mirror does not implement the audit endpoint:

```text
npm audit --omit=dev --audit-level=moderate --registry=https://registry.npmjs.org
found 0 vulnerabilities
```

## Fixed Findings

### SEC-001: Contact Endpoint Had No Rate Limiting Or Abuse Controls

- Original severity: Medium
- Status: Fixed
- Location: `server/contact-server.mjs`, lines 53-105 and 144-152
- Fix evidence:

```js
const contactAttempts = new Map();
...
const requireSameOrigin = (req, res, next) => {
  if (!sameOrigin(req)) {
    return res.status(403).json({ ok: false, message: '请求来源无效。' });
  }
  return next();
};

app.post('/api/contact', requireSameOrigin, contactLimiter, async (req, res) => {
  ...
  if (website) {
    return res.status(400).json({ ok: false, message: '请求未通过校验。' });
  }
```

- Result: Public contact submissions are limited per client IP, cross-origin posts are rejected, and basic bot form-fill spam is blocked before mail sending.
- Deployment note: If the service is behind a reverse proxy/CDN, set `TRUST_PROXY=1` so `req.ip` reflects the real client IP.

### SEC-002: Express Static Server Did Not Set Security Headers

- Original severity: Medium
- Status: Fixed
- Location: `server/contact-server.mjs`, lines 27-49
- Fix evidence:

```js
app.disable('x-powered-by');

app.use((_, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    ...
    "frame-ancestors 'none'",
  ].join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
```

- Result: The bundled Express server now applies CSP, clickjacking protection, MIME sniffing protection, referrer policy, and a restrictive permissions policy.
- Deployment note: `style-src 'unsafe-inline'` is intentionally present because the current React/Three UI uses inline style attributes. It is scoped to styles, not scripts.

### SEC-003: Downloaded Desktop Packages Had No Published Checksums

- Original severity: Medium
- Status: Fixed
- Location: `src/components/Themes/OrbitContent.tsx`, lines 17-26, 47-55, 75-82, 101-108, and 168-171 / 332-349
- Fix evidence:

```tsx
sha256: '7667fcba05da7593e7b60367aaa19563e7f717457dd750828cc7aba50c6cac67',
...
<span>SHA-256 校验</span>
```

- Result: Each downloadable package shown in the release page now has a visible SHA-256 checksum.
- Remaining recommendation: For a broader public audience, also sign and notarize macOS apps and publish Android release builds signed with a release key.

### SEC-004: Vite Dev Server Allowed All Hostnames

- Original severity: Low
- Status: Fixed
- Location: `vite.config.ts`, lines 4-20; `package.json`, lines 7-8
- Fix evidence:

```ts
const devHost = process.env.VITE_DEV_HOST || '127.0.0.1'
const allowedHosts = process.env.VITE_ALLOWED_HOSTS
  ? process.env.VITE_ALLOWED_HOSTS.split(',').map((host) => host.trim()).filter(Boolean)
  : []
```

```json
"dev": "vite",
"dev:tunnel": "VITE_DEV_HOST=0.0.0.0 VITE_ALLOWED_HOSTS=.trycloudflare.com,.loca.lt vite"
```

- Result: Regular development is local-only by default. Public tunnel behavior is opt-in.

### SEC-005: Example Environment File Contained A Real Recipient Address

- Original severity: Low
- Status: Fixed
- Location: `.env.example`, lines 1-9
- Fix evidence:

```text
SMTP_USER=your_email@example.com
CONTACT_TO=contact@example.com
PUBLIC_ORIGIN=http://127.0.0.1:3001
TRUST_PROXY=0
CONTACT_RATE_LIMIT=5
CONTACT_RATE_WINDOW_MS=600000
```

- Result: No real email address is exposed in the example file, and public-deployment security settings are documented.

## Positive Findings

- No committed `.env` file or private key material was found; `.gitignore` excludes `.env`, `.env.*`, `dist`, `node_modules`, and `public/downloads/*`.
- No React raw HTML escape hatches were found: no `dangerouslySetInnerHTML` or `__html`.
- No direct DOM XSS sinks were found in source: no `.innerHTML`, `.outerHTML`, `insertAdjacentHTML`, or `document.write`.
- No dynamic code execution sinks were found: no `eval` or `new Function`.
- Contact form HTML email output escapes submitted fields before interpolation.
- Contact form request body is limited to `24kb`, and field lengths are validated both client-side and server-side.
- Production dependency audit reported zero vulnerabilities for non-dev dependencies.

## Verification

```text
npm run build
✓ built
```

Local server smoke test on `127.0.0.1:3017`:

- `GET /` returned CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy, COOP, and CORP.
- Cross-origin `POST /api/contact` returned `403`.
- Honeypot-filled `POST /api/contact` returned `400`.
- Requests beyond the configured limit returned `429` with `Retry-After`.

`npm run lint` currently fails on existing React compiler immutability / effect rules in scene animation files and one identity-page effect. These are not introduced by the security fixes, and `npm run build` passes.

## Public Deployment Checklist

1. Set real environment variables only in the hosting provider, not in Git:
   `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`, `PUBLIC_ORIGIN`.
2. If behind Nginx, Cloudflare, or another proxy, set `TRUST_PROXY=1`.
3. Set `PUBLIC_ORIGIN` to the exact live origin, for example `https://example.com`.
4. Keep download package filenames stable only when checksums match. If a package is regenerated, update the SHA-256 shown in `OrbitContent.tsx`.
5. Prefer signed / notarized release artifacts for public desktop distribution.
