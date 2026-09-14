"""Allow `python -m cli ...` from repo root."""

from cli.trendy import main

raise SystemExit(main())
