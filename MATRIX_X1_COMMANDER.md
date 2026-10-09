# MATRIX X1 — COMMANDER INTERFACE & ATTENTION ENGINE
**System:** MATRIX X1 (`orchestration-agent-x1`)  
**Components:** `matrix/commander/commander-gateway.js` & `matrix/commander/attention-engine.js`  
**Standard:** High Signal-to-Noise Attention Management & Structured Communication  

---

## 1. Commander Philosophy: Attention is the Scarcest Resource

Autonomous systems that overwhelm human commanders with hundreds of low-level notifications, verbose chain-of-thought logs, or vague open-ended questions fail in production.

Matrix X1 treats **human attention** as an expensive, strictly budgeted resource:
- **Zero Low-Level Spam:** Routine tool completions and minor retries are handled autonomously.
- **Batched Updates:** Non-urgent updates are aggregated into periodic milestone summaries.
- **High-Signal Questions:** Every question posed to the commander follows the strict Section 45 standard.
- **Fast Structured Replies:** Commander can reply with a single letter or word (`A`, `B`, `YES`, `NO`, `PAUSE`).

---

## 2. Section 45 Formatted Questions Standard

When Matrix X1 requires human guidance or approval for high-risk actions, it formats messages using the mandatory 7-part contract:

```
[SECTION 45 QUESTION FORMAT]
1. SITUATION: Concise context of what happened and why execution paused.
2. QUESTION: The exact, unambiguous decision required from the commander.
3. OPTION A: First alternative, with projected impact and trade-offs.
4. OPTION B: Second alternative, with projected impact and trade-offs.
5. RECOMMENDATION: The system's calculated optimal choice based on evidence.
6. RISK CLASSIFICATION: Reversible (Soft rollback) vs. Irreversible (External side effect).
7. REPLY FORMAT: Explicit instruction (e.g., "Reply 'A', 'B', or 'ABORT'").
```

### Example In-Flight Prompt
> **SITUATION:** Disk volume `F:` has 85% utilization; local checkpoint directory reached 4.2 GB.  
> **QUESTION:** Should Matrix X1 prune non-critical trajectory logs older than 7 days, or migrate them to compressed secondary storage?  
> **OPTION A:** Prune trajectory logs older than 7 days (Saves 3.1 GB instantly; removes fine-grained mouse traces).  
> **OPTION B:** Compress and move to `F:\archive` (Preserves all data; uses 1.2 GB of disk bandwidth).  
> **RECOMMENDATION:** Option A (Trajectory logs are already summarized in Memory Fabric).  
> **RISK:** Reversible (Summary graphs remain in memory).  
> **REPLY:** Reply `A` or `B`.

---

## 3. The 9 Core Message Types

The Commander Gateway classifies all outgoing communications into 9 semantic types:

| Message Type | Priority | Delivery Channel | Action Required? |
| :--- | :---: | :--- | :---: |
| `DECISION_REQUEST` | **P1 (Highest)** | Interactive CLI / WhatsApp | **YES (Blocks until answered)** |
| `SECURITY_BLOCK` | **P1 (Highest)** | Interactive CLI / Alert | **YES (Approval or Abort)** |
| `ANOMALY_ALERT` | **P2** | Interactive CLI / WhatsApp | Optional inspection |
| `COST_ALERT` | **P2** | Interactive CLI / Digest | Optional budget increase |
| `PROPOSAL_REVIEW` | **P3** | Interactive CLI / Digest | Review self-improvement candidate |
| `MILESTONE_REPORT` | **P3** | Digest / Log | No (Informational) |
| `COMPLETION_REPORT`| **P3** | Interactive CLI / Notification | No (Final milestone summary) |
| `HEARTBEAT_STATUS` | **P4** | Log Stream | No (Telemetry only) |
| `GENERAL_UPDATE` | **P4 (Lowest)**| Log Stream | No (Verbose trace) |

---

## 4. Structured Response Parser

The Commander Interface parses human inputs into standardized control signals, handling colloquial shorthand and single-key replies:

```
[PARSER RULES]
├── "A" / "option a" / "1"        --> { choice: "A", confirmed: true }
├── "B" / "option b" / "2"        --> { choice: "B", confirmed: true }
├── "y" / "yes" / "approve" / "ok" --> { decision: "APPROVE", confirmed: true }
├── "n" / "no" / "reject" / "stop" --> { decision: "REJECT", confirmed: true }
├── "pause" / "halt"              --> { command: "PAUSE_MISSION" }
├── "resume" / "continue"         --> { command: "RESUME_MISSION" }
└── "status" / "where are you"     --> { query: "EMIT_HEARTBEAT_SUMMARY" }
```

---

## 5. WhatsApp Browser Adapter Architecture

For mobile commander interaction outside the terminal:
1. **Durable Browser Session:** Launched via [browser-engine.js](file:///c:/Users/abhis/Downloads/pt/matrix/tools/browser-engine.js) pointed to WhatsApp Web.
2. **Session Persistence:** Cookies and local storage cached in `.matrix_data/sessions/whatsapp/`.
3. **QR Detection:** If unauthenticated, emits a clean ASCII terminal prompt alerting the commander.
4. **Message Listener:** Polls authorized commander conversation DOM elements for structured commands.
5. **Secure Dispatcher:** Transmits Section 45 alerts directly to the designated commander chat.

---

## 6. Runtime Inspection & Diagnostics

Commander commands for inspecting communication status:
- `matrix x1 commander`: Shows active gateway status, message queues, and pending decisions.
- `matrix x1 attention`: Shows commander attention budget, quiet hour settings, and priority queue depth.
