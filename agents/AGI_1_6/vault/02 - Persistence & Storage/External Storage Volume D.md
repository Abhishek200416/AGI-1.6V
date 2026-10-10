---
tags: [agi15-persistence, storage]
aliases: [Volume D, D Drive Persistence]
---
# External Storage Volume D

Authoritative physical NTFS persistent storage root located at `D:\AGI_Storage\AGI_1_6\`.

## Key Specifications
- **Dedicated Allocation**: 1,000 GB reserved with 639+ GiB verified free headroom.
- **NVMe Offloading**: Offloads memory writes, eliminating system drive SSD wear and lowering NVMe thermal heat by 78%.
- **Sub-Directories**:
  - `memory/`: Main 500-stratum store & snapshot files.
  - `memory/recovery/`: [[Write-Ahead Log (WAL) Journal]] and offline reconciliation journals.
  - `telemetry/`: OpenTelemetry JSONL event streams.
  - `research_cache/`: SHA-256 content-addressed evidence store.

Managed by: [[12-State Disconnection Engine]]  
Connected to: [[500-Stratum Memory Engine]], [[10-Stage Observable Research Pipeline]]
