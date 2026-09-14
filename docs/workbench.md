# How Trendy uses my-workbench

**Workbench repo:** https://github.com/bluenightlightpup/my-workbench  

Trendy is a **product/app repo**. Agents, skills, graph, and usage logging stay in the workbench. Do **not** copy the entire workbench tree into this repository.

## Sync note

- Owner idea docs may live on Desktop (“trendy docs”).
- App source of truth for implementation is **this repo**.
- Process source of truth for agents/skills is **my-workbench**.
- `init-prompt.txt` from idea folders (if empty) can be ignored.

## Agents to prefer

- `ios-engineer` — SwiftUI, Xcode, tests, debugging, release
- `product-strategist` — PRD, prioritization, tickets
- Also: `orchestrator`, `implementer`, `reviewer`, `researcher` as needed

See `AGENTS.md`.

## Skills to invoke by name

| Skill | Use in Trendy for |
|-------|-------------------|
| `ios-xcode-setup` | Creating/restructuring Xcode project (`docs/xcode-setup.md`) |
| `ios-swiftui-feature` | Home, Decode, Explore, You features |
| `ios-testing` | Unit/UI tests under `Tests/` |
| `ios-debugging` | Simulator/device issues |
| `ios-app-store-release` | TestFlight / store |
| `api-client-design` | Claude Decode client, trend APIs |
| `architecture-decision` | Data source / proxy ADRs |
| `software-dev-loop` | End-to-end ticket loops |
| `product-spec-to-tickets` | Evolving `docs/backlog.md` |
| `write-prd` | Updating `docs/prd.md` |
| `git-branch-pr` | Branch + PR hygiene |
| `log-usage` | Log meaningful agent/skill use in the **workbench** tracking log |

## What stays out of Trendy

- `.claude/agents`, `.claude/skills`, graph nodes, workbench `tracking/` registry — keep those in my-workbench unless a future decision says otherwise.

## Trendy CLI (until MCP lands)

Phase 4 ships a **local CLI** so agents can shell out instead of parsing raw JSON by hand. MCP (T0021) is deferred.

From the Trendy repo root:

```bash
python cli/trendy.py decode <term>
python cli/trendy.py trends --min-heat 0.7 --limit 20
python cli/trendy.py radar status
python cli/trendy.py radar run
```

Prefer this over ad-hoc `jq` on `web/data/*.json` when explaining slang or checking Radar health. Details: `docs/cli-mcp-integration.md`, `docs/adr/0001-cli-mcp.md`.

