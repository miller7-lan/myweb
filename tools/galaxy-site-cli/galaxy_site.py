#!/usr/bin/env python3
"""CLI for the dazzle-galaxy-show portfolio deployment workflow."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
PROJECT_NAME = "dazzle-galaxy-show"
MAIN_BRANCH = "main"
PUBLIC_URL = "https://dazzle-galaxy-show.pages.dev"
DIST_DIR = REPO_ROOT / "dist"
CF_DIST_DIR = Path("/private/tmp/dazzle-cf-dist")
MAX_CLOUDFLARE_FILE_BYTES = 25 * 1024 * 1024


class CliError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None, exit_code: int = 1):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.exit_code = exit_code


def run(
    command: list[str],
    *,
    cwd: Path = REPO_ROOT,
    check: bool = True,
    capture: bool = True,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=str(cwd),
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        check=False,
    )
    if check and result.returncode != 0:
        raise CliError(
            "command_failed",
            f"Command failed: {' '.join(command)}",
            {
                "command": command,
                "cwd": str(cwd),
                "exit_code": result.returncode,
                "stdout": (result.stdout or "")[-4000:],
                "stderr": (result.stderr or "")[-4000:],
            },
            result.returncode or 1,
        )
    return result


def emit(payload: Any, *, json_mode: bool) -> None:
    if json_mode:
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
        return
    if isinstance(payload, dict) and "message" in payload:
        print(payload["message"])
    else:
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))


def ok(data: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"ok": True, **(data or {})}


def which(name: str) -> str | None:
    return shutil.which(name)


def git_status() -> dict[str, Any]:
    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()
    short = run(["git", "status", "--short", "--branch"]).stdout.strip().splitlines()
    porcelain = run(["git", "status", "--porcelain"]).stdout.strip()
    ahead_behind = short[0] if short else ""
    return {
        "branch": branch,
        "status_short": short,
        "clean": porcelain == "",
        "tracking": ahead_behind,
    }


def command_available(command: str) -> dict[str, Any]:
    path = which(command)
    return {"available": path is not None, "path": path}


def doctor(args: argparse.Namespace) -> dict[str, Any]:
    tools = {name: command_available(name) for name in ["git", "npm", "rsync", "find", "curl", "python3"]}
    wrangler_hint = {
        "available_via_npm_exec": tools["npm"]["available"],
        "command": [
            "npm",
            "exec",
            "--yes",
            "--registry=https://registry.npmjs.org",
            "--package",
            "wrangler",
            "--",
            "wrangler",
            "--version",
        ],
    }
    auth_sources = {
        "cloudflare_api_token": "env" if os.environ.get("CLOUDFLARE_API_TOKEN") else "missing",
        "wrangler_login": "provider_default_or_missing",
    }
    return ok(
        {
            "repo_root": str(REPO_ROOT),
            "repo_exists": REPO_ROOT.exists(),
            "project_name": PROJECT_NAME,
            "main_branch": MAIN_BRANCH,
            "public_url": PUBLIC_URL,
            "dist_dir": str(DIST_DIR),
            "dist_exists": DIST_DIR.exists(),
            "cf_dist_dir": str(CF_DIST_DIR),
            "tools": tools,
            "wrangler": wrangler_hint,
            "auth": auth_sources,
            "git": git_status() if (REPO_ROOT / ".git").exists() else {"available": False},
        }
    )


def repo_info(args: argparse.Namespace) -> dict[str, Any]:
    return ok(
        {
            "repo_root": str(REPO_ROOT),
            "github_repository": "https://github.com/miller7-lan/myweb",
            "main_branch": MAIN_BRANCH,
            "public_url": PUBLIC_URL,
            "cloudflare_pages_project": PROJECT_NAME,
        }
    )


def repo_status(args: argparse.Namespace) -> dict[str, Any]:
    return ok({"git": git_status()})


def build(args: argparse.Namespace) -> dict[str, Any]:
    if args.dry_run:
        return ok({"dry_run": True, "command": ["npm", "run", "build"], "cwd": str(REPO_ROOT)})
    start = time.time()
    result = run(["npm", "run", "build"])
    return ok(
        {
            "command": ["npm", "run", "build"],
            "cwd": str(REPO_ROOT),
            "duration_seconds": round(time.time() - start, 3),
            "stdout_tail": (result.stdout or "")[-4000:],
            "stderr_tail": (result.stderr or "")[-4000:],
        }
    )


def prepare_dist(args: argparse.Namespace) -> dict[str, Any]:
    if not DIST_DIR.exists():
        raise CliError("missing_dist", "dist does not exist; run galaxy-site build first", {"dist_dir": str(DIST_DIR)})
    command = ["rsync", "-a", "--delete", "--exclude=downloads/", f"{DIST_DIR}/", f"{CF_DIST_DIR}/"]
    if args.dry_run:
        return ok({"dry_run": True, "command": command})
    run(command)
    file_count = sum(1 for item in CF_DIST_DIR.rglob("*") if item.is_file())
    return ok({"cf_dist_dir": str(CF_DIST_DIR), "file_count": file_count})


def check_large(args: argparse.Namespace) -> dict[str, Any]:
    target = Path(args.path).expanduser() if args.path else CF_DIST_DIR
    if not target.exists():
        raise CliError("missing_directory", "Directory does not exist", {"path": str(target)})
    large = []
    for item in target.rglob("*"):
        if item.is_file():
            size = item.stat().st_size
            if size > args.max_bytes:
                large.append({"path": str(item), "bytes": size})
    return ok({"path": str(target), "max_bytes": args.max_bytes, "large_files": large, "passed": not large})


def verify_site(args: argparse.Namespace) -> dict[str, Any]:
    url = args.url or PUBLIC_URL
    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "galaxy-site-cli/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            return ok({"url": url, "status": response.status, "headers": dict(response.headers), "passed": 200 <= response.status < 400})
    except urllib.error.HTTPError as exc:
        return ok({"url": url, "status": exc.code, "headers": dict(exc.headers), "passed": False})
    except urllib.error.URLError as exc:
        raise CliError("request_failed", "HEAD request failed", {"url": url, "reason": str(exc.reason)})


def deploy_command() -> list[str]:
    return [
        "npm",
        "exec",
        "--yes",
        "--registry=https://registry.npmjs.org",
        "--package",
        "wrangler",
        "--",
        "wrangler",
        "pages",
        "deploy",
        str(CF_DIST_DIR),
        "--project-name",
        PROJECT_NAME,
        "--branch",
        MAIN_BRANCH,
        "--commit-dirty=true",
    ]


def deploy_manual(args: argparse.Namespace) -> dict[str, Any]:
    command = deploy_command()
    if args.dry_run or not args.confirm:
        return ok(
            {
                "dry_run": True,
                "requires_confirm": True,
                "command": command,
                "note": "Run with --confirm to perform a live Cloudflare Pages deploy.",
            }
        )
    if not CF_DIST_DIR.exists():
        raise CliError("missing_cf_dist", "Prepared Cloudflare dist directory does not exist", {"cf_dist_dir": str(CF_DIST_DIR)})
    result = run(command)
    preview_url = None
    for token in (result.stdout or "").split():
        if token.startswith("https://") and token.endswith(".pages.dev"):
            preview_url = token
    return ok(
        {
            "command": command,
            "stdout_tail": (result.stdout or "")[-4000:],
            "stderr_tail": (result.stderr or "")[-4000:],
            "preview_url": preview_url,
        }
    )


def update_site(args: argparse.Namespace) -> dict[str, Any]:
    if args.dry_run or not args.confirm:
        return ok(
            {
                "dry_run": True,
                "requires_confirm": True,
                "steps": [
                    ["npm", "run", "build"],
                    ["rsync", "-a", "--delete", "--exclude=downloads/", f"{DIST_DIR}/", f"{CF_DIST_DIR}/"],
                    ["check files larger than 25 MiB"],
                    deploy_command(),
                    ["HEAD", PUBLIC_URL],
                ],
            }
        )
    build_result = build(argparse.Namespace(dry_run=False))
    prepare_result = prepare_dist(argparse.Namespace(dry_run=False))
    large_result = check_large(argparse.Namespace(path=None, max_bytes=MAX_CLOUDFLARE_FILE_BYTES))
    if large_result["large_files"]:
        raise CliError("large_files", "Prepared dist has files larger than Cloudflare Pages limit", large_result)
    deploy_result = deploy_manual(argparse.Namespace(dry_run=False, confirm=True))
    verify_result = verify_site(argparse.Namespace(url=PUBLIC_URL, timeout=args.timeout))
    return ok(
        {
            "build": build_result,
            "prepare": prepare_result,
            "check_large": large_result,
            "deploy": deploy_result,
            "verify": verify_result,
        }
    )


def request_head(args: argparse.Namespace) -> dict[str, Any]:
    return verify_site(argparse.Namespace(url=args.url, timeout=args.timeout))


def add_common(parser: argparse.ArgumentParser) -> None:
    parser.set_defaults(func=None)


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="galaxy-site", description="Manage the dazzle-galaxy-show portfolio build and deployment workflow.")
    parser.add_argument("--json", action="store_true", help="Emit stable JSON to stdout.")
    sub = parser.add_subparsers(dest="command", required=True)

    doctor_parser = sub.add_parser("doctor", help="Check local setup, repo state, tools, and auth hints.")
    doctor_parser.set_defaults(func=doctor)

    repo_parser = sub.add_parser("repo", help="Read repository metadata and git status.")
    repo_sub = repo_parser.add_subparsers(dest="repo_command", required=True)
    repo_info_parser = repo_sub.add_parser("info", help="Show canonical repository and deployment metadata.")
    repo_info_parser.set_defaults(func=repo_info)
    repo_status_parser = repo_sub.add_parser("status", help="Show current branch, tracking, and dirty state.")
    repo_status_parser.set_defaults(func=repo_status)

    build_parser = sub.add_parser("build", help="Run npm run build.")
    build_parser.add_argument("--dry-run", action="store_true", help="Return the command without running it.")
    build_parser.set_defaults(func=build)

    dist_parser = sub.add_parser("dist", help="Prepare and inspect Cloudflare deploy files.")
    dist_sub = dist_parser.add_subparsers(dest="dist_command", required=True)
    prepare_parser = dist_sub.add_parser("prepare", help="Copy dist to the Cloudflare deploy temp directory.")
    prepare_parser.add_argument("--dry-run", action="store_true", help="Return the command without running it.")
    prepare_parser.set_defaults(func=prepare_dist)
    check_parser = dist_sub.add_parser("check-large", help="Check for files larger than the Cloudflare Pages practical limit.")
    check_parser.add_argument("--path", help="Directory to scan. Defaults to the prepared Cloudflare dist directory.")
    check_parser.add_argument("--max-bytes", type=int, default=MAX_CLOUDFLARE_FILE_BYTES, help="Maximum allowed file size in bytes.")
    check_parser.set_defaults(func=check_large)

    site_parser = sub.add_parser("site", help="Read public or preview site status.")
    site_sub = site_parser.add_subparsers(dest="site_command", required=True)
    verify_parser = site_sub.add_parser("verify", help="HEAD-check the public site or a provided URL.")
    verify_parser.add_argument("--url", help=f"URL to verify. Defaults to {PUBLIC_URL}.")
    verify_parser.add_argument("--timeout", type=float, default=15.0, help="Request timeout in seconds.")
    verify_parser.set_defaults(func=verify_site)

    deploy_parser = sub.add_parser("deploy", help="Run deployment actions.")
    deploy_sub = deploy_parser.add_subparsers(dest="deploy_command", required=True)
    manual_parser = deploy_sub.add_parser("manual", help="Manually deploy prepared files to Cloudflare Pages.")
    manual_parser.add_argument("--confirm", action="store_true", help="Perform the live deploy. Without this, returns a dry-run plan.")
    manual_parser.add_argument("--dry-run", action="store_true", help="Return the command without running it.")
    manual_parser.set_defaults(func=deploy_manual)

    update_parser = sub.add_parser("update", help="Build, prepare, deploy, and verify the public site.")
    update_parser.add_argument("--confirm", action="store_true", help="Perform the live deploy. Without this, returns a dry-run plan.")
    update_parser.add_argument("--dry-run", action="store_true", help="Return the plan without running it.")
    update_parser.add_argument("--timeout", type=float, default=15.0, help="Verification timeout in seconds.")
    update_parser.set_defaults(func=update_site)

    request_parser = sub.add_parser("request", help="Raw read-only request escape hatch.")
    request_sub = request_parser.add_subparsers(dest="request_command", required=True)
    head_parser = request_sub.add_parser("head", help="Run a read-only HEAD request against a URL.")
    head_parser.add_argument("url", help="URL to check.")
    head_parser.add_argument("--timeout", type=float, default=15.0, help="Request timeout in seconds.")
    head_parser.set_defaults(func=request_head)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = make_parser()
    args = parser.parse_args(argv)
    try:
        payload = args.func(args)
        emit(payload, json_mode=args.json)
        return 0
    except CliError as exc:
        error = {"ok": False, "error": {"code": exc.code, "message": exc.message, "details": exc.details}}
        emit(error, json_mode=args.json)
        return exc.exit_code
    except KeyboardInterrupt:
        emit({"ok": False, "error": {"code": "interrupted", "message": "Interrupted", "details": {}}}, json_mode=args.json)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
