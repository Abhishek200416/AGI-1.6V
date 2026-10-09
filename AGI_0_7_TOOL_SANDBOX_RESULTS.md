# AGI 0.7 — ToolSandbox Evaluation Report

**Mission ID:** `AGI-07-EXTERNAL-BENCHMARK-CAMPAIGN-2026`  
**Benchmark:** ToolSandbox  
**Official Project:** `https://github.com/apple-aiml-research/ToolSandbox`  
**Evaluation Target:** AGI 0.7  
**Status:** `BLOCKED`  
**Diagnostic Timestamp:** 2026-10-09  

---

## 1. Benchmark Scope & Requirements

ToolSandbox is Apple Research's benchmark for evaluating stateful, multi-turn tool interaction, implicit state dependencies, missing information handling, and intermediate milestones.
- **Key Concepts:**
  - Dynamic user simulator interacting with the agent.
  - State dependencies across multiple tool invocations.
  - Intermediate milestone verification.

---

## 2. Integrity Preflight & Authorization Blocker

An audit of the official ToolSandbox documentation and code (`https://github.com/apple-aiml-research/ToolSandbox`) revealed:

```markdown
### Execution
#### Required configuration for the different user/agent roles:
| User Type  | CLI Option   | OPENAI_API_KEY |
| ---------- | ------------ | :------------: |
| Simulator  | GPT_3_5_0125 |       ✅       |
| Simulator  | GPT_4_0125   |       ✅       |
```

### Critical Blocker Findings:
1. **Mandatory Paid OpenAI API Dependency:** The benchmark's built-in conversational user simulator is hardcoded to require an OpenAI model (`GPT_3_5_0125` or `GPT_4_0125`) and checks for `OPENAI_API_KEY`.
2. **Violation of Directive 0 & Budget Policy:**
   - **Directive 0:** Mandates `gemini-3.8-flash-high` as the sole permitted foundation model.
   - **Budget Policy:** Explicitly commands: *"Use existing authorized resources and quotas. Do not incur new external charges, provision paid infrastructure, or change model providers without explicit authorization."*
   - Invoking OpenAI models would violate both the sole foundation model directive and the zero-new-external-charges budget rule.

---

## 3. Alternative In-House Tool Testing (AGI 0.7 ToolRegistry)

While the external ToolSandbox runner cannot be launched without unauthorized external API fees, AGI 0.7's stateful tool capabilities were independently audited through its native `ToolRegistry`:
- **Closed-World Parameter Validation:** Verified in Acceptance Suite (Test 16).
- **OWASP MCP Path Containment:** Verified in Acceptance Suite (Test 17).
- **Command Injection Resistance:** Verified in Acceptance Suite (Test 18).
- **Secret Scrubbing:** Verified in Acceptance Suite (Test 19).

---

## 4. Verdict & Status

- **Status:** `BLOCKED_BY_PAID_DEPENDENCY`
- **Total External Tasks Attempted:** 0
- **Remediation Required:**
  - Maintainer or adapter patch to support local/Gemini user simulators for on-policy conversational turns, avoiding paid third-party API dependencies.
