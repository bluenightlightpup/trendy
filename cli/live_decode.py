"""Live model-on-miss decode client + local Decode proxy (stdlib only).

API keys stay on the PC (env vars). The PWA never sees them — it POSTs to
this LAN proxy. Trusted LAN / personal use only; do not expose to the public
internet without auth.

Also hosts community suggest → consensus → lexicon:
  POST /v1/suggest, GET /v1/suggestions/stats?term=
"""

from __future__ import annotations

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


class DecodeProxyHandler(BaseHTTPRequestHandler):
    server_version = "TrendyDecodeProxy/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        # Avoid logging bodies / secrets; path + code only
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")

    def _send_json(self, code: int, obj: dict[str, Any]) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _read_json_body(self, max_len: int = 64_000) -> tuple[dict[str, Any] | None, str | None]:
        length = int(self.headers.get("Content-Length") or 0)
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
            self._send_json(200, {"ok": True, "service": "trendy-decode-proxy"})
            return
        if path == "/v1/suggestions/stats":
            from cli.community_lexicon import suggest_stats

            qs = parse_qs(parsed.query or "")
            term = (qs.get("term") or [""])[0]
            self._send_json(200, suggest_stats(term))
            return
        self._send_json(404, {"error": "not_found", "path": path})

    def do_POST(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path == "/v1/suggest":
            payload, err = self._read_json_body()
            if err == "payload_too_large":
                self._send_json(413, {"error": "payload_too_large"})
                return
            if err or payload is None:
                self._send_json(400, {"error": err or "invalid_json"})
                return
            from cli.community_lexicon import handle_suggest

            code, body = handle_suggest(payload)
            self._send_json(code, body)
            return
        if path != "/v1/decode":
            self._send_json(404, {"error": "not_found", "path": path})
            return
        payload, err = self._read_json_body()
        if err == "payload_too_large":
            self._send_json(413, {"error": "payload_too_large"})
            return
        if err or payload is None:
            self._send_json(400, {"error": err or "invalid_json"})
            return
        term = str(payload.get("term") or "").strip()
        new_here = bool(payload.get("newHere", True))
        if not term:
            self._send_json(400, {"error": "term_required"})
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
            detail = e.reason or str(e)
            self._send_json(
                502,
                {"error": "upstream_http", "status": e.code, "message": str(detail)},
            )
        except Exception as e:  # noqa: BLE001 — surface clear JSON to client
            self._send_json(502, {"error": "upstream_failed", "message": str(e)})


def run_serve(host: str = "0.0.0.0", port: int = 8787) -> int:
    resolved = resolve_provider()
    provider = resolved[0] if resolved else "none (503 until key set)"
    httpd = ThreadingHTTPServer((host, port), DecodeProxyHandler)
    print(
        f"Trendy Decode proxy on http://{host}:{port}\n"
        f"  GET  /health\n"
        f"  POST /v1/decode     {{\"term\":\"...\",\"newHere\":true}}\n"
        f"  POST /v1/suggest    {{\"term\",\"meaning\",\"origin?\",\"clientId\"}}\n"
        f"  GET  /v1/suggestions/stats?term=...\n"
        f"  provider: {provider}\n"
        f"  LAN tip: set PWA Live Decode URL to http://<pc-lan-ip>:{port}\n"
        f"  Security: trusted LAN / personal use only — do not expose publicly without auth.",
        flush=True,
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nshutting down", flush=True)
    finally:
        httpd.server_close()
    return 0
