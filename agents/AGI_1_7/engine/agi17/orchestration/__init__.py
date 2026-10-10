"""AGI 1.7 Orchestration & Resource Governance Package."""

from .hierarchical_orchestrator import HierarchicalOrchestrator, SubtaskSpec
from .resource_governor import (
    MAX_AGENT_SPECIALIZATIONS,
    MAX_LOGICAL_CHILD_TASKS,
     WORKLOAD_FOOTPRINTS,
    AdmissionDecision,
    QuantumComputeAdapter,
    ResourceGovernor,
    WorkloadFootprint,
)

__all__ = [
    "MAX_AGENT_SPECIALIZATIONS",
    "MAX_LOGICAL_CHILD_TASKS",
    "WorkloadFootprint",
    "WORKLOAD_FOOTPRINTS",
    "AdmissionDecision",
    "QuantumComputeAdapter",
    "ResourceGovernor",
    "SubtaskSpec",
    "HierarchicalOrchestrator",
]
