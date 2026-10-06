"""Unit tests for the local stdio MCP server (MCP spec behaviour)."""

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

from cli import mcp_server

ROOT = Path(__file__).resolve().parents[1]


class McpToolsTest(unittest.TestCase):
    def test_tools_list_and_decode_bro(self) -> None:
        listed = mcp_server.dispatch({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
        self.assertIsNotNone(listed)
        assert listed is not None
        names = [tool["name"] for tool in listed["result"]["tools"]]
        self.assertEqual(names, ["decode_term", "search_slang", "get_trends", "radar_status"])

        called = mcp_server.dispatch(
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": "decode_term", "arguments": {"term": "bro"}},
            }
        )
        self.assertIsNotNone(called)
        assert called is not None
        self.assertNotIn("error", called)
        result = called["result"]
        self.assertFalse(result.get("isError"))
        text = result["content"][0]["text"]
        payload = json.loads(text)
        self.assertTrue(payload.get("meaning") or payload.get("age"))
        blob = json.dumps(payload).lower()
        self.assertNotIn("api_key", blob)
        self.assertNotIn("sk-", blob)

    def test_stdio_command_roundtrip(self) -> None:
        messages = [
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "test", "version": "0"},
                },
            },
            {"jsonrpc": "2.0", "method": "notifications/initialized"},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
            {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {"name": "decode_term", "arguments": {"term": "bro"}},
            },
        ]
        raw = "".join(json.dumps(m) + "\n" for m in messages)
        proc = subprocess.run(
            [sys.executable, "cli/trendy.py", "mcp"],
            input=raw,
            capture_output=True,
            text=True,
            cwd=str(ROOT),
            timeout=20,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        lines = [ln for ln in proc.stdout.splitlines() if ln.strip()]
        self.assertEqual(len(lines), 3, proc.stdout + proc.stderr)
        bodies = [json.loads(ln) for ln in lines]
        self.assertEqual(bodies[0]["id"], 1)
        self.assertEqual(bodies[0]["result"]["serverInfo"]["name"], "trendy")
        tool_names = [t["name"] for t in bodies[1]["result"]["tools"]]
        self.assertEqual(
            tool_names,
            ["decode_term", "search_slang", "get_trends", "radar_status"],
        )
        decoded = json.loads(bodies[2]["result"]["content"][0]["text"])
        self.assertTrue(decoded.get("age") or decoded.get("meaning"))


    # ---- spec behaviour -------------------------------------------------

    def _call(self, name, arguments, req_id=9):
        return mcp_server.dispatch(
            {
                "jsonrpc": "2.0",
                "id": req_id,
                "method": "tools/call",
                "params": {"name": name, "arguments": arguments},
            }
        )

    def test_protocol_version_negotiation(self) -> None:
        for requested, expected in (
            ("2024-11-05", "2024-11-05"),
            ("2025-06-18", "2025-06-18"),
            ("2025-11-25", "2025-11-25"),
            ("1999-01-01", mcp_server.LATEST_PROTOCOL_VERSION),
            (None, mcp_server.LATEST_PROTOCOL_VERSION),
        ):
            resp = mcp_server.dispatch(
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {"protocolVersion": requested, "capabilities": {}},
                }
            )
            self.assertEqual(resp["result"]["protocolVersion"], expected, requested)
            self.assertEqual(resp["result"]["capabilities"], {"tools": {"listChanged": False}})
            self.assertEqual(resp["result"]["serverInfo"]["version"], "0.1.0")

    def test_unknown_tool_is_jsonrpc_invalid_params(self) -> None:
        resp = self._call("does_not_exist", {})
        self.assertNotIn("result", resp)
        self.assertEqual(resp["error"]["code"], -32602)
        self.assertIn("Unknown tool", resp["error"]["message"])

    def test_bad_arguments_are_tool_errors(self) -> None:
        cases = [
            ("decode_term", {}),
            ("decode_term", {"term": 123}),
            ("decode_term", {"term": "rizz", "bogus": 1}),
            ("search_slang", {"query": "x"}),
            ("search_slang", {"query": "rizz", "limit": "lots"}),
            ("search_slang", {"query": "rizz", "limit": 500}),
            ("get_trends", {"min_heat": "hot"}),
            ("get_trends", {"limit": True}),
            ("radar_status", {"extra": 1}),
        ]
        for name, args in cases:
            resp = self._call(name, args)
            self.assertIn("result", resp, (name, args))
            self.assertTrue(resp["result"]["isError"], (name, args))
            self.assertIn("Invalid arguments", resp["result"]["content"][0]["text"])

    def test_non_object_arguments_is_protocol_error(self) -> None:
        resp = self._call("decode_term", "rizz")
        self.assertEqual(resp["error"]["code"], -32602)

    def test_tools_are_annotated_read_only(self) -> None:
        tools = mcp_server.tool_definitions()
        for tool in tools:
            ann = tool["annotations"]
            self.assertTrue(ann["readOnlyHint"], tool["name"])
            self.assertFalse(ann["destructiveHint"], tool["name"])
            self.assertFalse(tool["inputSchema"]["additionalProperties"])

    def test_search_slang_whole_words(self) -> None:
        resp = self._call("search_slang", {"query": "rizz", "limit": 5})
        payload = json.loads(resp["result"]["content"][0]["text"])
        self.assertGreater(payload["count"], 0)
        self.assertIn("rizz", payload["hits"][0]["terms"])

    def test_structured_content_for_new_protocols(self) -> None:
        mcp_server.dispatch(
            {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}
        )
        resp = self._call("decode_term", {"term": "67"})
        self.assertEqual(resp["result"]["structuredContent"]["found"], True)
        mcp_server.dispatch(
            {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05"}}
        )
        resp = self._call("decode_term", {"term": "67"})
        self.assertNotIn("structuredContent", resp["result"])

    def test_unknown_method_and_notifications(self) -> None:
        resp = mcp_server.dispatch({"jsonrpc": "2.0", "id": 5, "method": "resources/list"})
        self.assertEqual(resp["error"]["code"], -32601)
        self.assertIsNone(mcp_server.dispatch({"jsonrpc": "2.0", "method": "notifications/initialized"}))
        self.assertIsNone(mcp_server.dispatch({"jsonrpc": "2.0", "method": "notifications/cancelled"}))

    def _run_stdio(self, raw: bytes, cwd: str, env=None) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(ROOT / "cli" / "trendy.py"), "mcp"],
            input=raw,
            capture_output=True,
            cwd=cwd,
            env=env,
            timeout=30,
            check=False,
        )

    def test_stdio_from_other_cwd_and_parse_error(self) -> None:
        import tempfile

        raw = (
            b"{not json\n"
            + json.dumps({"jsonrpc": "2.0", "id": 2, "method": "ping"}).encode()
            + b"\n"
        )
        with tempfile.TemporaryDirectory() as cwd:
            proc = self._run_stdio(raw, cwd)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        lines = [json.loads(x) for x in proc.stdout.decode("utf-8").splitlines() if x.strip()]
        self.assertEqual(lines[0]["error"]["code"], -32700)
        self.assertEqual(lines[1], {"jsonrpc": "2.0", "id": 2, "result": {}})

    def test_stdio_utf8_under_windows_codepage(self) -> None:
        import os

        env = dict(os.environ, PYTHONIOENCODING="cp1252", PYTHONUTF8="0")
        msgs = [
            {"jsonrpc": "2.0", "id": 1, "method": "tools/call",
             "params": {"name": "get_trends", "arguments": {"limit": 50}}},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
             "params": {"name": "decode_term", "arguments": {"term": "67"}}},
            {"jsonrpc": "2.0", "id": 3, "method": "ping"},
        ]
        raw = "".join(json.dumps(m) + "\n" for m in msgs).encode()
        proc = self._run_stdio(raw, str(ROOT), env=env)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        text = proc.stdout.decode("utf-8")  # must be valid UTF-8
        bodies = [json.loads(x) for x in text.splitlines() if x.strip()]
        self.assertEqual([b["id"] for b in bodies], [1, 2, 3])
        self.assertIn("\u2014", bodies[1]["result"]["content"][0]["text"])


if __name__ == "__main__":
    unittest.main()
