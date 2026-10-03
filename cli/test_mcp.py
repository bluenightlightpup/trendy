"""Unit tests for the local stdio MCP server (T0021)."""

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


if __name__ == "__main__":
    unittest.main()
