"""AGI 1.7 Capability Router for Specialist Selection.

Routes tasks and subtasks to the optimal specialist(s) from the 100-agent
registry based on capability tags, domain keywords, required tools, and
current host resource constraints.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Sequence

from .agent_contract import AgentContract


class CapabilityRouter:
    """Scores and selects specialists from the 100-agent registry for a given task."""

    def __init__(self, contracts: Sequence[AgentContract]) -> None:
        self._contracts: List[AgentContract] = list(contracts)
        self._by_id: Dict[str, AgentContract] = {c.agent_id: c for c in self._contracts}

    def get_by_id(self, agent_id: str) -> AgentContract:
        if agent_id not in self._by_id:
            raise KeyError(f"Unknown specialist agent_id: {agent_id}")
        return self._by_id[agent_id]

    def route(
        self,
        *,
        task_description: str,
        required_capabilities: Optional[Sequence[str]] = None,
        preferred_family: Optional[str] = None,
        exclude_container_if_unavailable: bool = False,
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        tokens = {tok.lower() for tok in re.findall(r"[a-zA-Z0-9_]+", task_description) if len(tok) >= 3}
        req_caps = {c.lower() for c in (required_capabilities or [])}

        scored: List[tuple[float, AgentContract]] = []
        for contract in self._contracts:
            if exclude_container_if_unavailable and contract.execution_mode == "ISOLATED_CONTAINER_WORKER":
                continue

            score = 0.0
            if preferred_family and contract.family.lower() == preferred_family.lower():
                score += 10.0

            cap_text = " ".join(contract.primary_capabilities).lower()
            id_text = f"{contract.agent_id} {contract.display_name} {contract.family}".lower()

            for req in req_caps:
                if req in cap_text or req in id_text:
                    score += 8.0

            for tok in tokens:
                if tok in contract.agent_id.lower():
                    score += 4.0
                if tok in cap_text:
                    score += 3.0
                elif tok in id_text:
                    score += 1.5

            # Prefer lighter resource footprint on ties
            if contract.resource_class == "LIGHT":
                score += 0.3
            elif contract.resource_class == "MEDIUM":
                score += 0.2

            scored.append((score, contract))

        scored.sort(key=lambda item: (item[0], item[1].agent_id), reverse=True)
        return [
            {
                "agent_id": c.agent_id,
                "display_name": c.display_name,
                "family": c.family,
                "execution_mode": c.execution_mode,
                "resource_class": c.resource_class,
                "score": round(sc, 3),
                "contract": c,
            }
            for sc, c in scored[: max(1, top_k)]
        ]
