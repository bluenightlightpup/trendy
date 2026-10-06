"""Locate Trendy data files in a git checkout or an installed package.

Resolution order for the read-only lexicon / trends data:

1. ``TRENDY_DATA_DIR`` (if set)
2. ``<repo>/web/data`` when running from a git checkout
3. ``<package>/data`` bundled inside the installed wheel

Writable state (community suggestions) goes to the checkout when there is one,
otherwise to ``TRENDY_HOME`` (default ``~/.trendy``) so an installed package
never writes into site-packages.
"""

from __future__ import annotations

import os
from pathlib import Path

PKG_DIR = Path(__file__).resolve().parent
REPO_ROOT = PKG_DIR.parent
_CHECKOUT_DATA = REPO_ROOT / "web" / "data"
_BUNDLED_DATA = PKG_DIR / "data"


def is_checkout() -> bool:
    """True when running from a git checkout (web/data next to cli/)."""
    return (_CHECKOUT_DATA / "slang.json").is_file()


def data_dir() -> Path:
    override = (os.environ.get("TRENDY_DATA_DIR") or "").strip()
    if override:
        return Path(override).expanduser()
    if is_checkout():
        return _CHECKOUT_DATA
    return _BUNDLED_DATA


def home_dir() -> Path:
    override = (os.environ.get("TRENDY_HOME") or "").strip()
    return Path(override).expanduser() if override else Path.home() / ".trendy"


def community_read_path() -> Path:
    """Community lexicon to read: user copy first (installed), else data dir."""
    if not is_checkout():
        user_copy = home_dir() / "community-slang.json"
        if user_copy.is_file():
            return user_copy
    return data_dir() / "community-slang.json"


def community_write_path() -> Path:
    if is_checkout() and not os.environ.get("TRENDY_DATA_DIR"):
        return _CHECKOUT_DATA / "community-slang.json"
    return home_dir() / "community-slang.json"


def suggestions_path() -> Path:
    if is_checkout():
        return REPO_ROOT / "radar" / "out" / "suggestions.jsonl"
    return home_dir() / "suggestions.jsonl"


def last_run_path() -> Path:
    """Radar summary: live file in a checkout, bundled snapshot when installed."""
    if is_checkout():
        return REPO_ROOT / "radar" / "out" / "last-run.json"
    return _BUNDLED_DATA / "last-run.json"


def ingest_script() -> Path | None:
    script = REPO_ROOT / "radar" / "run_ingest.py"
    return script if script.is_file() else None
