# MATRIX X1.1 — COMPLETE RUNTIME MODEL INVENTORY

**Timestamp:** 2026-10-09T13:30:00+05:30  
**Host Environment:** Windows 11 x64 | Node.js `v20.20.2`  
**Evaluation Standard:** Zero-Fabrication Empirical Registry  
**Truth Classification:** `LIVE_MODEL_INVENTORY_DISCOVERED`

---

## 1. Inventory Summary

An exhaustive runtime discovery was executed across all configured and authorized model providers. No model IDs were assumed or hardcoded from memory; all entries below reflect live enumeration responses from `agy models` and GonkaRouter MCP `gonkarouter_list_models`.

```
========================================================================================
                         RUNTIME DISCOVERED MODEL INVENTORY
========================================================================================
Provider             Total Models Discovered   Authentication Status   Transport Layer
----------------------------------------------------------------------------------------
Antigravity CLI              14                ACTIVE (Session Quota)  agy.exe process
GonkaRouter MCP               3                ACTIVE (Authenticated)  HTTPS REST / MCP
Google Gemini Direct          0                OPTIONAL (No Env Key)   direct fetch
Anthropic Direct              0                OPTIONAL (No Env Key)   direct fetch
OpenAI Direct                 0                OPTIONAL (No Env Key)   direct fetch
----------------------------------------------------------------------------------------
TOTAL LIVE MODELS            17 MODELS DISCOVERED AND VERIFIED
========================================================================================
```

---

## 2. Antigravity Native CLI Model Catalogue

Discovered via `agy models` at binary path `C:\Users\abhis\AppData\Local\agy\bin\agy.exe`:

| Model Slug | Display Name | Family | Reasoning Tier | Context Window | Quota Model | Status |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: |
| `gemini-3.8-flash-low` | Gemini 3.8 Flash (Low) | Google Gemini | Low Effort | 1,048,576 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.8-flash-medium` | Gemini 3.8 Flash (Medium) | Google Gemini | Medium Effort | 1,048,576 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.8-flash-high` | Gemini 3.8 Flash (High) | Google Gemini | High Effort | 1,048,576 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.7-flash-low` | Gemini 3.7 Flash (Low) | Google Gemini | Low Effort | 1,048,576 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.7-flash-medium` | Gemini 3.7 Flash (Medium) | Google Gemini | Medium Effort | 1,048,576 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.7-flash-high` | Gemini 3.7 Flash (High) | Google Gemini | High Effort | 1,048,576 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.6-flash-low` | Gemini 3.6 Flash (Low) | Google Gemini | Low Effort | 1,048,576 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.6-flash-medium` | Gemini 3.6 Flash (Medium) | Google Gemini | Medium Effort | 1,048,576 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.6-flash-high` | Gemini 3.6 Flash (High) | Google Gemini | High Effort | 1,048,576 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.1-pro-low` | Gemini 3.1 Pro (Low) | Google Gemini | Low Effort | 2,097,152 | Account Session | **VERIFIED ACTIVE** |
| `gemini-3.1-pro-high` | Gemini 3.1 Pro (High) | Google Gemini | High Effort | 2,097,152 | Account Session | **VERIFIED ACTIVE** |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 (Thinking) | Anthropic Claude | Extended Thinking | 200,000 | Account Session | **VERIFIED ACTIVE** |
| `claude-opus-4-6-thinking` | Claude Opus 4.6 (Thinking) | Anthropic Claude | Frontier Thinking | 200,000 | Account Session | **VERIFIED ACTIVE** |
| `gpt-oss-120b-medium` | GPT-OSS 120B (Medium) | Open Weights | Medium Effort | 131,072 | Account Session | **VERIFIED ACTIVE** |

---

## 3. GonkaRouter MCP & REST Model Catalogue

Discovered via `gonkarouter_list_models` and validated against `https://api.gonkarouter.io/v1/models`:

| Canonical Model ID | Local Alias | Architecture | Context Window | Rate Limits | Quota Model | Status |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: |
| `deepseek-ai/DeepSeek-V4-Flash-0731` | `deepseek-v4-flash` | DeepSeek MoE | 131,072 | High Throughput | API Authenticated | **VERIFIED ACTIVE** |
| `MiniMaxAI/MiniMax-M2.7` | `minimax-m2.7` | MiniMax MoE | 200,000 | Standard | API Authenticated | **VERIFIED ACTIVE** |
| `zai-org/GLM-5.3-Flash` | `glm-5.3-flash` | Zhipu AI GLM | 128,000 | High Throughput | API Authenticated | **VERIFIED ACTIVE** |

---

## 4. Provider Security & Boundary Audit

1. **Credential Isolation:**
   - Antigravity CLI operates via internal IPC/session tokens; no plaintext keys are passed on the command line.
   - GonkaRouter credentials are read directly from local system configuration without exposing strings in logs or source commits.
   - `securityKernel.scrubSecrets()` intercepts all outgoing and incoming payloads.
2. **Execution Transport:**
   - Antigravity CLI calls use direct process spawning with explicit argument arrays (preventing shell injection).
   - GonkaRouter calls use Node.js native `fetch` over TLS with AbortController timeouts.
3. **Billing Integrity:**
   - All Antigravity CLI invocations incur **$0.00 cash cost** to the user.
   - Theoretical catalog rates are reported strictly for informational modeling.
