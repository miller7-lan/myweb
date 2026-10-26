这里的安装包只是本地副本，不是正式网站下载文件的唯一来源。

现用下载地址及 SHA-256 以 src/data/releases.ts 为准：
- legacyDownload：安装包位于 Netlify 下载 CDN。
- githubAsset：安装包位于 GitHub main 的 release-assets/，不要提交删除现用文件。

普通 Cloudflare 网站部署不需要本目录的安装包。
如果重新部署 Netlify 下载 CDN，必须先从现有 CDN 恢复所有 legacyDownload 文件到本目录，逐一核对 SHA-256，再运行 npm run build，确认 dist/downloads/ 包含所有现用文件后才能发布。不能用空目录或只带新包的目录覆盖下载 CDN。
