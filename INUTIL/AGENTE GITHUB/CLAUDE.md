# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace Layout

```
AGENTE GITHUB/
├── .env                  # Root-level env overrides (not committed)
├── mi-agente-github/     # Main project repo (has its own CLAUDE.md)
│   ├── engine/           # Multi-agent Knowledge Hub runtime
│   ├── cli/              # ag init CLI (zero LLM deps)
│   ├── openspec/         # Spec-driven change proposals
│   └── artifacts/        # Agent output: plans, logs, error journal
```

The primary codebase lives in `mi-agente-github/`. See `mi-agente-github/CLAUDE.md` for full architecture, commands, and conventions.

## Setup

```bash
cd mi-agente-github
python3 -m venv venv && source venv/bin/activate
pip install -e ./cli -e './engine[dev]'
```

Copy `engine/.env.example` to `.env` in project root, then set your API key.

## Common Commands

```bash
# Tests
pytest engine/tests cli/tests

# Single test
pytest engine/tests/test_foo.py::test_name -v

# Knowledge Hub
ag-refresh --workspace .
ag-ask "How does X work?" --workspace .

# MCP server for Claude Code
claude mcp add antigravity ag-mcp -- --workspace $(pwd)
```

## Key Architecture Points

- **Two packages**: `engine/` (runtime, LLM-dependent) and `cli/` (template injector, zero LLM deps). Both have separate `pyproject.toml`.
- **Hub pipeline** (`engine/antigravity_engine/hub/`): Core multi-agent cluster. `refresh_pipeline.py` orchestrates 8-step self-learning; `ask_pipeline.py` routes questions to ModuleAgents via structured claims in `_facts.json`.
- **Tool auto-discovery**: Any public function with full type hints and Google-style docstring in `tools/` is automatically exposed to the LLM — no registration needed.
- **OpenSpec workflow**: New features/breaking changes require a proposal in `openspec/changes/<id>/` before coding. Bug fixes and typos skip this. See `openspec/AGENTS.md` for the 3-stage workflow.
- **Sandbox**: `SANDBOX_TYPE=local` (default) runs Python directly; `microsandbox` uses remote HTTP with resource limits.

## Environment Variables (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_BASE_URL` | — | Any OpenAI-compatible endpoint (Ollama, Groq, etc.) |
| `OPENAI_API_KEY` | — | API key for above endpoint |
| `OPENAI_MODEL` | — | Model name |
| `GOOGLE_API_KEY` | — | Gemini API key (alternative LLM) |
| `MCP_ENABLED` | `false` | Enable MCP consumer (external tool servers) |
| `SANDBOX_TYPE` | `local` | `local` or `microsandbox` |
| `AG_ASK_TIMEOUT_SECONDS` | `45` | Raise to `120` for cross-module questions |
