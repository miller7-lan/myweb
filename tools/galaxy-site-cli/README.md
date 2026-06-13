# galaxy-site

`galaxy-site` is a small durable CLI for the `dazzle-galaxy-show` portfolio deployment workflow.

It follows the deployment model documented in the repository `AGENTS.md`:

- Source repository: `https://github.com/miller7-lan/myweb`
- Main branch: `main`
- Public website: `https://dazzle-galaxy-show.pages.dev`
- Cloudflare Pages project: `dazzle-galaxy-show`

## Install

From the repository root:

```bash
make -C tools/galaxy-site-cli install-local
```

This installs a small wrapper at `~/.local/bin/galaxy-site`.

## JSON Policy

Use `--json` when Codex or scripts need stable output.

Success shape:

```json
{ "ok": true }
```

Error shape:

```json
{
  "ok": false,
  "error": {
    "code": "command_failed",
    "message": "Command failed: npm run build",
    "details": {}
  }
}
```

The CLI never prints full tokens. `doctor --json` reports auth source categories only.

## Commands

```bash
galaxy-site --json doctor
galaxy-site --json repo info
galaxy-site --json repo status
galaxy-site --json build
galaxy-site --json dist prepare
galaxy-site --json dist check-large
galaxy-site --json site verify
galaxy-site --json deploy manual --dry-run
galaxy-site --json deploy manual --confirm
galaxy-site --json update --dry-run
galaxy-site --json update --confirm
galaxy-site --json request head https://dazzle-galaxy-show.pages.dev
```

Live deploys require `--confirm`. Without `--confirm`, deploy commands return a dry-run plan.

## Common Workflows

Build and inspect deploy files:

```bash
galaxy-site --json build
galaxy-site --json dist prepare
galaxy-site --json dist check-large
```

Manual Cloudflare Pages deploy:

```bash
galaxy-site --json deploy manual --confirm
galaxy-site --json site verify
```

One-command update:

```bash
galaxy-site --json update --confirm
```

## Auth

Wrangler uses its normal authentication:

- `CLOUDFLARE_API_TOKEN` in the environment, or
- an existing `wrangler login` session.

`galaxy-site --json doctor` reports whether `CLOUDFLARE_API_TOKEN` is present but does not validate or print the token.
