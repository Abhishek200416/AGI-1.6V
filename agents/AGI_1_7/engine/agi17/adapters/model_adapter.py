"""AGI 1.7 Model Adapter (Directive 0: gemini-3.8-flash-high via agy.exe).

Enforces:
1. Sole Foundation Model (`gemini-3.8-flash-high`) with zero silent fallbacks.
2. Safe permissions policy: does NOT blindly pass `--dangerously-skip-permissions`
   unless explicitly authorized by `permissions_policy.json` for a scoped sandbox container.
3. Isolated working directory (`D:\\AGI_Evaluation\\AGI_1_7_OMEGA_COMMAND\\isolated_cwd`)
   for benchmark items and single-shot reasoning calls, eliminating the 22.7k token
   workspace prompt injection leak discovered in AGI 1.6.
4. Supervised execution via `ProcessSupervisor` with `AdaptiveTokenController`
   budget admission and `ResourceGovernor` concurrency gating.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..orchestration.resource_governor import ResourceGovernor
from ..process_supervision.process_supervisor import ProcessSupervisor
from ..telemetry.token_economy import AdaptiveTokenController


class DirectiveZeroViolationError(RuntimeError):
    """Raised when any caller attempts to invoke a model other than gemini-3.8-flash-high."""


class ModelAdapter:
    """Verified Antigravity CLI (`agy.exe`) adapter enforcing Directive 0 and isolated CWD."""

    SOLE_MODEL = "gemini-3.8-flash-high"

    def __init__(
        self,
        *,
        token_controller: Optional[AdaptiveTokenController] = None,
        governor: Optional[ResourceGovernor] = None,
        supervisor: Optional[ProcessSupervisor] = None,
        agy_path: Optional[str | Path] = None,
    ) -> None:
        self.token_controller = token_controller or AdaptiveTokenController()
        self.governor = governor or ResourceGovernor()
        self.supervisor = supervisor or ProcessSupervisor()

        default_agy = Path(os.environ.get("LOCALAPPDATA", r"C:\Users\abhis\AppData\Local")) / "agy" / "bin" / "agy.exe"
        if not default_agy.exists():
            default_agy = default_agy.with_suffix(".cmd")
        self.agy_path = Path(agy_path) if agy_path else default_agy

    def build_command(
        self,
        *,
        prompt: str,
        model: str = SOLE_MODEL,
        effort: str = "high",
        output_format: str = "json",
        disable_slash_commands: bool = True,
        print_timeout_sec: int = 180,
        allow_dangerous_permissions_flag: bool = False,
    ) -> List[str]:
        if model != self.SOLE_MODEL:
            raise DirectiveZeroViolationError(
                f"Directive 0 violation: requested model '{model}', but sole authorized model is '{self.SOLE_MODEL}'"
            )
        if effort != "high":
            raise DirectiveZeroViolationError(
                f"Directive 0 violation: requested effort '{effort}', but '{self.SOLE_MODEL}' requires effort='high'"
            )

        cmd: List[str] = [
            str(self.agy_path),
            "--model",
            self.SOLE_MODEL,
            "--effort",
            "high",
            "--output-format",
            output_format,
            "--print-timeout",
            f"{int(print_timeout_sec)}s",
        ]
        if disable_slash_commands:
            cmd.append("--disable-slash-commands")
        if allow_dangerous_permissions_flag:
            cmd.append("--dangerously-skip-permissions")
        cmd.extend(["-p", prompt])
        return cmd

    def invoke(
        self,
        *,
        task_id: str,
        prompt: str,
        agent_id: str = "model_specialist",
        effort: str = "high",
        is_benchmark_or_single_shot: bool = True,
        requested_cwd: Optional[str | Path] = None,
        wall_timeout_sec: float = 180.0,
        idle_timeout_sec: float = 90.0,
        campaign_id: Optional[str] = None,
        child_task_id: Optional[str] = None,
        tier: str = "BENCHMARK_ITEM",
    ) -> Dict[str, Any]:
        """Invokes `agy.exe` under resource, token, and process supervision."""
        est_tokens = max(250, len(prompt) // 4 + 500)
        self.token_controller.check_pre_call_admission(
            task_id=task_id,
            estimated_tokens=est_tokens,
            child_task_id=child_task_id,
            campaign_id=campaign_id,
            tier=tier,
        )

        exec_cwd = self.token_controller.get_execution_cwd(
            is_benchmark_or_single_shot=is_benchmark_or_single_shot,
            requested_cwd=requested_cwd,
        )

        cmd = self.build_command(
            prompt=prompt,
            model=self.SOLE_MODEL,
            effort=effort,
            output_format="json",
            disable_slash_commands=True,
            print_timeout_sec=int(wall_timeout_sec),
            allow_dangerous_permissions_flag=False,
        )

        slot = self.governor.acquire_slot(queue_type="model_call")
        try:
            notif = self.supervisor.run_supervised(
                task_id=task_id,
                command=cmd,
                cwd=exec_cwd,
                wall_timeout_sec=wall_timeout_sec,
                idle_timeout_sec=idle_timeout_sec,
                max_retries=0,
            )
        finally:
            self.governor.release_slot(queue_type="model_call")

        if notif.timed_out or notif.idle_timed_out:
            self.governor.report_timeout_or_quota_pressure()

        full_stdout = ""
        try:
            full_stdout = Path(notif.stdout_log_path).read_text(encoding="utf-8", errors="replace").strip()
        except Exception:
            full_stdout = "\n".join(notif.stdout_tail).strip()

        parsed_response: Dict[str, Any] = {}
        response_text = full_stdout
        provider_usage: Optional[Dict[str, Any]] = notif.usage_metadata or None

        if full_stdout:
            # Try parsing last JSON object in stdout
            for candidate_line in reversed([ln.strip() for ln in full_stdout.splitlines() if ln.strip()]):
                if candidate_line.startswith("{") and candidate_line.endswith("}"):
                    try:
                        obj = json.loads(candidate_line)
                        if isinstance(obj, dict):
                            parsed_response = obj
                            response_text = str(obj.get("result") or obj.get("response") or obj.get("text") or full_stdout)
                            if isinstance(obj.get("usage"), dict):
                                provider_usage = obj["usage"]
                            break
                    except Exception:
                        pass
            if not parsed_response and full_stdout.startswith("{"):
                try:
                    obj = json.loads(full_stdout)
                    if isinstance(obj, dict):
                        parsed_response = obj
                        response_text = str(obj.get("result") or obj.get("response") or obj.get("text") or full_stdout)
                        if isinstance(obj.get("usage"), dict):
                            provider_usage = obj["usage"]
                except Exception:
                    pass

        usage_rec = self.token_controller.record_usage(
            task_id=task_id,
            child_task_id=child_task_id,
            campaign_id=campaign_id,
            agent_id=agent_id,
            model=self.SOLE_MODEL,
            effort_level=effort,
            provider_usage=provider_usage,
            prompt_text=prompt,
            response_text=response_text,
            cwd_used=exec_cwd,
        )

        return {
            "task_id": task_id,
            "status": notif.final_status,
            "exit_code": notif.exit_code,
            "timed_out": notif.timed_out or notif.idle_timed_out,
            "duration_sec": notif.duration_sec,
            "cwd_used": exec_cwd,
            "isolated_cwd_enforced": usage_rec.isolated_cwd_enforced,
            "response_text": response_text,
            "parsed_json": parsed_response,
            "token_usage": {
                "accounting_mode": usage_rec.accounting_mode,
                "input_tokens": usage_rec.input_tokens,
                "output_tokens": usage_rec.output_tokens,
                "thinking_tokens": usage_rec.thinking_tokens,
                "total_tokens": usage_rec.total_tokens,
            },
            "notification_id": notif.notification_id,
        }
