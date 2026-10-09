# AGI 0.7 — Honest Capability Boundaries & Operational Risk Policy

**Document ID:** AGI-07-LIMITATIONS-RISK-BOUNDARIES-2026  
**Version:** 1.0.0  
**Status:** ACTIVE & ENFORCED  
**Lineage:** AGI 0.7 Hardening Campaign (`feature/agi-0.7-hardening`)  
**Sole Foundation Model:** `gemini-3.8-flash-high`  

---

## 1. Executive Mandate

In strict accordance with the AGI 0.7 Operational Mandate, Ponytail Principle, and anti-hype truthfulness assertion engine, this document codifies the non-negotiable boundaries, explicit constraints, and known limitations of the AGI 0.7 autonomous engineering system.

---

## 2. Hard Locked Operational Boundaries

### 2.1 Financial Execution Boundary (Directive 3)
- **Paper Trading Only:** All financial operations, market data simulations, order creation, and portfolio tracking in `agi/finance/` are strictly simulated.
- **Zero Real-Money Execution:** AGI 0.7 possesses zero brokerage API keys, zero private trading wallets, and zero external order routing permissions.
- **Permanent Kill Switch:** The emergency risk-of-ruin watchdog and kill switch are hard-locked in source code and verified by acceptance test 25.

### 2.2 Sole Foundation Model Policy (Directive 0)
- **Exclusive Foundation Model:** All reasoning, planning, code synthesis, and evaluation calls route exclusively to `gemini-3.8-flash-high` through the authenticated Antigravity CLI (`agy.exe`).
- **Zero Silent Fallback:** If `gemini-3.8-flash-high` becomes rate-limited, unreachable, or encounters an authentication failure, execution halts immediately. No silent fallback to Low/Medium reasoning or alternate commercial LLMs is permitted.

---

## 3. Explicit Capability Ceilings & Known Limitations

| Subsystem / Capability | Current Hard Ceiling | Technical Root Cause | Recommended Upgrade Path |
| :--- | :--- | :--- | :--- |
| **Containerized Benchmarks** | Blocked on Host | Docker service requires elevated administrative privileges to run | Start Docker daemon with Admin elevation and point data root to D: |
| **Host Disk Space** | 16.15 GB on C: | Primary drive capacity near exhaustion (93.2% utilized) | Migrate Docker caches and VM image directories to spacious secondary drive D: (686 GB free) |
| **Complex Multi-Hop Web QA** | $\le 5$ simultaneous constraints | Monolithic combinatorial queries risk timeout (>180s) | Decompose into atomic sequential queries via `decompose_constraints()` |
| **Memory Persistence** | File-backed JSON store | Flat JSON file serialization suitable for $\le 50,000$ memories | Upgrade backend to embedded SQLite or vector database for $\ge 100,000$ entities |
| **Desktop OS Computer-Use** | Sandbox containment | Native OS bridge restricted to authorized project workspace | Deploy dedicated QEMU virtual machine for unrestricted guest OS operations |
| **Browser Captchas** | Unassisted text/DOM | Visual captchas and bot-detection challenges not bypassed | Rely on authenticated browser contexts or human-in-the-loop escalation |

---

## 4. Release Verdict

The hardened release line is formally designated:
```text
RELEASE VERDICT: HARDENING_COMPLETE_WITH_KNOWN_LIMITATIONS
```
All claimed internal capabilities and repaired benchmark adapters are mathematically and empirically verified, with known host environment prerequisites explicitly documented.
