# AGI 1.3 — OMEGA ULTRA: System Specification & Architecture Design Contract
## Ultimate Engineering Directive: Live Knowledge, Persistent Memory, Connected Devices, Autonomous Computer Operations, Frontier Agent Performance and Reproducible Verification

**Document Identifier:** `AGI-1.3-OMEGA-ULTRA-SPEC`  
**Revision:** 1.3.0  
**Build ID:** `BUILD-AGI13-20261010-0215`  
**Target Platform:** Windows 11 Enterprise x64 (Build 26220) | Python 3.14.6 Virtualenv | Node.js v20.18.0  
**Sole Permitted Foundation Model:** Google Gemini 3.8 Flash High (`gemini-3.8-flash-high`) via Antigravity CLI (`agy.exe`)  
**Security Boundary:** OWASP MCP Path Containment; Pre-Socket DNS SSRF Gate; AgentLAB 2026 Anti-Poisoning Quarantine; Strictly Simulated Financial Operations  
**Date of Ratification:** October 10, 2026  

---

## 1. Executive Mission & Identity

AGI 1.3 (Codename: **OMEGA ULTRA**) is the verified evolution of the autonomous agent platform. It eliminates the version and conversation-context gap by providing a durable, versioned source of truth embedded directly within the application codebase. 

### Mission Core Objectives:
1. **Live Knowledge Engine:** Real-time freshness preflight assessment, distinguishing 5 explicit classes of knowledge, automated model discovery, and continuous research updates.
2. **True Persistent Memory:** 200 documented logical memory strata/namespaces spanning episodic, semantic, causal, procedural, and evidentiary tiers, with atomic filesystem replacement and crash resilience.
3. **Configurable External Storage:** Dynamic discovery of external SSD/HDD volumes via native Windows APIs (`Get-Volume`, `Get-PnpDevice`), organized `AGI_Data/` layout, and an 8-state disconnection recovery machine.
4. **Connected Devices & Host Inspection:** Bare-metal Windows 11 host profiling (CPU, RAM, network interfaces, PnP devices), with clear boundary separation between user identity and device ownership.
5. **480 Registered Capabilities:** High-granularity capability catalog with permissions, platform constraints, side-effect declarations, and automated verification contracts.
6. **200-Worker Wavefront Concurrency:** DynTaskMAS DAG scheduler scaled to a 200-worker ceiling with Tarjan cycle detection and exclusive write locks.
7. **800-Attribute Observability:** Full OpenTelemetry GenAI semantic convention alignment across 8 structured event domains with decoupled progress and heartbeat telemetry.
8. **Massive Test Expansion:** Minimum 4,200 unique core executable tests across 11 balanced categories, supplemented by 15,000+ specialized scenarios (SSRF, policy handling, multi-turn injection).

---

## 2. Five-Class Knowledge Taxonomy

The AGI 1.3 Live Knowledge Engine strictly categorizes every fact into one of five operational types:

1. **`STABLE_BACKGROUND`:** Immutable definitions, mathematical theorems, standard syntax conventions, and verified historical records. Does not trigger live search.
2. **`VERIFIED_PERSISTENT`:** Facts previously stored and validated in local persistent memory. Retains original source timestamps, citation hashes, and explicit TTL invalidation rules.
3. **`LIVE_RETRIEVED`:** External facts retrieved in real time through web search, dynamic browser DOM extraction, or REST API queries. Automatically validated for publication date, authority, and citation consistency.
4. **`LOCAL_OBSERVED`:** Facts directly observed from host system APIs (`Get-Volume`, `Get-PnpDevice`, `whoami`, process table, filesystem state). Retains local timestamp and hardware hash.
5. **`UNVERIFIED_INFERENCE`:** Model-generated hypotheses, extrapolated trends, or provisional assumptions. Permanently tagged and quarantined from active decision policies until validated by independent non-verbal tests.

---

## 3. Persistent Memory Architecture & 200 Logical Strata

Persistent memory resides in `AGI_Data/memory/` and is partitioned into **200 documented logical strata**:

| Strata Range | Strata Family | Primary Responsibility | Storage Format |
| :--- | :--- | :--- | :--- |
| **001 – 015** | `WORKING` | Active turn scratchpads, intermediate task registers, parser buffers | Ephemeral in-memory + JSON |
| **016 – 035** | `EPISODIC` | Full conversational histories, step execution traces, environment responses | Append-only JSONL |
| **036 – 055** | `SEMANTIC` | Grounded facts, domain ontologies, terminology mappings | Content-addressed JSON |
| **056 – 075** | `ENTITY_GRAPH` | Entities, attributes, bidirectional relationships, and alias mappings | Adjacency index JSON |
| **076 – 095** | `CAUSAL` | Cause-effect-condition tuples (`{cause, effect, condition, confidence}`) | Directed graph JSON |
| **096 – 115** | `PROCEDURAL` | Verified workflow skills, parameter schemas, execution runbooks | Versioned skill schemas |
| **116 – 130** | `TOOL_EXPERIENCE`| Tool call histories, error fingerprints, argument repair patterns | Fingerprint hash map |
| **131 – 145** | `EVIDENCE` | Cryptographic SHA-256 hashes, source URLs, raw DOM diffs | HMAC-SHA256 ledger |
| **146 – 155** | `PREFERENCES` | User coding preferences, tone, authorized constraints, budget ceilings | Immutable config JSON |
| **156 – 170** | `PROJECT_STATE` | File dependency trees, git commits, build manifests, active branches | JSON project graph |
| **171 – 180** | `DISPUTED_CLAIMS`| Conflicting external assertions, stale memory overrides, uncertainty logs | Conflict ledger JSON |
| **181 – 190** | `TEMPORAL_CACHE` | Time-sensitive research data with explicit TTL expiration policies | TTL key-value store |
| **191 – 195** | `BUDGET_RECORDS` | Token expenditure, model call counts, wall-clock latency ledgers | Real-time accounting JSON |
| **196 – 200** | `SECURITY_EVENTS`| AgentLAB injection attempts, SSRF blocks, emergency stop triggers | Immutable audit stream |

### Memory Disconnection State Machine:
When persistent storage targets (e.g. external SSDs) are unmounted or disconnected, memory transitions across 8 explicit states:
```text
READY <---> WRITE_PENDING <---> DEGRADED <---> DISCONNECTED
  ^                                                |
  |                                                v
VERIFIED <--- SYNCING <----------------------- RECOVERING
```
- In `DISCONNECTED` mode, new writes are appended to local temporary journal `AGI_Data/memory/recovery/journal.json`.
- When the volume reconnects, `RECOVERING` and `SYNCING` states replay pending journal writes with conflict resolution before transitioning back to `READY`.

---

## 4. Capability Registry (480 Items)

The AGI 1.3 runtime exposes **480 fine-grained capabilities** classified into 16 families:
1. `FS_OPS` (001–035): Filesystem inspection, atomic writes, diffs, tree traversals.
2. `PROJECT_AST` (036–065): Codebase AST analysis, symbol resolution, import graph validation.
3. `BROWSER_OPS` (066–100): Headless Chromium navigation, DOM extraction, multi-hop citation graphs.
4. `TERMINAL_OPS` (101–135): Stateful process controller, 64KB bounded streaming, PID re-attachment.
5. `TEST_MUTATION` (136–165): Unit/integration test runners, reversible mutation injection, fault checks.
6. `PACKAGE_ENV` (166–190): Pip/npm virtualenv management, dependency tree audits.
7. `PROCESS_PROF` (191–215): Host CPU/RAM sampling, thread profiling, stall watchdog monitoring.
8. `NETWORK_DIAG` (216–240): DNS resolution, socket connectivity checks, latency profiling.
9. `VOLUME_INSPEC` (241–265): Windows `Get-Volume` inspection, disk health, filesystem formatting.
10. `MEMORY_STRATA` (266–300): Strata querying, candidate promotion, Ebbinghaus triple scoring.
11. `MCP_GATEWAY` (301–330): MCP server communication, schema negotiation, session isolation.
12. `SECURITY_GATE` (331–365): AgentLAB multi-turn injection shield, SSRF pre-socket gate, path containment.
13. `RESEARCH_FACT` (366–400): Freshness preflight, claim-to-source mapping, HMAC proof chaining.
14. `MARKET_SIM` (401–425): Simulated paper trading, order book matching, zero-real-money assertion.
15. `TELEMETRY_MVR` (426–455): 800-attribute OpenTelemetry streaming, secret redaction, stagnation alerts.
16. `RESILIENCE_REC` (456–480): Atomic checkpoint creation, state rehydration, partial failure quarantine.

---

## 5. Host & Connected Device Architecture

On Windows 11, the Host & Connected Device subsystem runs native, non-destructive discovery via PowerShell and WMI:
- **Mounted Volumes:** Invokes `Get-Volume` to detect Drive letters, Volume Labels, Filesystem types, Total Sizes, and Free Space.
- **PnP Devices:** Invokes `Get-PnpDevice` to detect connected USB controllers, input peripherals, audio interfaces, and external storage buses.
- **Identity & Privilege Separation:** Queries `whoami` and system token groups without conflating user authorization with hardware ownership. All side-effecting operations require explicit capability profile clearance.

---

## 6. Wavefront Concurrency Ceiling (200 Workers)

The DynTaskMAS DAG Scheduler is engineered to scale from 1 to 200 concurrent worker threads:
- **Graph Compilation:** Pre-compiles execution plans into Directed Acyclic Graphs with Tarjan Cycle Detection.
- **Wavefront Parallelism:** Identifies independent ready tasks and dispatches them across a thread pool sized to the workload (tested at 1, 5, 10, 25, 50, 100, 150, and 200 workers).
- **Exclusive Resource Write Locks:** Tasks claiming shared files or databases acquire lock leases, preventing race conditions.
- **Partial Failure Quarantine:** When task $T_i$ fails, only its transitive descendants are marked `BLOCKED`; unrelated parallel branches proceed to completion.

---

## 7. OpenTelemetry Observability (800 Attributes)

Every execution event streams structured telemetry across 800 validated attributes organized into 8 OpenTelemetry-compatible namespaces:
- `task.*` (Attributes 1–100): Task ID, parent, phase, status, retry count, priority.
- `model.*` (Attributes 101–200): Provider, model ID, prompt tokens, thinking tokens, temperature.
- `tool.*` (Attributes 201–300): Tool name, schema hash, exit code, duration, buffer size.
- `memory.*` (Attributes 301–400): Strata ID, recall formula, recency score, quarantine flag.
- `research.*` (Attributes 401–500): Source URL, domain authority, citation hash, freshness score.
- `security.*` (Attributes 501–600): Shield status, injection signature, SSRF target IP, permission decision.
- `device.*` (Attributes 601–700): Volume drive letter, filesystem type, PnP device ID, bus type.
- `budget.*` & `recovery.*` (Attributes 701–800): Effort level, token remaining, checkpoint ID, rehydration ms.

Telemetry strictly decouples progress updates from worker heartbeats and scrubs all API keys and session secrets.
