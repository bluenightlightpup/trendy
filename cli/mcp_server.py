#!/usr/bin/env python3
"""Local stdio MCP server for Trendy (T0021).

Read-only tools over the same lexicon / trends / radar files as the CLI.
No network, no live-model calls, no write tools, no secrets in results.

Run from the repo root (cwd must be the repo root):

  python cli/trendy.py mcp
  python -m cli.mcp_server

Cursor / Claude Desktop: stdio, command above, cwd = repo root.
See docs/cli-mcp-integration.md.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

PROTOCOL_DEFAULT = "2024-11-05"
SERVER_NAME = "trendy"
SERVER_VERSION = "0.1.0"

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


def _ensure_root() -> Path:
    root = Path(__file__).resolve().parents[1]
    root_s = str(root)
    if root_s not in sys.path:
        sys.path.insert(0, root_s)
    return root


def _trendy():
    _ensure_root()
    import cli.trendy as trendy

    return trendy


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
    age = trendy.format_age(entry) or None
    return {
        "terms": trendy._entry_terms(entry),
        "meaning": str(entry.get("short") or "").strip(),
        "explain": str(entry.get("explain") or "").strip(),
        "origin": str(entry.get("origin") or "").strip(),
        "age": age,
        "lexicon": lexicon,
    }


def decode_term(term: str) -> dict[str, Any]:
    """Lexicon decode only. Does not call the live model or read API keys."""
    trendy = _trendy()
    text = str(term or "").strip()
    if not text:
        raise ValueError("term is required")
    entry, source = trendy.lookup_lexicon(text)
    if entry is None:
        return {
            "term": text,
            "found": False,
            "meaning": None,
            "explain": None,
            "origin": None,
            "age": None,
            "lexicon": None,
            "note": "No lexicon hit. Live model decode is not available on this MCP server.",
        }
    payload = _public_entry(entry, source)
    payload["term"] = text
    payload["found"] = True
    return payload


def search_slang(query: str, limit: int = 20) -> dict[str, Any]:
    trendy = _trendy()
    needle = trendy._norm(query)
    if not needle:
        raise ValueError("query is required")
    cap = _clamp_limit(limit, default=20)
    sources = (
        (trendy.SLANG_PATH, "slang"),
        (trendy.COMMUNITY_PATH, "community"),
        (trendy.ABBREVE_PATH, "abbreve"),
    )
    ranked: list[tuple[int, dict[str, Any]]] = []
    needle_toks = needle.split()
    for path, lexicon in sources:
        data = trendy._load_json(path, {"entries": []})
        for entry in data.get("entries") or []:
            if not isinstance(entry, dict):
                continue
            terms = trendy._entry_terms(entry)
            term_blob = trendy._norm(" ".join(terms))
            text_blob = trendy._norm(
                " ".join(
                    terms
                    + [
                        str(entry.get("short") or ""),
                        str(entry.get("explain") or ""),
                        str(entry.get("origin") or ""),
                    ]
                )
            )
            score = 0
            if needle == term_blob or needle in {trendy._norm(t) for t in terms}:
                score = 100
            elif needle in term_blob:
                score = 80
            elif needle in text_blob:
                score = 50
            elif needle_toks and all(tok in text_blob.split() for tok in needle_toks):
                score = 40
            if score:
                ranked.append((score, _public_entry(entry, lexicon)))
    ranked.sort(key=lambda item: item[0], reverse=True)
    hits = [item[1] for item in ranked[:cap]]
    return {"query": str(query), "count": len(hits), "hits": hits}


def get_trends(
    min_heat: float = 0.0,
    limit: int = 20,
    world: str | None = None,
) -> dict[str, Any]:
    trendy = _trendy()
    trends = trendy._load_json(trendy.TRENDS_PATH, [])
    if not isinstance(trends, list):
        raise ValueError("trends.json is not a list")
    try:
        floor = float(min_heat)
    except (TypeError, ValueError) as exc:
        raise ValueError("min_heat must be a number") from exc
    cap = _clamp_limit(limit, default=20)
    world_s = str(world).strip() if world else ""
    rows: list[dict[str, Any]] = []
    for trend in trends:
        if not isinstance(trend, dict):
            continue
        heat = float(trend.get("heatScore") or 0)
        if heat < floor:
            continue
        trend_world = str(trend.get("world") or "")
        if world_s and trend_world.lower() != world_s.lower():
            continue
        age_line = trendy.format_age(trend) or None
        rows.append(
            {
                "id": trend.get("id"),
                "title": trend.get("title"),
                "summary": trend.get("summary"),
                "origin": trend.get("originStory") or trend.get("origin"),
                "world": trend_world or None,
                "heat": heat,
                "lifecycle": trend.get("lifecycle"),
                "age": age_line,
            }
        )
    rows.sort(key=lambda row: float(row.get("heat") or 0), reverse=True)
    rows = rows[:cap]
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
            "message": "No last-run summary yet. Run: python cli/trendy.py radar run",
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
    if value < 1:
        return 1
    if value > 50:
        return 50
    return value


def tool_definitions() -> list[dict[str, Any]]:
    return [
        {
            "name": "decode_term",
            "description": (
                "Look up one slang term in the local Trendy lexicon. "
                "Returns meaning, explain, origin, and age band when present. "
                "Read-only; does not call a live model."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "term": {
                        "type": "string",
                        "description": "Slang term or phrase to decode",
                    }
                },
                "required": ["term"],
                "additionalProperties": False,
            },
        },
        {
            "name": "search_slang",
            "description": (
                "Search the local slang, community, and abbreve lexicons. "
                "Read-only. Returns meaning, explain, origin, and age when present."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Term or phrase to search for",
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
        },
        {
            "name": "get_trends",
            "description": (
                "List hot trends from the local catalog (web/data/trends.json). "
                "Read-only. Filter by minimum heat and optional world."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "min_heat": {
                        "type": "number",
                        "description": "Minimum heatScore from 0 to 1 (default 0)",
                    },
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 50,
                        "description": "Max rows (default 20)",
                    },
                    "world": {
                        "type": "string",
                        "description": "Optional world filter, for example TikTok",
                    },
                },
                "additionalProperties": False,
            },
        },
        {
            "name": "radar_status",
            "description": (
                "Show the last local Trend Radar ingest summary "
                "(radar/out/last-run.json). Read-only. No secrets."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
        },
    ]


def _tool_result(payload: Any, is_error: bool = False) -> dict[str, Any]:
    text = payload if isinstance(payload, str) else json.dumps(scrub(payload), ensure_ascii=False)
    return {
        "content": [{"type": "text", "text": text}],
        "isError": is_error,
    }


def call_tool(name: str, arguments: dict[str, Any] | None) -> dict[str, Any]:
    args = arguments if isinstance(arguments, dict) else {}
    try:
        if name == "decode_term":
            result = decode_term(str(args.get("term") or ""))
        elif name == "search_slang":
            result = search_slang(
                str(args.get("query") or ""),
                limit=args.get("limit", 20),
            )
        elif name == "get_trends":
            result = get_trends(
                min_heat=args.get("min_heat", 0),
                limit=args.get("limit", 20),
                world=args.get("world"),
            )
        elif name == "radar_status":
            result = radar_status()
        else:
            return _tool_result(f"Unknown tool: {name}", is_error=True)
    except ValueError as exc:
        return _tool_result(str(exc), is_error=True)
    except Exception as exc:  # noqa: BLE001 — surface a scrubbed message, keep serving
        return _tool_result(scrub(f"{type(exc).__name__}: {exc}"), is_error=True)
    return _tool_result(result, is_error=False)


def _error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": code, "message": message},
    }


def dispatch(message: Any) -> dict[str, Any] | None:
    """Handle one JSON-RPC message. Notifications return None (no response)."""
    if not isinstance(message, dict):
        return _error(None, -32600, "Invalid Request")
    method = message.get("method")
    req_id = message.get("id", None)
    is_notification = "id" not in message
    params = message.get("params") if isinstance(message.get("params"), dict) else {}

    if method in ("notifications/initialized", "initialized"):
        return None
    if method == "notifications/cancelled":
        return None

    if method == "initialize":
        proto = str(params.get("protocolVersion") or PROTOCOL_DEFAULT)
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": proto,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
                "instructions": (
                    "Trendy local read-only MCP. Tools: decode_term, search_slang, "
                    "get_trends, radar_status. No write tools. No hosted endpoint. "
                    "Results never include API keys."
                ),
            },
        }
    if method == "ping":
        if is_notification:
            return None
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}
    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": tool_definitions()},
        }
    if method == "tools/call":
        name = params.get("name")
        arguments = params.get("arguments")
        if not isinstance(name, str) or not name:
            return _error(req_id, -32602, "tools/call requires a tool name")
        if arguments is not None and not isinstance(arguments, dict):
            return _error(req_id, -32602, "tools/call arguments must be an object")
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": call_tool(name, arguments if isinstance(arguments, dict) else {}),
        }
    if is_notification:
        return None
    return _error(req_id, -32601, f"Method not found: {method}")


def _write(obj: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n")
    sys.stdout.flush()


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
            except ValueError:
                return {"jsonrpc": "2.0", "id": None, "method": ""}
            while True:
                header = stdin.readline()
                if not header or header in (b"\n", b"\r\n"):
                    break
            body = stdin.read(length)
            if not body:
                return None
            return json.loads(body.decode("utf-8"))
        return json.loads(line.decode("utf-8"))


def serve_stdio() -> int:
    """Serve MCP on stdin/stdout until stdin closes. Logs go to stderr only."""
    stdin = sys.stdin.buffer
    while True:
        try:
            message = _read_message(stdin)
        except json.JSONDecodeError:
            _write(_error(None, -32700, "Parse error"))
            continue
        except Exception as exc:  # noqa: BLE001
            print(f"trendy mcp read error: {type(exc).__name__}", file=sys.stderr)
            return 1
        if message is None:
            return 0
        try:
            response = dispatch(message)
        except Exception as exc:  # noqa: BLE001
            req_id = message.get("id") if isinstance(message, dict) else None
            response = _error(req_id, -32603, scrub(f"{type(exc).__name__}"))
        if response is not None:
            _write(response)


def main() -> int:
    _ensure_root()
    return serve_stdio()


if __name__ == "__main__":
    raise SystemExit(main())
