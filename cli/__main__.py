"""Allow `python -m cli ...` from repo root."""

from .trendy import main

raise SystemExit(main())
