# Agent Notes

## Software Package Release Workflow

This site uses GitHub-connected Cloudflare Pages as the single public web entrypoint:

- Public site: `https://dazzle-galaxy-show.pages.dev` on Cloudflare Pages.
- Source of truth: GitHub repository `https://github.com/miller7-lan/myweb`, branch `main`.
- Deployment path: commit changes to `main`, push to GitHub, then let Cloudflare Pages update `https://dazzle-galaxy-show.pages.dev`.
- Deprecated Netlify URL: `https://dazzle-galaxy-show.netlify.app` must not be used as a public content entrypoint. Keep it redirect-only to `https://dazzle-galaxy-show.pages.dev` unless the user explicitly asks to restore Netlify hosting.
- Download exception: legacy files under `https://dazzle-galaxy-show.netlify.app/downloads/...` remain valid download targets because Cloudflare Pages does not reliably carry ignored/oversized package files from GitHub. The Netlify root and app routes still redirect to Cloudflare Pages; only `/downloads/*` is kept as a file CDN.

Cloudflare Pages only supports files up to 25 MiB. The page itself must remain on `https://dazzle-galaxy-show.pages.dev`; download buttons may target GitHub raw assets or the Netlify `/downloads/*` CDN exception when that is the only available location for legacy package files.

When adding or updating software packages:

1. Put installer files in `public/downloads/`.
2. Update the release metadata in `src/components/Themes/OrbitContent.tsx`.
3. Use local relative links for files at or below 25 MiB:
   - Example: `/downloads/SmallApp-macOS.dmg`
4. Keep every visible download button on `https://dazzle-galaxy-show.pages.dev` working:
   - For committed assets in `release-assets/`, use `githubAsset('release-assets/<file>')`.
   - For legacy files that exist locally in `public/downloads/` but are ignored or oversized for Cloudflare Pages, use `legacyDownload('/downloads/<file>')`.
   - Do not use `/downloads/<file>` directly unless the file is tracked in Git and verified on Cloudflare Pages.
5. Run `npm run build`.
6. Commit the source changes and push `main` to GitHub so Cloudflare Pages deploys automatically:
   - `git add <changed files>`
   - `git commit -m "Update site content"`
   - `git push origin main`
7. If manual Cloudflare Pages deployment is needed, create a temporary publish directory that excludes all files over 25 MiB.
   - Example:
     `rsync -a --delete --exclude='downloads/LargeApp-macOS.dmg' dist/ /private/tmp/dazzle-cf-dist/`
8. Confirm the temporary directory has no oversized files:
   - `find /private/tmp/dazzle-cf-dist -type f -size +25M -print`
9. Deploy the temporary directory to Cloudflare Pages:
    - `npm exec --yes --registry=https://registry.npmjs.org --package wrangler -- wrangler pages deploy /private/tmp/dazzle-cf-dist --project-name=dazzle-galaxy-show --branch=main --commit-dirty=true`
10. Verify the production site responds:
    - `curl -I https://dazzle-galaxy-show.pages.dev`

Current known oversized files that exceed Cloudflare Pages' single-file limit and are served through the Netlify `/downloads/*` CDN exception until moved elsewhere:

- `public/downloads/DazzleSecretaryPro-Windows-解压即用.zip`
- `public/downloads/DazzleSecretary-Android-debug.apk.1.1`
- `public/downloads/利润助手-macOS.dmg`
- `public/downloads/利润助手-macOS.zip`
- `release-assets/利润助手-Android-debug.apk` is committed to GitHub and linked with `githubAsset(...)`; it was added on 2026-05-27 so the `pages.dev` release page shows an Android APK download for 利润助手.

## 软件包与项目档案更新流程

新增或更新可下载软件、桌面应用、工具包，或同步更新个人作品说明时，统一沿用下面流程：保持现有风格、页面结构和跳转逻辑不变，只做最小幅度代码改动。

1. 先确认来源项目
   - 检查用户提供的软件项目目录、构建脚本、现有产物和应用信息。
   - 优先使用项目已有的构建脚本或打包方式。
   - 如果构建脚本因为非核心依赖失败，但已有可复用资源，可以按原脚本结构手动组装产物，不改动来源项目逻辑。

2. 生成发行包
   - macOS 应用优先生成 `.dmg` 和 `.zip` 两种包。
   - 产物统一放入 `public/downloads/`。
   - 文件命名采用：`软件名-macOS.dmg`、`软件名-macOS.zip`。
   - 生成后记录文件大小和 SHA-256，用于下载页展示和校验。

3. 更新软件发行页
   - 修改 `src/components/Themes/OrbitContent.tsx`。
   - 在 `ReleaseKey` 中增加新的发行 key。
   - 在 `releases` 数组中新增或更新对应节点。
   - 补齐 `title`、`subtitle`、`date`、`node`、`icon`、`body`、`status`、`platform`、下载链接、SHA-256、系统要求、节点说明和关键词。
   - 如新增节点影响编号，顺延后续 `node` 编号。
   - 大于 25 MiB 的下载包不能直接发布到 Cloudflare Pages。现有历史包可沿用 `legacyDownload('/downloads/...')`，新包优先放 `release-assets/` 并用 `githubAsset(...)`；若超过 GitHub 普通文件限制，再询问用户要使用的存储/CDN 方案。

4. 更新个人作品页
   - 修改 `src/components/Themes/CreationsContent.tsx`。
   - 在 `Project` 的 `releaseTarget` 联合类型中增加对应 key。
   - 在 `projects` 数组中新增或更新项目说明。
   - 文案结构沿用现有字段：`desc`、`requirements`、`problem`、`design`、`techStack`、`highlights`。
   - 有下载页的软件必须设置 `releaseTarget`，让“查看发行页面”跳到对应发行节点。

5. 保持设计一致
   - 不新增独立页面。
   - 不改现有视觉风格、交互动效和布局体系。
   - 不引入新的状态管理或数据层。
   - 只在现有数组、类型和必要 import 上做增量改动。

6. 验证
   - 运行 `npm run build`，确认 TypeScript 和 Vite 构建通过。
   - 如果启动本地服务，优先使用可用端口；端口占用时换下一个端口。
   - 用浏览器确认软件发行页出现新节点、DMG/ZIP 下载链接显示正确、SHA-256 校验值显示正确、个人作品页出现对应项目、项目详情中的“查看发行页面”能跳到对应发行节点。

## 注意事项

- `public/downloads/*` 当前被 `.gitignore` 忽略，新生成的发行包可能不会出现在 `git status` 中，但仍应确认文件真实存在。
- 不要回滚用户已有改动；仓库存在无关改动时，只处理本次任务需要的文件。
- 下载包体积、哈希值必须以实际生成文件为准，不要手写猜测。
