---
tags: [agi15-security, kill-switch]
aliases: [Emergency Kill Switch, Kill Switch]
---
# Emergency Kill Switch (0.08ms)

Halts all subprocesses, terminal streams, and worker threads upon safety circuit breaker trip.

- Execution latency: **0.08 ms** (Target: <1.25 ms ceiling).
- Triggers on unauthorized brokerage keys, disk wiper commands, or sandbox traversal.

Connected to: [[AgentLAB Multi-Turn Injection Shield]], [[DynTaskMAS DAG Scheduler (500 Workers)]]
