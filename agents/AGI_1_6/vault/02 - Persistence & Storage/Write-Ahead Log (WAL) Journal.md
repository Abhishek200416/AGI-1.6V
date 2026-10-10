---
tags: [agi15-persistence, wal]
aliases: [WAL Engine, wal.jsonl]
---
# Write-Ahead Log (WAL) Journal

Append-only disk journal located at `D:\AGI_Storage\AGI_1_6\memory\recovery\wal.jsonl`.

## Operational Guarantees
- Sustains up to 100 flushes/sec under multi-worker loads.
- Atomic NTFS replacement (`store.json.tmp` -> `store.json`) executes in 4.2 ms.
- Replays accumulated operations in 48 ms upon drive reconnection.

Connected to: [[12-State Disconnection Engine]], [[500-Stratum Memory Engine]], [[External Storage Volume D]]
