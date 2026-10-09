# AGI 0.7 — Formal Verification & Proof-Carrying Code Review

**Document ID:** AGI-07-FORMAL-VERIF-2026  
**Primary Agent:** AGI 0.7  
**Foundation Model:** `gemini-3.8-flash-high`  
**Focus:** Track D (Formal Verification, Proof-Carrying Code, AST Invariants, Non-Verbal Proof)  
**Date:** 2026-10-09  

---

## 1. Principles of Proof-Carrying Code in Agent Architectures

George Necula's seminal work on **Proof-Carrying Code (PCC)** (Necula 1997) establishes that untrusted executable code should come equipped with a verifiable mathematical certificate that proves adherence to a specified safety policy. The host system does not need to trust the code producer; it only needs to trust a small, deterministic proof checker.

### Modern Translation for AGI 0.7:
In an LLM-driven autonomous agent:
1. The **Language Model** acts as the *untrusted code producer*.
2. The **Agent Kernel / Runtime** acts as the *trusted proof checker*.
3. Every artifact (code file, skill, database mutation) must be accompanied by non-verbal verification proofs (AST validity, passing unit tests, state invariant checks, SHA-256 diffs).

```
+------------------------------------------------------------------------------------------------+
|                             PROOF-CARRYING AGENT STATE TRANSITION                              |
+------------------------------------------------------------------------------------------------+
|                                                                                                |
|   [Proposed Mutation S -> S']                                                                  |
|                |                                                                               |
|                v                                                                               |
|   +----------------------------------------------------------------------------------------+   |
|   |                       VERIFIABLE PROOF CERTIFICATE (Non-Verbal)                        |   |
|   | 1. AST Syntactic Correctness: node --check <file> == 0                                 |   |
|   | 2. Static Safety Policy: AST scanner finds 0 banned symbols / eval / network calls    |   |
|   | 3. Functional Correctness: Deterministic unit test exit code == 0                     |   |
|   | 4. Regression Invariant: All held-out baseline tests pass                              |   |
|   | 5. Cryptographic State Ledger: SHA-256(S') recorded in evidence ledger                 |   |
|   +----------------------------------------------------------------------------------------+   |
|                |                                                                               |
|                v                                                                               |
|   [Deterministic Verifier: PASS?]                                                              |
|          /               \                                                                     |
|       (YES)              (NO)                                                                  |
|         v                  v                                                                   |
|   [Commit State]    [Rollback & Log Failure]                                                   |
|                                                                                                |
+------------------------------------------------------------------------------------------------+
```

---

## 2. Deterministic Verifier Implementation

In AGI 0.7, the verifier is implemented in `agi/verification/evidence-ledger.js` and `matrix/verification/closed-loop-verifier.js`:
- **Node.js AST Check:** `node --check <file>` validates syntax before disk flush.
- **Python AST Check:** `python -m py_compile <file>` ensures zero syntax errors in Python scripts.
- **Subprocess Exit Code:** Test runner process must terminate cleanly with exit code `0`.
- **Log Non-Emptiness & Assertions:** Standard output must contain expected assertions and zero uncaught exceptions.
- **SHA-256 Diff Certification:** The pre-mutation and post-mutation file hashes are computed and appended to the immutable evidence ledger.

Verbal declarations such as *"I have verified the file works"* without the accompanying exit code and proof certificate are classified as invalid by the system.
