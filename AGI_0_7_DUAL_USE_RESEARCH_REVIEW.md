# AGI 0.7 — Dual-Use Cybersecurity & MCP Threat Modeling Review

**Document ID:** AGI-07-DUAL-USE-2026  
**Primary Agent:** AGI 0.7  
**Foundation Model:** `gemini-3.8-flash-high`  
**Focus:** Tracks B & C (Adversarial Robustness, OWASP MCP Top 10, Sandbox Escape Vectors)  
**Date:** 2026-10-09  

---

## 1. Dual-Use Threat Landscape in Frontier Autonomous Agents

Autonomous agents possessing tool use, shell execution, web browsing, and code-writing capabilities are fundamentally dual-use systems (Bhatt et al. 2024, Fang et al. 2024). The same cognitive loops used to autonomously diagnose software bugs, execute integration tests, and automate browser tasks can be subverted or weaponized by external adversaries via:
1. **Indirect Prompt Injection:** Adversarial instructions embedded in untrusted web pages, GitHub issues, or data files ingested by the agent (Greshake et al. 2023).
2. **Tool Poisoning & MCP Hijacking:** Exploitation of Model Context Protocol endpoints to execute unauthorized host operations or exfiltrate private credentials (OWASP MCP Top 10 2025, Rehberger & Bargury 2025).
3. **Sandbox Escape & Lateral Movement:** Escaping execution sandboxes via command injection, unsanitized subprocess calls, or symlink traversal.

---

## 2. Threat Vector Taxonomy & Mitigation Matrix

| Vector ID | Threat Name | Literature Reference | Mechanism / Attack Pattern | AGI 0.7 Mitigation Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **TV-01** | Indirect Prompt Injection | Greshake et al. (2023), Liu et al. (2024) | Malicious text in retrieved web page or API payload directs agent to read `.env` and post to remote server. | **Strict Data/Control Plane Separation:** Ingested web/document text is wrapped in data delimiters; output parser strips instruction triggers; network egress whitelist. |
| **TV-02** | Path Traversal via Tool Parameters | OWASP MCP-01, Rehberger et al. (2025) | Agent attempts to read/write `../../Windows/System32` or `../../.ssh/id_rsa` via `view_file` or `write_to_file`. | **Path Containment Guard:** All filesystem tools enforce canonicalization via `path.resolve()` and verify path resides within allowed workspace roots. |
| **TV-03** | Shell Command Injection | OWASP LLM02, Pearce et al. (2022) | Concatenating untrusted inputs into shell strings (`cmd.exe /c "npm install " + input`). | **Safe Process Spawning:** Arguments passed as discrete arrays (`spawn('cmd.exe', ['/c', ...])`); no shell interpolation; command whitelist. |
| **TV-04** | Secret & Credential Exfiltration | OWASP LLM06, Chari et al. (2024) | Model outputs API keys, bearer tokens, or environment secrets in response or tool arguments. | **Deterministic Secret Scrubber:** Regex scrubber masks API keys, JWTs, PEM blocks, and password patterns before saving to disk or printing to logs. |
| **TV-05** | MCP Tool Schema Tampering | OWASP MCP-03 (2025) | Malicious or rogue MCP server provides ambiguous tool schema with hidden command-line flags. | **Closed-World Tool Registry:** AGI 0.7 validates tool schemas against strict JSON schemas before registration; rejects unverified dynamic MCP servers. |
| **TV-06** | Resource Exhaustion (DoS) | OWASP LLM04, Snell et al. (2024) | Unbounded recursive tool calls, infinite while loops, or massive file generation causing disk/memory exhaustion. | **Resource Governor:** Hard execution timeout per tool (120s), max recursion depth, process kill watchdog, disk usage budget monitoring. |

---

## 3. Defense-in-Depth Implementation in AGI 0.7

In AGI 0.7, dual-use security is implemented as deterministic code in `agi/security/mcp-security.js` and `matrix/kernel/security-kernel.js`, rather than relying on model self-restraint:

```
[Tool Invocation Request]
           |
           v
  [1. Path Containment Check]  --> (Fails: Abort with EACCES)
           |
           v
  [2. Command Whitelist & Escaping] --> (Fails: Reject Shell Meta-Chars)
           |
           v
  [3. Credential Scrubbing Filter] --> (Redact Tokens / Keys)
           |
           v
  [4. Execution Resource Budget Gate] --> (Enforce 120s Timeout & RAM Limit)
           |
           v
[Execute Sandboxed Subprocess]
           |
           v
[Sanitize Output & Verify Exit Code]
```

### Verification Standard:
Every tool call executed by AGI 0.7 is logged to an immutable security audit trail (`agi/security/security-audit.jsonl`) with timestamp, caller role, sanitized arguments, exit code, and cryptographic hash.
