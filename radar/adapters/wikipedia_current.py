"""Optional Wikipedia current-events signal (public API, no key). Disabled by default.

Portal pages are news digests, not slang, so they are never emitted as trends.
"""

from __future__ import annotations

from typing import Any

import httpx

from .base import BaseAdapter


class WikipediaCurrentAdapter(BaseAdapter):
    name = "wikipedia"
    mode = "live"

    def fetch(self) -> list[dict[str, Any]]:
        headers = {"User-Agent": self.user_agent, "Accept": "application/json"}
        # Most-read / featured-ish via REST summary of "Portal:Current_events"
        url = "https://en.wikipedia.org/api/rest_v1/page/summary/Portal:Current_events"
        with httpx.Client(timeout=20.0, headers=headers, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code >= 400:
                # Fragile endpoint — soft-fail by returning empty rather than crashing ingest
                return []
            data = resp.json()

        title = data.get("title") or "Current events"
        if str(title).lower().startswith("portal:") or data.get("namespace", {}).get("id") == 100:
            return []
        extract = data.get("extract") or data.get("description") or ""
        page_url = (data.get("content_urls") or {}).get("desktop", {}).get("page")
        if not extract:
            return []
        return [
            self.make_signal(
                local_id="current-events",
                title=f"Wikipedia: {title}",
                text=extract[:1200],
                url=page_url,
                world_hint="Internet culture",
                tags=["wikipedia", "current-events"],
                metrics={"mentions": 40, "score": 40, "velocity": 0.2},
                raw_refs={"pageid": data.get("pageid")},
            )
        ]
