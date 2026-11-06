---
name: ai-defense
description: "Security rules for LLM features: prompt injection, untrusted model output, tool permissions, secrets and PII in prompts, cost limits, evals. Use when building anything that calls a model or gives an agent tools, or when reviewing AI-generated code."
---

# AI Defense Standards

## Rules
- Treat all LLM output as untrusted input: validate with a schema before acting on it.
- Treat all retrieved/scraped/user content fed to a model as potentially hostile (prompt injection).
- Never let model output flow unvalidated into SQL, shell, `eval`, file paths, URLs, or HTML.
- Agents/tools get least privilege: read-only by default, explicit allowlists, human confirmation for destructive or outbound actions.
- Never put secrets, API keys, or credentials in prompts, system prompts, or logs.
- Minimize PII sent to models; redact where the task allows; respect data-processing agreements.
- Set `max_tokens`, timeouts, retry caps, and per-user/per-job budgets on every model call.
- Pin model IDs explicitly; changing a model is a reviewed change with eval results.
- Keep a regression eval set for every prompt that ships; run it before prompt/model changes.
- AI-generated code gets the same review bar as human code — verify APIs exist, run the tests.

## Guidance

### Prompt injection model
Any text the model reads that you did not author (web pages, emails, CRM notes, PDFs, tool
results) can contain instructions. Defenses, layered:
1. **Separation** — wrap untrusted content in clearly delimited blocks and tell the model it is data.
2. **Capability limits** — the model can't do damage it has no tool for. Scope tools tightly.
3. **Output validation** — structured outputs (JSON schema / tool calls), then validate server-side.
4. **Human-in-the-loop** — sends, deletes, payments, and external writes require confirmation.
5. **Egress control** — don't let the model fetch arbitrary URLs it composed from untrusted text
   (data exfiltration via query strings / image links).

### Tool / MCP hygiene
- Review every MCP server before enabling: who publishes it, what it can reach, where tokens are stored.
- Scope MCP servers per project; company connectors must not be reachable from personal projects
  and vice versa.
- Prefer OAuth/short-lived tokens over long-lived PATs; store tokens in the OS keychain or env, never in repo files.

### Reliability
- Structured output + schema validation + one bounded repair retry, then fail loudly.
- Log prompt version, model ID, token counts, latency, and outcome (not raw PII) for every call.
- Cache deterministic calls; use prompt caching for large shared context.

### Reviewing AI-generated code
Check for: hallucinated imports/APIs, silently swallowed errors, over-broad try/catch, disabled
type checks, tests that assert nothing, and unintended scope creep beyond the request.
