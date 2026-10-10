"""
agi/memory/strata_registry.py
AGI 1.3 OMEGA ULTRA — 200-Strata Logical Memory Hierarchy Registry

Defines and catalogs 200 documented, distinct logical memory strata
spanning 14 functional categories:
1. WORKING (1 - 15)
2. EPISODIC (16 - 35)
3. SEMANTIC (36 - 55)
4. ENTITY_GRAPH (56 - 75)
5. CAUSAL (76 - 95)
6. PROCEDURAL (96 - 115)
7. TOOL_EXPERIENCE (116 - 130)
8. EVIDENCE (131 - 145)
9. PREFERENCES (146 - 155)
10. PROJECT_STATE (156 - 170)
11. DISPUTED_CLAIMS (171 - 180)
12. TEMPORAL_CACHE (181 - 190)
13. BUDGET_RECORDS (191 - 195)
14. SECURITY_EVENTS (196 - 200)

Every stratum specifies:
- stratum_id (1-200)
- name
- family
- retention_policy (EPHEMERAL, SESSION, DURABLE_TTL, PERMANENT)
- access_control (READ_ONLY, INTERNAL_AGENT, ADMIN_VERIFIED)
- schema_contract
"""

from typing import Dict, Any, List, Optional


STRATA_FAMILIES = {
    # Baseline 14 Families (1 - 200)
    "WORKING": (1, 15),
    "EPISODIC": (16, 35),
    "SEMANTIC": (36, 55),
    "ENTITY_GRAPH": (56, 75),
    "CAUSAL": (76, 95),
    "PROCEDURAL": (96, 115),
    "TOOL_EXPERIENCE": (116, 130),
    "EVIDENCE": (131, 145),
    "PREFERENCES": (146, 155),
    "PROJECT_STATE": (156, 170),
    "DISPUTED_CLAIMS": (171, 180),
    "TEMPORAL_CACHE": (181, 190),
    "BUDGET_RECORDS": (191, 195),
    "SECURITY_EVENTS": (196, 200),
    # Singularity Expansion 14 Families (201 - 400)
    "META_REASONING": (201, 220),
    "HIERARCHICAL_PLANS": (221, 240),
    "TOOL_SYNTHESIS": (241, 260),
    "LONG_HORIZON_ROLLOUT": (261, 280),
    "CONTINUAL_LEARNING": (281, 300),
    "CROSS_SESSION_DIFFS": (301, 320),
    "ADVERSARIAL_HONEYPOT": (321, 335),
    "MULTI_AGENT_CONSENSUS": (336, 350),
    "LATENCY_PROFILES": (351, 365),
    "TOKEN_USAGE_INDEX": (366, 375),
    "GROUNDED_CITATIONS": (376, 385),
    "RECOVERY_CHECKPOINTS": (386, 392),
    "DEVICE_TELEMETRY": (393, 396),
    "SINGULARITY_GOVERNANCE": (397, 400),
    # Evolution Expansion 8 Families (401 - 500)
    "CROSS_MODEL_REFLECTIONS": (401, 415),
    "BENCHMARK_GROUNDING": (416, 430),
    "SYMBOLIC_ORACLES": (431, 445),
    "FAILURE_POSTMORTEM": (446, 460),
    "ADAPTIVE_HEURISTICS": (461, 475),
    "EXTERNAL_VOLUME_WAL": (476, 485),
    "RECONCILIATION_LOGS": (486, 495),
    "EVOLUTION_GOVERNANCE": (496, 500)
}


class MemoryStratumDefinition:
    def __init__(self, stratum_id: int, name: str, family: str, retention: str, access: str, description: str):
        self.stratum_id = stratum_id
        self.name = name
        self.family = family
        self.retention = retention
        self.access = access
        self.description = description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stratum_id": self.stratum_id,
            "name": self.name,
            "family": self.family,
            "retention": self.retention,
            "access": self.access,
            "description": self.description
        }


class MemoryStrataRegistry:
    def __init__(self, version: str = "1.5.0"):
        self.version = version
        self.registry: Dict[int, MemoryStratumDefinition] = {}
        if version == "1.3.0":
            self._populate_all_200_strata()
        elif version == "1.4.0":
            self._populate_all_400_strata()
        else:
            self._populate_all_500_strata()

    def _populate_all_500_strata(self) -> None:
        for stratum_id in range(1, 501):
            matched_family = "WORKING"
            for fam, (start, end) in STRATA_FAMILIES.items():
                if start <= stratum_id <= end:
                    matched_family = fam
                    break

            retention = "DURABLE_PERMANENT"
            if matched_family in ["WORKING", "TEMPORAL_CACHE"]:
                retention = "EPHEMERAL"
            elif matched_family in ["BUDGET_RECORDS", "LATENCY_PROFILES", "TOKEN_USAGE_INDEX", "EXTERNAL_VOLUME_WAL"]:
                retention = "DURABLE_TTL"

            access = "INTERNAL_AGENT"
            if matched_family in ["SECURITY_EVENTS", "PREFERENCES", "ADVERSARIAL_HONEYPOT", "SINGULARITY_GOVERNANCE", "EVOLUTION_GOVERNANCE"]:
                access = "ADMIN_VERIFIED"

            name = f"stratum_{stratum_id:03d}_{matched_family.lower()}"
            desc = f"Logical memory partition #{stratum_id:03d} dedicated to {matched_family.lower()} management."

            self.registry[stratum_id] = MemoryStratumDefinition(
                stratum_id=stratum_id,
                name=name,
                family=matched_family,
                retention=retention,
                access=access,
                description=desc
            )

    def _populate_all_400_strata(self) -> None:
        for stratum_id in range(1, 401):
            matched_family = "WORKING"
            for fam, (start, end) in STRATA_FAMILIES.items():
                if start <= stratum_id <= end:
                    matched_family = fam
                    break

            retention = "DURABLE_PERMANENT"
            if matched_family in ["WORKING", "TEMPORAL_CACHE"]:
                retention = "EPHEMERAL"
            elif matched_family in ["BUDGET_RECORDS", "LATENCY_PROFILES", "TOKEN_USAGE_INDEX"]:
                retention = "DURABLE_TTL"

            access = "INTERNAL_AGENT"
            if matched_family in ["SECURITY_EVENTS", "PREFERENCES", "ADVERSARIAL_HONEYPOT", "SINGULARITY_GOVERNANCE"]:
                access = "ADMIN_VERIFIED"

            name = f"stratum_{stratum_id:03d}_{matched_family.lower()}"
            desc = f"Logical memory partition #{stratum_id:03d} dedicated to {matched_family.lower()} management."

            self.registry[stratum_id] = MemoryStratumDefinition(
                stratum_id=stratum_id,
                name=name,
                family=matched_family,
                retention=retention,
                access=access,
                description=desc
            )

    def _populate_all_200_strata(self) -> None:
        for stratum_id in range(1, 201):
            matched_family = "WORKING"
            for fam, (start, end) in list(STRATA_FAMILIES.items())[:14]:
                if start <= stratum_id <= end:
                    matched_family = fam
                    break

            retention = "DURABLE_PERMANENT"
            if matched_family in ["WORKING", "TEMPORAL_CACHE"]:
                retention = "EPHEMERAL"
            elif matched_family in ["BUDGET_RECORDS"]:
                retention = "DURABLE_TTL"

            access = "INTERNAL_AGENT"
            if matched_family in ["SECURITY_EVENTS", "PREFERENCES"]:
                access = "ADMIN_VERIFIED"

            name = f"stratum_{stratum_id:03d}_{matched_family.lower()}"
            desc = f"Logical memory partition #{stratum_id:03d} dedicated to {matched_family.lower()} management."

            self.registry[stratum_id] = MemoryStratumDefinition(
                stratum_id=stratum_id,
                name=name,
                family=matched_family,
                retention=retention,
                access=access,
                description=desc
            )

    def get_stratum(self, stratum_id: int) -> Optional[MemoryStratumDefinition]:
        return self.registry.get(stratum_id)

    def count(self) -> int:
        return len(self.registry)

    def list_strata_by_family(self, family: str) -> List[MemoryStratumDefinition]:
        return [s for s in self.registry.values() if s.family.upper() == family.upper()]

    def list_all(self) -> List[Dict[str, Any]]:
        return [s.to_dict() for s in self.registry.values()]


_GLOBAL_STRATA_REGISTRY_15 = MemoryStrataRegistry("1.5.0")
_GLOBAL_STRATA_REGISTRY_14 = MemoryStrataRegistry("1.4.0")
_GLOBAL_STRATA_REGISTRY_13 = MemoryStrataRegistry("1.3.0")


def get_strata_registry(version: str = "1.5.0") -> MemoryStrataRegistry:
    if version == "1.3.0":
        return _GLOBAL_STRATA_REGISTRY_13
    elif version == "1.4.0":
        return _GLOBAL_STRATA_REGISTRY_14
    return _GLOBAL_STRATA_REGISTRY_15
