"""Live model-on-miss decode client + local Decode proxy (stdlib only).

API keys stay on the PC (env vars). The PWA never sees them — it POSTs to
this proxy. Secure defaults:

* binds to 127.0.0.1 unless you pass --host;
* binding to a non-loopback address (LAN) requires a shared token
  (``TRENDY_PROXY_TOKEN`` or ``--token``); clients send
  ``Authorization: Bearer <token>``;
* CORS only answers localhost / private-LAN origins (plus ``--allow-origin``),
  so a random website cannot drive the proxy from your browser.

Also hosts community suggest → consensus → lexicon:
  POST /v1/suggest, GET /v1/suggestions/stats?term=
"""

from __future__ import annotations

import hmac
import ipaddress
import json
import os
import re
import sys
import urllib.error
import urllib.request
from urllib.parse import parse_qs, urlparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

SYSTEM_PROMPT = """You are Trendy Decode: a judgment-free slang, meme, and internet-culture decoder.
Return concise JSON only (no markdown fences) with keys:
  meaning — short plain meaning (1–2 sentences)
  explain — how people use it casually / in chat or TikTok
  origin — where it likely came from (platform, meme, community); say if unsure
  confidence — one of: high, medium, low

Rules:
- No lectures, no moralizing, no "as an AI".
- Prefer TikTok / internet culture readings when a term has dual meanings (e.g. alpha).
- If unsure, say so in origin/confidence — never invent a fake definitive etymology.
- Keep tone warm and practical for someone catching up on culture.
"""


def _env_key(*names: str) -> str | None:
    for name in names:
        val = (os.environ.get(name) or "").strip()
        if val:
            return val
    return None


def resolve_provider() -> tuple[str, str] | None:
    """Return (provider, api_key) or None if no key configured."""
    openai = _env_key("TRENDY_OPENAI_API_KEY", "OPENAI_API_KEY")
    if openai:
        return ("openai", openai)
    anthropic = _env_key("TRENDY_ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY")
    if anthropic:
        return ("anthropic", anthropic)
    return None


def _http_json(
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    timeout: float = 25.0,
) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8")
    return json.loads(body)


def _extract_json_object(text: str) -> dict[str, Any] | None:
    text = (text or "").strip()
    if not text:
        return None
    # Strip optional ```json fences
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text, re.I)
    if fence:
        text = fence.group(1).strip()
    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return obj
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return None
    try:
        obj = json.loads(m.group(0))
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        return None


def _normalize_result(raw: dict[str, Any], provider: str) -> dict[str, Any]:
    meaning = str(raw.get("meaning") or raw.get("short") or "").strip()
    explain = str(raw.get("explain") or raw.get("explanation") or "").strip()
    origin = str(raw.get("origin") or "").strip()
    confidence = str(raw.get("confidence") or "medium").strip().lower()
    if confidence not in ("high", "medium", "low"):
        confidence = "medium"
    if not meaning:
        meaning = explain or "Model returned an empty meaning."
    return {
        "meaning": meaning,
        "explain": explain or meaning,
        "origin": origin or "Unclear — model was unsure.",
        "confidence": confidence,
        "provider": provider,
    }


def call_openai(term: str, new_here: bool, api_key: str) -> dict[str, Any]:
    base = (os.environ.get("TRENDY_OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    model = os.environ.get("TRENDY_OPENAI_MODEL") or "gpt-4o-mini"
    user = f'Term/phrase to decode: "{term}"\nNew-here mode: {"yes" if new_here else "no"}'
    payload = {
        "model": model,
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    data = _http_json(f"{base}/chat/completions", payload, headers)
    content = ""
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        content = ""
    parsed = _extract_json_object(content) or {"meaning": content[:500], "explain": "", "origin": "", "confidence": "low"}
    return _normalize_result(parsed, "openai")


def call_anthropic(term: str, new_here: bool, api_key: str) -> dict[str, Any]:
    model = os.environ.get("TRENDY_ANTHROPIC_MODEL") or "claude-3-5-haiku-latest"
    user = f'Term/phrase to decode: "{term}"\nNew-here mode: {"yes" if new_here else "no"}\nRespond with JSON only.'
    payload = {
        "model": model,
        "max_tokens": 600,
        "temperature": 0.4,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user}],
    }
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    data = _http_json("https://api.anthropic.com/v1/messages", payload, headers)
    content = ""
    try:
        blocks = data.get("content") or []
        for b in blocks:
            if isinstance(b, dict) and b.get("type") == "text":
                content += str(b.get("text") or "")
    except (TypeError, AttributeError):
        content = ""
    parsed = _extract_json_object(content) or {"meaning": content[:500], "explain": "", "origin": "", "confidence": "low"}
    return _normalize_result(parsed, "anthropic")


def live_decode(term: str, new_here: bool = True) -> dict[str, Any]:
    """Call the configured provider. Raises RuntimeError on missing key / API failure."""
    resolved = resolve_provider()
    if not resolved:
        raise RuntimeError(
            "No API key set. Export OPENAI_API_KEY or ANTHROPIC_API_KEY "
            "(or TRENDY_OPENAI_API_KEY / TRENDY_ANTHROPIC_API_KEY)."
        )
    provider, key = resolved
    term = str(term or "").strip()
    if not term:
        raise ValueError("term is required")
    # Log only the term length + provider — never the key or full prompt
    print(f"[live-decode] provider={provider} term_len={len(term)}", file=sys.stderr, flush=True)
    if provider == "openai":
        return call_openai(term, new_here, key)
    return call_anthropic(term, new_here, key)


MAX_TERM_LEN = 120
LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


def _is_loopback_host(host: str) -> bool:
    h = (host or "").strip().strip("[]").lower()
    if h in LOOPBACK_HOSTS:
        return True
    try:
        return ipaddress.ip_address(h).is_loopback
    except ValueError:
        return False


def origin_allowed(origin: str, extra: tuple[str, ...] = ()) -> bool:
    """Allow localhost, private-LAN IPs, *.local, and explicitly listed origins."""
    if not origin:
        return False
    origin = origin.rstrip("/")
    if origin in {o.rstrip("/") for o in extra}:
        return True
    parsed = urlparse(origin)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    host = parsed.hostname.lower()
    if host in LOOPBACK_HOSTS or host.endswith(".local"):
        return True
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    return ip.is_private or ip.is_loopback


class DecodeProxyHandler(BaseHTTPRequestHandler):
    server_version = "TrendyDecodeProxy/1.1"
    # Set by make_server(); class-level defaults keep the handler testable.
    token: str = ""
    allow_origins: tuple[str, ...] = ()

    def log_message(self, fmt: str, *args: Any) -> None:
        # Avoid logging bodies / secrets; path + code only
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _cors(self) -> None:
        origin = self.headers.get("Origin") or ""
        if origin_allowed(origin, self.allow_origins):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Access-Control-Max-Age", "600")

    def _send_json(self, code: int, obj: dict[str, Any]) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        """Token check (constant time). No token configured → loopback-only server."""
        if not self.token:
            return True
        auth = self.headers.get("Authorization") or ""
        supplied = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        supplied = supplied or (self.headers.get("X-Trendy-Token") or "").strip()
        return bool(supplied) and hmac.compare_digest(supplied.encode(), self.token.encode())

    def _origin_ok(self) -> bool:
        origin = self.headers.get("Origin")
        return origin is None or origin_allowed(origin, self.allow_origins)

    def _guard(self) -> bool:
        """Reject disallowed browser origins and missing/bad tokens. True = proceed."""
        if not self._origin_ok():
            self._send_json(403, {"error": "origin_not_allowed"})
            return False
        if not self._authorized():
            self._send_json(401, {"error": "unauthorized", "message": "Missing or wrong proxy token."})
            return False
        return True

    def do_OPTIONS(self) -> None:  # noqa: N802
        if not self._origin_ok():
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _read_json_body(self, max_len: int = 16_000) -> tuple[dict[str, Any] | None, str | None]:
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return None, "invalid_json"
        if length > max_len:
            return None, "payload_too_large"
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None, "invalid_json"
        if not isinstance(payload, dict):
            return None, "invalid_json"
        return payload, None

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        if path in ("/health", "/v1/health"):
            self._send_json(
                200,
                {"ok": True, "service": "trendy-decode-proxy", "auth": "token" if self.token else "none"},
            )
            return
        if not self._guard():
            return
        if path == "/v1/suggestions/stats":
            from .community_lexicon import suggest_stats

            qs = parse_qs(parsed.query or "")
            term = (qs.get("term") or [""])[0]
            self._send_json(200, suggest_stats(term))
            return
        self._send_json(404, {"error": "not_found", "path": path})

    def do_POST(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path not in ("/v1/suggest", "/v1/decode"):
            self._send_json(404, {"error": "not_found", "path": path})
            return
        if not self._guard():
            return
        payload, err = self._read_json_body()
        if err == "payload_too_large":
            self._send_json(413, {"error": "payload_too_large"})
            return
        if err or payload is None:
            self._send_json(400, {"error": err or "invalid_json"})
            return
        if path == "/v1/suggest":
            from .community_lexicon import handle_suggest

            code, body = handle_suggest(payload)
            self._send_json(code, body)
            return
        term = str(payload.get("term") or "").strip()
        new_here = bool(payload.get("newHere", True))
        if not term:
            self._send_json(400, {"error": "term_required"})
            return
        if len(term) > MAX_TERM_LEN:
            self._send_json(400, {"error": "term_too_long", "max": MAX_TERM_LEN})
            return
        if not resolve_provider():
            self._send_json(
                503,
                {
                    "error": "no_api_key",
                    "message": (
                        "Set OPENAI_API_KEY or ANTHROPIC_API_KEY "
                        "(or TRENDY_OPENAI_API_KEY / TRENDY_ANTHROPIC_API_KEY) "
                        "in the environment before starting the proxy."
                    ),
                },
            )
            return
        try:
            result = live_decode(term, new_here=new_here)
            self._send_json(200, result)
        except urllib.error.HTTPError as e:
            self._send_json(502, {"error": "upstream_http", "status": e.code})
        except Exception as e:  # noqa: BLE001 — surface clear JSON to client
            self._send_json(502, {"error": "upstream_failed", "message": type(e).__name__})


def make_server(
    host: str = "127.0.0.1",
    port: int = 8787,
    token: str | None = None,
    allow_origins: list[str] | tuple[str, ...] | None = None,
) -> ThreadingHTTPServer:
    """Build the proxy server. Raises ValueError for an unsafe config (LAN without token)."""
    tok = (token if token is not None else os.environ.get("TRENDY_PROXY_TOKEN") or "").strip()
    if not _is_loopback_host(host) and not tok:
        raise ValueError(
            f"Refusing to listen on {host} without a token. Set TRENDY_PROXY_TOKEN "
            "(or pass --token) and enter the same token in the PWA (You → Live Decode)."
        )
    extra = tuple(allow_origins or ()) + tuple(
        o.strip() for o in (os.environ.get("TRENDY_PROXY_ORIGINS") or "").split(",") if o.strip()
    )
    handler = type(
        "ConfiguredDecodeProxyHandler",
        (DecodeProxyHandler,),
        {"token": tok, "allow_origins": extra},
    )
    return ThreadingHTTPServer((host, port), handler)


def run_serve(
    host: str = "127.0.0.1",
    port: int = 8787,
    token: str | None = None,
    allow_origins: list[str] | None = None,
) -> int:
    try:
        httpd = make_server(host, port, token, allow_origins)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    resolved = resolve_provider()
    provider = resolved[0] if resolved else "none (503 until key set)"
    auth = "token required" if httpd.RequestHandlerClass.token else "none (loopback only)"
    lan_tip = (
        f"  LAN: set the PWA Live Decode URL to http://<this-computer-lan-ip>:{port} and paste the token\n"
        if not _is_loopback_host(host)
        else "  LAN access: restart with --host 0.0.0.0 and TRENDY_PROXY_TOKEN set\n"
    )
    print(
        f"Trendy Decode proxy on http://{host}:{port}\n"
        f"  GET  /health\n"
        f"  POST /v1/decode     {{\"term\":\"...\",\"newHere\":true}}\n"
        f"  POST /v1/suggest    {{\"term\",\"meaning\",\"origin?\",\"clientId\"}}\n"
        f"  GET  /v1/suggestions/stats?term=...\n"
        f"  provider: {provider}\n"
        f"  auth: {auth}\n"
        f"{lan_tip}"
        f"  Personal use only — do not expose this port to the internet.",
        flush=True,
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nshutting down", flush=True)
    finally:
        httpd.server_close()
    return 0
