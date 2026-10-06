"""Tests for the Decode proxy security defaults (bind, token, CORS)."""

from __future__ import annotations

import json
import threading
import unittest
import urllib.error
import urllib.request
from unittest import mock

from cli import live_decode as ld


class ProxySecurityTest(unittest.TestCase):
    def test_lan_bind_requires_token(self) -> None:
        with mock.patch.dict("os.environ", {"TRENDY_PROXY_TOKEN": ""}):
            with self.assertRaises(ValueError):
                ld.make_server("0.0.0.0", 0, token=None)

    def test_origin_allowlist(self) -> None:
        self.assertTrue(ld.origin_allowed("http://localhost:4173"))
        self.assertTrue(ld.origin_allowed("http://127.0.0.1:4173"))
        self.assertTrue(ld.origin_allowed("http://192.168.1.20:4173"))
        self.assertTrue(ld.origin_allowed("http://10.0.0.5:4173"))
        self.assertTrue(ld.origin_allowed("http://my-pc.local:4173"))
        self.assertFalse(ld.origin_allowed("https://evil.example"))
        self.assertFalse(ld.origin_allowed("http://8.8.8.8"))
        self.assertFalse(ld.origin_allowed("null"))
        self.assertTrue(ld.origin_allowed("https://trendy.example", ("https://trendy.example",)))


class ProxyHttpTest(unittest.TestCase):
    TOKEN = "test-token-123"

    @classmethod
    def setUpClass(cls) -> None:
        cls.httpd = ld.make_server("127.0.0.1", 0, token=cls.TOKEN)
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def _req(self, method: str, path: str, body=None, headers=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}", data=data, method=method, headers=headers or {}
        )
        if data is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as err:
            return err.code, dict(err.headers), err.read()

    def test_health_is_open(self) -> None:
        status, _, body = self._req("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["auth"], "token")

    def test_decode_requires_token(self) -> None:
        status, _, _ = self._req("POST", "/v1/decode", {"term": "rizz"})
        self.assertEqual(status, 401)
        status, _, _ = self._req(
            "POST", "/v1/decode", {"term": "rizz"}, {"Authorization": "Bearer wrong"}
        )
        self.assertEqual(status, 401)

    def test_decode_with_token_reaches_handler(self) -> None:
        with mock.patch.object(ld, "resolve_provider", return_value=None):
            status, _, body = self._req(
                "POST", "/v1/decode", {"term": "rizz"}, {"Authorization": f"Bearer {self.TOKEN}"}
            )
        self.assertEqual(status, 503)  # authorized; no API key configured
        self.assertEqual(json.loads(body)["error"], "no_api_key")

    def test_term_length_cap(self) -> None:
        status, _, _ = self._req(
            "POST", "/v1/decode", {"term": "x" * 500}, {"Authorization": f"Bearer {self.TOKEN}"}
        )
        self.assertEqual(status, 400)

    def test_cors_reflects_only_allowed_origins(self) -> None:
        status, headers, _ = self._req("OPTIONS", "/v1/decode", headers={"Origin": "http://192.168.1.9:4173"})
        self.assertEqual(status, 204)
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), "http://192.168.1.9:4173")
        self.assertIn("Authorization", headers.get("Access-Control-Allow-Headers", ""))
        status, headers, _ = self._req("OPTIONS", "/v1/decode", headers={"Origin": "https://evil.example"})
        self.assertEqual(status, 403)
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_foreign_origin_blocked_even_with_token(self) -> None:
        status, _, _ = self._req(
            "POST",
            "/v1/suggest",
            {"term": "zib", "meaning": "a long enough meaning here"},
            {"Authorization": f"Bearer {self.TOKEN}", "Origin": "https://evil.example"},
        )
        self.assertEqual(status, 403)


if __name__ == "__main__":
    unittest.main()
