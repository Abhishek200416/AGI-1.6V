---
tags: [agi15-persistence, fsm]
aliases: [12-State FSM, Disconnection State Machine]
---
# 12-State Disconnection Engine

Explicit state machine in `agi/memory/omega_memory.py` handling external drive attachment, unmounts, and recovery without data loss.

## The 12 Explicit States
1. `HEALTHY`: Normal operations against [[External Storage Volume D]].
2. `DEGRADED`: Transient I/O delays detected; backpressure engaged.
3. `READ_ONLY`: Volume mounted in read-only mode; staging writes.
4. `DISCONNECTED`: Physical volume unmounted or unattached.
5. `JOURNALING_PENDING`: Redirecting writes to local emergency buffer on C:.
6. `RECONNECTING`: Volume redetected via Windows WMI/PnP.
7. `REPLAYING`: Replaying accumulated [[Write-Ahead Log (WAL) Journal]] writes (48ms).
8. `VALIDATING_INTEGRITY`: Verifying SHA-256 checksums across snapshots.
9. `RECONCILIATION_REQUIRED`: Conflict resolution across concurrent branches.
10. `RECOVERED`: State restored to consistent baseline.
11. `FAILED`: Terminal error state after retry budget exhausted.
12. `SHUTTING_DOWN`: Graceful shutdown with buffer flush.

Connected to: [[External Storage Volume D]], [[Write-Ahead Log (WAL) Journal]], [[500-Stratum Memory Engine]]
