"""Base adapter interface for Trend Radar sources."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class AdapterResult:
    source: str
    mode: str  # live | stub
    ok: bool
    signals: list[dict[str, Any]] = field(default_factory=list)
    skipped: bool = False
    error: str | None = None
    notes: str | None = None

    def summary(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "mode": self.mode,
            "ok": self.ok,
            "skipped": self.skipped,
            "signal_count": len(self.signals),
            "error": self.error,
            "notes": self.notes,
        }


class BaseAdapter(ABC):
    """Pluggable source adapter. Live adapters fetch; stubs document what's needed."""

    name: str = "base"
    mode: str = "live"  # live | stub

    def __init__(self, config: dict[str, Any], global_config: dict[str, Any]):
        self.config = config or {}
        self.global_config = global_config or {}

    @property
    def enabled(self) -> bool:
        return bool(self.config.get("enabled", False))

    @property
    def user_agent(self) -> str:
        return self.global_config.get(
            "user_agent",
            "TrendyRadar/0.1 (+https://github.com/bluenightlightpup/trendy)",
        )

    def run(self) -> AdapterResult:
        if not self.enabled:
            return AdapterResult(
                source=self.name,
                mode=self.mode,
                ok=True,
                skipped=True,
                notes="disabled in config",
            )
        if self.mode == "stub":
            return AdapterResult(
                source=self.name,
                mode=self.mode,
                ok=True,
                skipped=True,
                notes=self.config.get("notes")
                or "STUB: no live fetch — prefer official APIs when owner adds keys",
            )
        try:
            signals = self.fetch()
            return AdapterResult(
                source=self.name,
                mode=self.mode,
                ok=True,
                signals=signals,
            )
        except Exception as exc:  # noqa: BLE001 — partial success at pipeline level
            return AdapterResult(
                source=self.name,
                mode=self.mode,
                ok=False,
                error=str(exc),
            )

    @abstractmethod
    def fetch(self) -> list[dict[str, Any]]:
        """Return list of normalized RadarSignal dicts."""

    def make_signal(
        self,
        *,
        local_id: str,
        title: str,
        text: str = "",
        url: str | None = None,
        world_hint: str | None = None,
        tags: list[str] | None = None,
        metrics: dict[str, Any] | None = None,
        raw_refs: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "id": f"{self.name}:{local_id}",
            "source": self.name,
            "fetched_at": utc_now_iso(),
            "title": (title or "").strip(),
            "text": (text or "").strip(),
            "url": url,
            "world_hint": world_hint,
            "tags": tags or [],
            "metrics": metrics or {},
            "raw_refs": raw_refs or {},
        }
