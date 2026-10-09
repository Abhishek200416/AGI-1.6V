# MATRIX X1.2 — RESOURCE, CONCURRENCY & TOKEN ECONOMY BUDGET

**Document Identifier:** `BUDGET-X1.2-20261009`  
**Target System:** MATRIX X1.2  
**Model Focus:** Gemini 3.8 Flash High (`gemini-3.8-flash-high`)  
**Host Environment:** Windows x64 / Node.js v20.20.2 / Local Antigravity CLI  

---

## 1. Resource Constraints & Execution Policy

Because `gemini-3.8-flash-high` executes via local process invocation of `agy.exe`, the runtime must balance concurrency against host process overhead and session context management:

| Resource Dimension | Operating Bound | Enforcement Mechanism |
|---|---|---|
| **Max Active CLI Requests** | `1 concurrent child process` | Process queue lock in `antigravity-provider.js` to prevent SQLite/session contention |
| **Turn Timeout** | `120,000 ms (120s)` | Explicit child process watchdog with SIGTERM/SIGKILL termination |
| **Max Turn Retries** | `2 retries with jittered backoff` | Exponential backoff (1s $\rightarrow$ 2s) with random jitter to prevent API stampedes |
| **Context Window Upper Cap**| `1,048,576 tokens` | Gemini 3.8 Flash native context limit |
| **Proactive Compaction Trigger**| `35,000 tokens` | Triggers hierarchical token compactor to archive raw tool buffers to disk |
| **Disk Space Safety Threshold** | `500 MB minimum free` | Pre-flight check before writing large evaluation checkpoints |

---

## 2. Token Economy Accounting & Tracking

MATRIX X1.2 extends the Token Economy (`matrix/economy/token-economy.js`) to capture:

$$\text{Total Cost} = \frac{\text{Input Tokens} \times \$0.30}{1,000,000} + \frac{\text{Output Tokens} \times \$0.30}{1,000,000}$$

*Note: For the authenticated Antigravity CLI development session, external monetary charges are zero; however, theoretical cost is tracked at \$0.30 / 1M tokens to measure efficiency improvements against baselines.*

### Measured Consumption Profiles
- **Raw Turn (Uncompacted):** ~29,500 context tokens / turn.
- **Compacted Turn (Milestone Anchors):** ~4,200 tokens / turn (**85.7% token reduction**).
- **Thinking Token Overhead:** ~800–2,400 tokens per high-effort reasoning query.

---

## 3. Seven Token Optimization Strategies

1. **Structured Tool Range Limiting:**
   Never stream full multi-megabyte files into conversational memory. File reads are constrained to targeted line ranges with byte offsets.
2. **Ephemeral Tool Output Eviction:**
   Directory listings, compiler output, and browser DOM dumps are captured in ephemeral workspace logs and replaced in active memory by a 1-line cryptographic hash and summary.
3. **Milestone State Compaction:**
   When a mission phase finishes, intermediate ReAct steps are collapsed into an immutable milestone record: `(Goal, Completed Artifacts, Verified Assertions)`.
4. **Deterministic Tool Bypassing (Ponytail Principle):**
   If an answer can be obtained via deterministic code (e.g. arithmetic, file existence, regex matching, git status), do not invoke the LLM.
5. **Prompt Range Re-use & Stable System Headers:**
   Keep prompt prefixes invariant across turns to maximize provider-level prompt caching benefits.
6. **Watchdog Deadlock Termination:**
   Detect identical tool call arguments repeated $> 2$ times and interrupt immediately, preventing infinite loop token drain.
7. **Bounded Specialist Reviews:**
   Skeptical review is invoked only on irreversible actions (e.g. file deletion, git push, architecture promotion) rather than routine read operations.
