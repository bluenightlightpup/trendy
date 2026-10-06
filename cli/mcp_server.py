#!/usr/bin/env python3
"""Local stdio MCP server for Trendy.

Read-only tools over the same lexicon / trends / radar files as the CLI.
No network, no live-model calls, no write tools, no secrets in results.

Run it any of these ways (the working directory does not matter):

  trendy mcp                          # installed package
  python3 /abs/path/to/trendy/cli/trendy.py mcp
  python3 -m cli.mcp_server           # from the repo root

Transport: newline-delimited JSON-RPC 2.0 on stdin/stdout (MCP stdio).
Only JSON-RPC goes to stdout, always UTF-8. Logs go to stderr.
See docs/cli-mcp-integration.md.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

if not __package__:
    _PKG = Path(__file__).resolve().parent
    if str(_PKG.parent) not in sys.path:
        sys.path.insert(0, str(_PKG.parent))
    __package__ = _PKG.name  # noqa: A001

from . import __version__  # noqa: E402

# Newest first. If the client asks for one of these we echo it; otherwise we
# answer with the newest version we support (MCP lifecycle / version negotiation).
SUPPORTED_PROTOCOL_VERSIONS = ("2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05")
LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0]
PROTOCOL_DEFAULT = LATEST_PROTOCOL_VERSION
SERVER_NAME = "trendy"
SERVER_VERSION = __version__

# JSON-RPC error codes
PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603

# Keys or values that must never leave the process in a tool result.
_SECRET_KEY = re.compile(
    r"(api[_-]?key|token|secret|password|authorization|credential|cookie|bearer)",
    re.IGNORECASE,
)
_SECRET_VAL = re.compile(
    r"(sk-[A-Za-z0-9_\-]{8,}|Bearer\s+\S+|ghp_[A-Za-z0-9]+|github_pat_\S+|xox[baprs]-[A-Za-z0-9\-]+)",
    re.IGNORECASE,
)

TOOL_NAMES = ("decode_term", "search_slang", "get_trends", "radar_status")

_session: dict[str, Any] = {"protocolVersion": None}


class ToolInputError(ValueError):
    """Bad tool arguments — reported as a tool execution error (isError: true)."""


def _trendy():
    from . import trendy

    return trendy


def negotiate_protocol(requested: Any) -> str:
    if isinstance(requested, str) and requested in SUPPORTED_PROTOCOL_VERSIONS:
        return requested
    return LATEST_PROTOCOL_VERSION


def scrub(obj: Any) -> Any:
    """Drop secret-shaped keys and redact token-like strings."""
    if isinstance(obj, dict):
        out: dict[str, Any] = {}
        for key, value in obj.items():
            if _SECRET_KEY.search(str(key)):
                out[str(key)] = "[redacted]"
            else:
                out[str(key)] = scrub(value)
        return out
    if isinstance(obj, list):
        return [scrub(item) for item in obj]
    if isinstance(obj, str) and _SECRET_VAL.search(obj):
        return _SECRET_VAL.sub("[redacted]", obj)
    return obj


def _public_entry(entry: dict[str, Any], lexicon: str | None) -> dict[str, Any]:
    trendy = _trendy()
    return {
        "terms": trendy._entry_terms(entry),
        "meaning": str(entry.get("short") or "").strip(),
        "explain": str(entry.get("explain") or "").strip(),
        "origin": str(entry.get("origin") or "").strip(),
        "age": trendy.format_age(entry) or None,
        "kind": trendy.entry_kind(entry, lexicon),
        "lexicon": lexicon,
    }


# --------------------------------------------------------------------------- tools


def decode_term(term: str) -> dict[str, Any]:
    """Lexicon decode only. Does not call the live model or read API keys."""
    text = str(term or "").strip()
    if not text:
        raise ToolInputError("term is required")
    payload = _trendy().decode_payload(text)
    if not payload["found"]:
        payload["note"] = "No lexicon hit. Live model decode is not available on this MCP server."
    return payload


def search_slang(query: str, limit: int = 20) -> dict[str, Any]:
    trendy = _trendy()
    needle = trendy._norm(query)
    if len(needle.replace(" ", "")) < 2:
        raise ToolInputError("query must be at least 2 characters")
    cap = _clamp_limit(limit, default=20)
    needle_toks = needle.split()
    padded_needle = f" {needle} "
    ranked: list[tuple[int, int, dict[str, Any]]] = []
    order = 0
    for lexicon, entries in trendy._lexicons():
        for entry in entries:
            terms = trendy._entry_terms(entry)
            norm_terms = [trendy._norm(t) for t in terms]
            term_words = set(" ".join(norm_terms).split())
            text_words = set(
                trendy._norm(
                    " ".join(
                        [
                            str(entry.get("short") or ""),
                            str(entry.get("explain") or ""),
                            str(entry.get("origin") or ""),
                        ]
                    )
                ).split()
            )
            score = 0
            if needle in norm_terms:
                score = 100
            elif any(padded_needle in f" {t} " for t in norm_terms):
                score = 80  # whole-word phrase inside a listed term
            elif all(tok in term_words for tok in needle_toks):
                score = 70
            elif all(tok in text_words for tok in needle_toks):
                score = 40  # whole words in the meaning / explain / origin
            if score:
                if trendy.is_abbreviation(entry, lexicon):
                    score -= 5  # curated slang first on ties
                order += 1
                ranked.append((score, -order, _public_entry(entry, lexicon)))
    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    hits = [item[2] for item in ranked[:cap]]
    return {"query": str(query), "count": len(hits), "hits": hits}


def get_trends(
    min_heat: float = 0.0,
    limit: int = 20,
    world: str | None = None,
) -> dict[str, Any]:
    trendy = _trendy()
    try:
        floor = float(min_heat)
    except (TypeError, ValueError) as exc:
        raise ToolInputError("min_heat must be a number") from exc
    cap = _clamp_limit(limit, default=20)
    world_s = str(world).strip() if world else ""
    try:
        trends = trendy.trends_rows(floor, cap, world_s or None)
    except ValueError as exc:
        raise RuntimeError(str(exc)) from exc
    rows = [
        {
            "id": trend.get("id"),
            "title": trend.get("title"),
            "summary": trend.get("summary"),
            "origin": trend.get("originStory") or trend.get("origin"),
            "world": trend.get("world") or None,
            "heat": float(trend.get("heatScore") or 0),
            "lifecycle": trend.get("lifecycle"),
            "age": trendy.format_age(trend) or None,
        }
        for trend in trends
    ]
    return {
        "min_heat": floor,
        "limit": cap,
        "world": world_s or None,
        "count": len(rows),
        "trends": rows,
    }


def radar_status() -> dict[str, Any]:
    """Last local ingest summary. Adapter errors are kept; secrets are scrubbed."""
    trendy = _trendy()
    if not trendy.LAST_RUN_PATH.is_file():
        return {
            "available": False,
            "path": "radar/out/last-run.json",
            "message": "No last-run summary yet. Run from a git checkout: trendy radar run",
        }
    data = trendy._load_json(trendy.LAST_RUN_PATH, {})
    if not isinstance(data, dict):
        data = {}
    adapters_out: list[dict[str, Any]] = []
    for adapter in data.get("adapters") or []:
        if not isinstance(adapter, dict):
            continue
        adapters_out.append(
            {
                "source": adapter.get("source"),
                "mode": adapter.get("mode"),
                "ok": adapter.get("ok"),
                "skipped": adapter.get("skipped"),
                "signal_count": adapter.get("signal_count"),
                "error": adapter.get("error"),
                "notes": adapter.get("notes"),
            }
        )
    trends = data.get("trends") if isinstance(data.get("trends"), dict) else {}
    slang = data.get("slang") if isinstance(data.get("slang"), dict) else {}
    paths = data.get("paths") if isinstance(data.get("paths"), dict) else {}
    payload = {
        "available": True,
        "snapshot": not trendy.paths.is_checkout(),
        "timestamp": data.get("timestamp"),
        "signals": data.get("signals"),
        "adapters": adapters_out,
        "trends": {
            "added": trends.get("added"),
            "updated": trends.get("updated"),
            "total": trends.get("total"),
        },
        "slang": {
            "added": slang.get("added"),
            "updated": slang.get("updated"),
            "total": slang.get("total"),
        },
        "paths": {str(k): paths.get(k) for k in ("trends", "slang") if k in paths},
    }
    return scrub(payload)


def _clamp_limit(limit: Any, default: int = 20) -> int:
    try:
        value = int(limit)
    except (TypeError, ValueError):
        value = default
    return max(1, min(50, value))


# --------------------------------------------------------------- tool metadata

_READ_ONLY = {
    "readOnlyHint": True,
    "destructiveHint": False,
    "idempotentHint": True,
    "openWorldHint": False,
}


def tool_definitions() -> list[dict[str, Any]]:
    return [
        {
            "name": "decode_term",
            "title": "Decode slang term",
            "description": (
                "Look up one slang term, meme, or texting abbreviation in the local Trendy "
                "lexicon. Returns meaning, explain, origin, age band, and other senses when "
                "present. found=false on a miss. Read-only; does not call a live model."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "term": {
                        "type": "string",
                        "minLength": 1,
                        "description": "Slang term or phrase to decode, e.g. \"67\" or \"nah id win\"",
                    }
                },
                "required": ["term"],
                "additionalProperties": False,
            },
            "annotations": {"title": "Decode slang term", **_READ_ONLY},
        },
        {
            "name": "search_slang",
            "title": "Search slang lexicon",
            "description": (
                "Search the local slang, community, and texting-abbreviation lexicons by whole "
                "words. Read-only. Returns meaning, explain, origin, and age when present."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "minLength": 2,
                        "description": "Word or phrase to search for (at least 2 characters)",
                    },
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 50,
                        "description": "Max hits (default 20)",
                    },
                },
                "required": ["query"],
                "additionalProperties": False,
            },
            "annotations": {"title": "Search slang lexicon", **_READ_ONLY},
        },
        {
            "name": "get_trends",
            "title": "List hot trends",
            "description": (
                "List hot trends from the local catalog, highest heat first. "
                "Read-only. Filter by minimum heat (0–1) and optional world."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "min_heat": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1,
                        "description": "Minimum heat score from 0 to 1 (default 0)",
                    },
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 50,
                        "description": "Max rows (default 20)",
                    },
                    "world": {
                        "type": "string",
                        "description": "Optional world filter, for example TikTok, Gaming, Work / tech",
                    },
                },
                "additionalProperties": False,
            },
            "annotations": {"title": "List hot trends", **_READ_ONLY},
        },
        {
            "name": "radar_status",
            "title": "Trend Radar status",
            "description": (
                "Show the last Trend Radar ingest summary: which sources ran, failed, or were "
                "skipped, and catalog totals. Read-only. No secrets."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
            "annotations": {"title": "Trend Radar status", **_READ_ONLY},
        },
    ]


def _tool_schema(name: str) -> dict[str, Any] | None:
    for tool in tool_definitions():
        if tool["name"] == name:
            return tool["inputSchema"]
    return None


_JSON_TYPES = {
    "string": lambda v: isinstance(v, str),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "object": lambda v: isinstance(v, dict),
}


def validate_arguments(name: str, arguments: dict[str, Any]) -> None:
    """Small JSON-Schema subset check (types, required, ranges, unknown keys)."""
    schema = _tool_schema(name) or {}
    props: dict[str, Any] = schema.get("properties") or {}
    unknown = sorted(k for k in arguments if k not in props)
    if unknown and schema.get("additionalProperties") is False:
        allowed = ", ".join(props) or "none"
        raise ToolInputError(f"unknown argument(s): {', '.join(unknown)} (allowed: {allowed})")
    for key in schema.get("required") or []:
        if key not in arguments:
            raise ToolInputError(f"{key} is required")
    for key, value in arguments.items():
        spec = props.get(key) or {}
        expected = spec.get("type")
        check = _JSON_TYPES.get(str(expected))
        if check and not check(value):
            raise ToolInputError(f"{key} must be a{'n' if expected == 'integer' else ''} {expected}")
        if isinstance(value, str) and "minLength" in spec and len(value.strip()) < spec["minLength"]:
            raise ToolInputError(f"{key} must be at least {spec['minLength']} character(s)")
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if "minimum" in spec and value < spec["minimum"]:
                raise ToolInputError(f"{key} must be >= {spec['minimum']}")
            if "maximum" in spec and value > spec["maximum"]:
                raise ToolInputError(f"{key} must be <= {spec['maximum']}")


def _structured_ok() -> bool:
    proto = _session.get("protocolVersion") or LATEST_PROTOCOL_VERSION
    return proto >= "2025-06-18"


def _tool_result(payload: Any, is_error: bool = False) -> dict[str, Any]:
    if isinstance(payload, str):
        return {"content": [{"type": "text", "text": payload}], "isError": is_error}
    clean = scrub(payload)
    result: dict[str, Any] = {
        "content": [{"type": "text", "text": json.dumps(clean, ensure_ascii=False)}],
        "isError": is_error,
    }
    if _structured_ok() and isinstance(clean, dict):
        result["structuredContent"] = clean
    return result


def call_tool(name: str, arguments: dict[str, Any] | None) -> dict[str, Any]:
    """Run a known tool. Raises KeyError for unknown tools (caller maps to -32602)."""
    if name not in TOOL_NAMES:
        raise KeyError(name)
    args = arguments if isinstance(arguments, dict) else {}
    try:
        validate_arguments(name, args)
        if name == "decode_term":
            result = decode_term(args["term"])
        elif name == "search_slang":
            result = search_slang(args["query"], limit=args.get("limit", 20))
        elif name == "get_trends":
            result = get_trends(
                min_heat=args.get("min_heat", 0),
                limit=args.get("limit", 20),
                world=args.get("world"),
            )
        else:
            result = radar_status()
    except ToolInputError as exc:
        return _tool_result(f"Invalid arguments for {name}: {exc}", is_error=True)
    except Exception as exc:  # noqa: BLE001 — surface a scrubbed message, keep serving
        return _tool_result(scrub(f"{name} failed: {type(exc).__name__}: {exc}"), is_error=True)
    return _tool_result(result, is_error=False)


# ------------------------------------------------------------------- JSON-RPC


def _error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": code, "message": message},
    }


def _ok(req_id: Any, result: dict[str, Any]) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def dispatch(message: Any) -> dict[str, Any] | None:
    """Handle one JSON-RPC message. Notifications return None (no response)."""
    if not isinstance(message, dict) or message.get("jsonrpc") != "2.0":
        req_id = message.get("id") if isinstance(message, dict) else None
        return _error(req_id, INVALID_REQUEST, "Invalid Request")
    method = message.get("method")
    is_notification = "id" not in message
    req_id = message.get("id")
    if not isinstance(method, str):
        if is_notification:
            return None  # a response from the client; nothing to do
        return _error(req_id, INVALID_REQUEST, "Invalid Request: method must be a string")
    raw_params = message.get("params")
    if raw_params is not None and not isinstance(raw_params, dict):
        if is_notification:
            return None
        return _error(req_id, INVALID_PARAMS, "params must be an object")
    params = raw_params or {}

    if method.startswith("notifications/") or method == "initialized":
        return None

    if method == "initialize":
        proto = negotiate_protocol(params.get("protocolVersion"))
        _session["protocolVersion"] = proto
        return _ok(
            req_id,
            {
                "protocolVersion": proto,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": SERVER_NAME, "title": "Trendy", "version": SERVER_VERSION},
                "instructions": (
                    "Trendy: local, read-only slang / meme / trend decoder. Use decode_term for one "
                    "term or phrase, search_slang to browse, get_trends for what is hot, "
                    "radar_status for data freshness. No write tools; results never include API keys."
                ),
            },
        )
    if method == "ping":
        return None if is_notification else _ok(req_id, {})
    if method == "tools/list":
        return _ok(req_id, {"tools": tool_definitions()})
    if method == "tools/call":
        name = params.get("name")
        arguments = params.get("arguments")
        if not isinstance(name, str) or not name:
            return _error(req_id, INVALID_PARAMS, "tools/call requires a tool name")
        if arguments is not None and not isinstance(arguments, dict):
            return _error(req_id, INVALID_PARAMS, "tools/call arguments must be an object")
        try:
            result = call_tool(name, arguments or {})
        except KeyError:
            return _error(req_id, INVALID_PARAMS, f"Unknown tool: {name}")
        return _ok(req_id, result)
    if is_notification:
        return None
    return _error(req_id, METHOD_NOT_FOUND, f"Method not found: {method}")


def _write(obj: dict[str, Any]) -> None:
    """Write one message as UTF-8 bytes, independent of the console code page."""
    data = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
    out = getattr(sys.stdout, "buffer", None)
    if out is not None:
        out.write(data)
        out.flush()
    else:  # e.g. a StringIO in tests
        sys.stdout.write(data.decode("utf-8"))
        sys.stdout.flush()


class _ParseError(Exception):
    pass


def _decode(body: bytes) -> Any:
    try:
        return json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise _ParseError(str(exc)) from exc


def _read_message(stdin) -> Any | None:
    """Read one NDJSON message, or one LSP-style Content-Length frame."""
    while True:
        line = stdin.readline()
        if not line:
            return None
        if not line.strip():
            continue
        if line.lower().startswith(b"content-length:"):
            try:
                length = int(line.split(b":", 1)[1].strip())
            except ValueError as exc:
                raise _ParseError("bad Content-Length") from exc
            while True:
                header = stdin.readline()
                if not header or header in (b"\n", b"\r\n"):
                    break
            body = stdin.read(length)
            if not body:
                return None
            return _decode(body)
        return _decode(line)


def serve_stdio() -> int:
    """Serve MCP on stdin/stdout until stdin closes. Logs go to stderr only."""
    stdin = sys.stdin.buffer
    while True:
        try:
            message = _read_message(stdin)
        except _ParseError:
            _write(_error(None, PARSE_ERROR, "Parse error"))
            continue
        except Exception as exc:  # noqa: BLE001
            print(f"trendy mcp read error: {type(exc).__name__}", file=sys.stderr)
            return 1
        if message is None:
            return 0
        if isinstance(message, list):
            # JSON-RPC batches are not part of current MCP stdio.
            _write(_error(None, INVALID_REQUEST, "Batch requests are not supported"))
            continue
        try:
            response = dispatch(message)
        except Exception as exc:  # noqa: BLE001
            req_id = message.get("id") if isinstance(message, dict) else None
            response = _error(req_id, INTERNAL_ERROR, scrub(f"Internal error: {type(exc).__name__}"))
        if response is not None:
            _write(response)


def main() -> int:
    return serve_stdio()


if __name__ == "__main__":
    raise SystemExit(main())
