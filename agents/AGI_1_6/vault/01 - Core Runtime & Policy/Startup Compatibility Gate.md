---
tags: [agi15-core, gate]
aliases: [Compatibility Gate, AGI15CompatibilityGate]
---
# Startup Compatibility Gate

Mandatory diagnostic gate (`agi/runtime/compatibility_gate.py`) running on initialization.

## Verified Invariants
- Runtime Version: `1.5.0`
- Codename: `OMEGA EVOLUTION`
- Memory Backend: 500 strata targeting [[External Storage Volume D]]
- Capabilities: Exactly 1,200 registered capabilities
- Telemetry: Exactly 2,000 OpenTelemetry attributes across 20 namespaces
- Rejects any stale legacy profiles with `CompatibilityGateError`.

Connected to: [[AGI 1.6 OMEGA NEXUS]], [[External Storage Volume D]], [[500-Stratum Memory Engine]]
