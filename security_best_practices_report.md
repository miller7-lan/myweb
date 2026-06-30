# Galaxy Portfolio 安全修复报告

日期：2026-06-30

## 摘要

本次修复聚焦下载安全、联系表单安全和依赖漏洞。处理后，`npm audit --registry=https://registry.npmjs.org --audit-level=low` 从 3 个漏洞降为 0 个漏洞；联系表单在生产环境下不再在缺少 Turnstile secret 时静默放行；Netlify Function 增加请求体大小限制和 Turnstile 超时保护；邮件发送禁用 Nodemailer 文件/URL 访问能力。

## 修复前

- `npm audit` 报告 3 个漏洞：`nodemailer <=9.0.0` 高危、`vite 8.0.0 - 8.0.15` 高危、`@babel/core <=7.29.0` 低危。
- `server/contact-server.mjs` 与 `netlify/functions/contact.mjs` 在没有 `TURNSTILE_SECRET_KEY` 时会直接通过人机校验，生产漏配时风险较高。
- `netlify/functions/contact.mjs` 直接解析 `event.body`，缺少代码层请求体大小限制。
- Netlify Turnstile 校验请求没有超时控制。
- Nodemailer 邮件发送没有显式禁用文件/URL 访问能力。

## 修复后

- 升级 `nodemailer` 到 `^9.0.1`，并通过 `npm audit` 验证无已知漏洞。
- Vite 相关锁文件升级到 `vite 8.1.0`，同步修复开发服务器相关公告。
- Babel 相关锁文件升级到 `7.29.7` 系列，修复 source map 相关公告。
- 生产环境缺少 `TURNSTILE_SECRET_KEY` 时，联系表单校验改为失败关闭；开发环境仍允许本地调试。
- Netlify 联系接口新增 `CONTACT_BODY_LIMIT_BYTES`，默认 24 KiB，与本地 Express 的 JSON 限制保持一致。
- Netlify Turnstile 校验新增 5 秒超时，异常时返回失败。
- Nodemailer transport 和单次邮件发送均设置 `disableFileAccess` 与 `disableUrlAccess`。

## 下载安全状态

当前下载链接仍采用固定白名单式数据源：`legacyDownload()` 固定到 Netlify 下载 CDN，`githubAsset()` 固定到 GitHub raw；每个可见下载项继续保留 SHA-256。未发现任意文件下载或路径穿越入口。

注意：当前页面下载按钮直接访问 `/downloads/*` 静态资源，`netlify/functions/download.mjs` 的 `/api/download` 限流不保护这些直接链接。这是公开文件 CDN 的设计选择，不是任意下载漏洞；如果之后需要真正限流下载，应把页面链接改为受控 `/api/download?file=...` 或使用 CDN/WAF 规则。

## 验证命令

```bash
npm audit --registry=https://registry.npmjs.org --audit-level=low
npm run build
```

两项均已通过。
