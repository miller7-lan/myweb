# Agent Notes

## Canonical Deployment Model

This repository is the source of truth for the portfolio site:

- GitHub repository: `https://github.com/miller7-lan/myweb`
- Main branch: `main`
- Public website: `https://dazzle-galaxy-show.pages.dev`
- Cloudflare Pages project: `dazzle-galaxy-show`

The normal update path is:

1. Edit source files.
2. Run `npm run build`.
3. Commit changes to `main`.
4. Push to GitHub with `git push origin main`.
5. Let GitHub-connected Cloudflare Pages update `https://dazzle-galaxy-show.pages.dev`.

Use a manual Cloudflare Pages deploy only when GitHub-connected deployment is slow, failed, or explicitly requested:

```bash
rsync -a --delete --exclude='downloads/' dist/ /private/tmp/dazzle-cf-dist/
find /private/tmp/dazzle-cf-dist -type f -size +25M -print
npm exec --yes --registry=https://registry.npmjs.org --package wrangler -- \
  wrangler pages deploy /private/tmp/dazzle-cf-dist \
  --project-name=dazzle-galaxy-show \
  --branch=main \
  --commit-dirty=true
```

If using Wrangler or changing Cloudflare behavior, load and follow the Cloudflare/Wrangler skill first. Verify current Wrangler syntax rather than relying on memory.

## Netlify Role

Netlify is not the public website entrypoint.

- Do not present `https://dazzle-galaxy-show.netlify.app` as the website URL.
- Netlify root/app routes should redirect to `https://dazzle-galaxy-show.pages.dev`.
- Netlify is kept only as a legacy file CDN for `https://dazzle-galaxy-show.netlify.app/downloads/*`.

Only use the Netlify skill/CLI when:

- Updating Netlify redirect rules.
- Uploading or preserving legacy files under `/downloads/*`.
- Verifying Netlify download CDN availability.

When changing Netlify config, deploy it intentionally:

```bash
npm exec --yes --registry=https://registry.npmjs.org --package netlify-cli -- \
  netlify deploy --prod --dir=dist --message "Update download CDN redirects"
```

Afterward verify:

```bash
curl -I https://dazzle-galaxy-show.netlify.app/foo
curl -I https://dazzle-galaxy-show.netlify.app/downloads/<encoded-file-name>
```

Expected behavior:

- Non-download paths return `301` to `https://dazzle-galaxy-show.pages.dev/...`.
- `/downloads/*` file paths return `200`.

## Download Asset Rules

Every visible download button on `https://dazzle-galaxy-show.pages.dev` must work.

Cloudflare Pages has a practical single-file limit around 25 MiB. Do not assume files in `public/downloads/` are available on Cloudflare Pages, because `public/downloads/*` is ignored by Git except `README.txt`.

Use one of these link helpers in `src/components/Themes/OrbitContent.tsx`:

- `githubAsset('release-assets/<file>')`
  - Use for files committed under `release-assets/`.
  - Good for new assets that fit GitHub's normal file-size constraints.
  - Example: `release-assets/利润助手-Android-debug.apk`.

- `legacyDownload('/downloads/<file>')`
  - Use for legacy files that exist on the Netlify `/downloads/*` CDN.
  - Use when the file is ignored from Git or too large for Cloudflare Pages.
  - Do not use Netlify for page routes, only for file downloads.

- Direct `'/downloads/<file>'`
  - Only use if the file is tracked in Git, deployed by Cloudflare Pages, and verified with `curl -I https://dazzle-galaxy-show.pages.dev/downloads/<file>`.

Do not add a download entry until the target URL has been verified with `curl -I` and returns a successful status.

Current known large or special assets:

- `public/downloads/DazzleSecretaryPro-Windows-解压即用.zip` → `legacyDownload(...)`
- `public/downloads/DazzleSecretary-Android-debug.apk.1.1` → `legacyDownload(...)`
- `public/downloads/利润助手-macOS.dmg` → `legacyDownload(...)`
- `public/downloads/利润助手-macOS.zip` → `legacyDownload(...)`
- `release-assets/利润助手-Android-debug.apk` → `githubAsset(...)`

The 利润助手 Android APK was added on 2026-05-27. It appears on the `pages.dev` release page as `Android APK (26 MB)` and points to GitHub raw.

## Software Package Release Workflow

When adding or updating downloadable software:

1. Confirm the source project.
   - Inspect the user's provided project directory, build scripts, artifacts, and application metadata.
   - Prefer existing build scripts and packaging conventions.
   - Do not modify the source project logic unless the user explicitly asks.

2. Generate release packages.
   - macOS apps usually need both `.dmg` and `.zip`.
   - Android apps use `.apk`.
   - Windows bundles usually use `.zip`.
   - Record actual file size and SHA-256 from the generated file. Never guess.

3. Decide storage and link type.
   - New tracked assets: put under `release-assets/` and link with `githubAsset(...)`.
   - Existing legacy packages already on Netlify CDN: keep using `legacyDownload(...)`.
   - Oversized new packages that cannot live in GitHub or Cloudflare Pages: stop and ask the user for the desired storage/CDN.

4. Update `src/components/Themes/OrbitContent.tsx`.
   - Update `ReleaseKey` if adding a new release.
   - Add or update the item in `releases`.
   - Fill `title`, `subtitle`, `date`, `node`, `icon`, `body`, `status`, `platform`, downloads, SHA-256, specs, scenes, and keywords.
   - Keep platform labels accurate, e.g. `macOS / Android`.

5. Update `src/components/Themes/CreationsContent.tsx` when needed.
   - Add the `releaseTarget` key to project metadata.
   - Ensure "查看发行页面" opens the correct release node.
   - If a release changes platform support, download availability, or product positioning, update the matching project card too. Do not update only `OrbitContent.tsx`.
   - Keep the existing creation-card style: update `subtitle`, `desc`, `requirements`, `problem`, `design`, `techStack`, and `highlights` instead of adding a separate visual section.
   - On 2026-05-27, 利润助手 was updated in the creations archive from a desktop-only local ledger to `Local Profit Ledger · Desktop / Android`, reflecting the Kotlin Android APK and shared `family_ledger.db` workflow.

6. Keep design consistent.
   - Do not add a separate page for a release.
   - Do not change the overall visual system unless asked.
   - Keep edits scoped to data arrays, release metadata, and necessary imports.

7. Validate.
   - Run `npm run build`.
   - Verify every visible download URL:

```bash
curl -L -o /dev/null -s -w '%{http_code}\n' -I '<download-url>'
```

   - Verify the site:

```bash
curl -I https://dazzle-galaxy-show.pages.dev
```

   - If the page is deployed, verify the built JS contains any newly added label, e.g.:

```bash
html=$(curl -fsSL https://dazzle-galaxy-show.pages.dev)
asset=$(printf '%s' "$html" | sed -n 's/.*src="\([^"]*assets\/index-[^"]*\.js\)".*/\1/p' | head -1)
curl -fsSL "https://dazzle-galaxy-show.pages.dev$asset" | grep 'Android APK'
```

## Git Workflow

Before editing:

```bash
git status --short
```

After edits:

```bash
npm run build
git add <changed files>
git commit -m "<clear message>"
git push origin main
```

Do not revert unrelated user changes. If the worktree has unrelated modifications, leave them alone unless they block the task.

## Current Site Notes

- The site is a Vite/React app.
- Build command: `npm run build`.
- Build output: `dist`.
- `public/downloads/*` is ignored by Git except `public/downloads/README.txt`.
- `release-assets/` is used for committed downloadable assets that should not be bundled into Cloudflare Pages' publish directory.
- `netlify.toml` intentionally keeps `/downloads/*` available and redirects other routes to Cloudflare Pages.
- `src/components/Themes/SignalContent.tsx` uses `VITE_CONTACT_API_URL` or `/api/contact`; do not point public page code back to Netlify unless explicitly requested.
