---
name: galaxy-site
description: Use the installed `galaxy-site` CLI to build, verify, and manually deploy the dazzle-galaxy-show portfolio site from any working directory.
---

# Galaxy Site CLI

Use this skill when working on the `dazzle-galaxy-show` portfolio deployment flow.

## Start Here

Prefer the installed command on PATH:

```bash
command -v galaxy-site
galaxy-site --json doctor
```

If `galaxy-site` is missing, go to the portfolio repo and install it:

```bash
make -C tools/galaxy-site-cli install-local
```

## Normal Read Path

Check repository and deployment metadata:

```bash
galaxy-site --json repo info
galaxy-site --json repo status
```

Verify the public Cloudflare Pages site:

```bash
galaxy-site --json site verify
```

## Build And Prepare

Run these before a manual deploy:

```bash
galaxy-site --json build
galaxy-site --json dist prepare
galaxy-site --json dist check-large
```

`dist check-large` guards against Cloudflare Pages single-file size problems.

## Manual Deploy

Dry-run first:

```bash
galaxy-site --json deploy manual
```

Only run a live deploy when the user explicitly asks to update the website or confirms the deploy:

```bash
galaxy-site --json deploy manual --confirm
```

One-command update is also live only with `--confirm`:

```bash
galaxy-site --json update --confirm
```

## Raw Read Escape Hatch

Use this for simple URL reachability checks when high-level commands are missing:

```bash
galaxy-site --json request head https://dazzle-galaxy-show.pages.dev
```

## Safety Rules

- Do not run `deploy manual --confirm` or `update --confirm` unless the user explicitly asked to update/deploy the site.
- Do not use Netlify as the public website entrypoint.
- Do not add downloads without verifying their target URLs separately.
- Keep using `--json` when Codex needs to parse output.

## Examples

```bash
galaxy-site --json doctor
galaxy-site --json update
galaxy-site --json update --confirm
```
