"""
AGI 1.6 OMEGA NEXUS — Official OSWorld-V2.1 Computer-Use Benchmark Adapter
==========================================================================
Binds AGI 1.6 (`AGI16OmegaNexusAgent`, `AdaptiveTokenEconomy`, `ComputerUseAdapter`,
and `call_model_gemini_38_flash_high` via `agy.exe`) to the official OSWorld-V2.1
`agent.reset(runtime_logger)` and `agent.predict(instruction, obs)` interface.

Directive 0 & Host Desktop Safety Invariants:
- Sole Foundation Model: `gemini-3.8-flash-high` via verified `agy.exe` runtime.
- Zero silent fallbacks to other models or providers.
- Zero host physical desktop GUI injections (`isolated_sandbox=True` enforced).
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..orchestration.adaptive_token_economy import AdaptiveTokenEconomy
from .agi_16_adapter import AGI16OmegaNexusAgent
from .agi_agent_adapter import MODEL_IDENTIFIER, call_model_gemini_38_flash_high
from .computer_use_adapter import ComputerUseAdapter

logger = logging.getLogger("desktopenv.agi16_osworld_adapter")


class AGI16OSWorldAgent:
    """
    Official OSWorld-V2.1 Agent Adapter for AGI 1.6 — OMEGA NEXUS.
    """

    def __init__(
        self,
        model: str = MODEL_IDENTIFIER,
        action_space: str = "pyautogui",
        observation_type: str = "screenshot",
        max_trajectory_length: int = 5,
        screen_width: int = 1920,
        screen_height: int = 1080,
        client_password: str = "osworld-public-evaluation",
        staging_dir: str = r"D:\AGI_Evaluation\AGI_1_6_OMEGA_NEXUS\osworld_step_buffers",
        timeout_seconds: int = 180,
    ) -> None:
        if model != MODEL_IDENTIFIER:
            raise ValueError(
                f"Directive 0 Violation: AGI 1.6 OSWorld Adapter strictly requires "
                f"model='{MODEL_IDENTIFIER}', got '{model}'."
            )
        self.model = MODEL_IDENTIFIER
        self.action_space = action_space
        self.observation_type = observation_type
        self.max_trajectory_length = max_trajectory_length
        self.screen_width = int(screen_width)
        self.screen_height = int(screen_height)
        self.client_password = client_password
        self.timeout_seconds = int(timeout_seconds)
        self.task_current_date: Optional[str] = None

        self.staging_dir = Path(staging_dir)
        self.staging_dir.mkdir(parents=True, exist_ok=True)

        # Real AGI 1.6 Core Engine Components
        self.omega_agent = AGI16OmegaNexusAgent()
        self.token_economy = AdaptiveTokenEconomy()
        self.computer_use = ComputerUseAdapter(isolated_sandbox=True)

        self.runtime_logger = logger
        self.thoughts: List[str] = []
        self.actions: List[List[str]] = []
        self.observations: List[Dict[str, Any]] = []
        self.step_telemetry: List[Dict[str, Any]] = []
        self.step_counter: int = 0

    def reset(self, runtime_logger: Optional[logging.Logger] = None) -> None:
        """Reset agent state between OSWorld tasks or phases."""
        if runtime_logger is not None:
            self.runtime_logger = runtime_logger
        self.thoughts = []
        self.actions = []
        self.observations = []
        self.step_telemetry = []
        self.step_counter = 0

    @staticmethod
    def _inspect_png_dimensions(png_bytes: bytes) -> Tuple[Optional[int], Optional[int]]:
        """Extract width and height from PNG IHDR chunk using stdlib."""
        if len(png_bytes) >= 24 and png_bytes[:8] == b"\x89PNG\r\n\x1a\n":
            width = int.from_bytes(png_bytes[16:20], "big")
            height = int.from_bytes(png_bytes[20:24], "big")
            return width, height
        return None, None

    def _convert_structured_action_to_pyautogui(self, act: Dict[str, Any]) -> Optional[str]:
        """
        Validate action through AGI 1.6 ComputerUseAdapter (isolated_sandbox=True)
        and translate to OSWorld's supported `pyautogui` string contract.
        """
        action_type = str(act.get("action_type", "")).strip().upper()
        x = act.get("x")
        y = act.get("y")

        # Clamp coordinates to screen bounds if provided
        if isinstance(x, (int, float)):
            x = max(0, min(self.screen_width - 1, int(round(x))))
        if isinstance(y, (int, float)):
            y = max(0, min(self.screen_height - 1, int(round(y))))

        if action_type in {"DONE", "FAIL", "WAIT"}:
            return action_type

        if action_type == "ASK_USER":
            return "ASK_USER"

        # Record & validate in AGI 1.6 ComputerUseAdapter (enforces isolated_sandbox=True)
        gui_check = self.computer_use.execute_action(
            action_type=action_type.lower(),
            coordinates=(x or 0, y or 0),
            text=str(act.get("text", "")),
            key=str(act.get("key", "")),
        )
        if gui_check.get("status") != "SUCCESS":
            raise RuntimeError(f"Sandbox isolation check failed: {gui_check}")

        if action_type == "CLICK":
            button = str(act.get("button", "left")).lower()
            if button not in {"left", "right", "middle"}:
                button = "left"
            if x is not None and y is not None:
                return f"pyautogui.click(x={x}, y={y}, button={button!r})"
            return f"pyautogui.click(button={button!r})"

        if action_type == "DOUBLE_CLICK":
            if x is not None and y is not None:
                return f"pyautogui.doubleClick(x={x}, y={y})"
            return "pyautogui.doubleClick()"

        if action_type == "RIGHT_CLICK":
            if x is not None and y is not None:
                return f"pyautogui.rightClick(x={x}, y={y})"
            return "pyautogui.rightClick()"

        if action_type == "MOVE_TO":
            if x is not None and y is not None:
                return f"pyautogui.moveTo(x={x}, y={y})"
            return None

        if action_type == "DRAG_TO":
            duration = float(act.get("duration", 0.5))
            if x is not None and y is not None:
                return f"pyautogui.dragTo(x={x}, y={y}, duration={duration}, button='left')"
            return None

        if action_type == "SCROLL":
            clicks = int(act.get("clicks", -3))
            if x is not None and y is not None:
                return f"pyautogui.scroll({clicks}, x={x}, y={y})"
            return f"pyautogui.scroll({clicks})"

        if action_type == "TYPING":
            text = str(act.get("text", ""))
            press_enter = bool(act.get("press_enter", False))
            cmd = f"pyautogui.write({text!r}, interval=0.02)"
            if press_enter:
                cmd += "; pyautogui.press('enter')"
            return cmd

        if action_type == "PRESS_KEY":
            key = str(act.get("key", "enter")).lower()
            return f"pyautogui.press({key!r})"

        if action_type == "HOTKEY":
            keys = act.get("keys", [])
            if isinstance(keys, list) and keys:
                formatted_keys = ", ".join(repr(str(k).lower()) for k in keys)
                return f"pyautogui.hotkey({formatted_keys})"
            return None

        if action_type == "RAW_PYAUTOGUI":
            command = str(act.get("command", "")).strip()
            if command.startswith("pyautogui."):
                return command

        return None

    def _build_prompt(
        self,
        instruction: str,
        screenshot_path: Optional[Path],
        screenshot_sha256: Optional[str],
        img_size: Tuple[Optional[int], Optional[int]],
        accessibility_tree: Optional[str],
        terminal_output: Optional[str],
        user_response: Optional[str],
    ) -> str:
        recent_history = []
        start_idx = max(0, len(self.actions) - self.max_trajectory_length)
        for idx in range(start_idx, len(self.actions)):
            thought_str = self.thoughts[idx] if idx < len(self.thoughts) else ""
            act_list = self.actions[idx]
            recent_history.append(
                f"Step {idx + 1}: thought={thought_str!r} | actions={act_list!r}"
            )
        history_block = "\n".join(recent_history) if recent_history else "None (Step 1)"

        a11y_snippet = ""
        if accessibility_tree:
            a11y_snippet = f"\nACCESSIBILITY TREE (TRUNCATED):\n{str(accessibility_tree)[:6000]}\n"

        term_snippet = ""
        if terminal_output:
            term_snippet = f"\nTERMINAL OUTPUT:\n{str(terminal_output)[:2000]}\n"

        user_resp_snippet = ""
        if user_response:
            user_resp_snippet = f"\nUSER SIMULATOR RESPONSE:\n{user_response}\n"

        date_snippet = f"\nTASK CURRENT DATE: {self.task_current_date}" if self.task_current_date else ""

        return (
            "You are AGI 1.6 — OMEGA NEXUS executing an official OSWorld-V2.1 Ubuntu desktop computer-use task.\n"
            f"Screen Resolution: {self.screen_width}x{self.screen_height} (Observed PNG: {img_size[0]}x{img_size[1]})\n"
            f"Guest sudo password (if needed): {self.client_password}\n"
            f"Current Step: {self.step_counter}{date_snippet}\n"
            f"Saved Screenshot File Path: {screenshot_path if screenshot_path else 'None'} (SHA-256: {screenshot_sha256})\n\n"
            f"TASK INSTRUCTION:\n{instruction}\n\n"
            f"RECENT ACTION HISTORY:\n{history_block}\n"
            f"{a11y_snippet}{term_snippet}{user_resp_snippet}\n"
            "Respond ONLY with a valid JSON object (no markdown fences outside JSON) with this exact schema:\n"
            "{\n"
            '  "thought": "Concise reasoning about the current desktop screen state and next step",\n'
            '  "question_for_user": null,\n'
            '  "actions": [\n'
            "    {\n"
            '      "action_type": "CLICK | DOUBLE_CLICK | RIGHT_CLICK | MOVE_TO | DRAG_TO | SCROLL | TYPING | PRESS_KEY | HOTKEY | WAIT | DONE | FAIL",\n'
            '      "x": 960,\n'
            '      "y": 540,\n'
            '      "button": "left",\n'
            '      "text": "optional text to type",\n'
            '      "press_enter": false,\n'
            '      "key": "enter",\n'
            '      "keys": ["ctrl", "s"],\n'
            '      "clicks": -3\n'
            "    }\n"
            "  ]\n"
            "}\n"
        )

    @staticmethod
    def _parse_model_json(raw_text: str) -> Dict[str, Any]:
        cleaned = raw_text.strip()
        fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, flags=re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1)
        else:
            brace_start = cleaned.find("{")
            brace_end = cleaned.rfind("}")
            if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
                cleaned = cleaned[brace_start : brace_end + 1]
        return json.loads(cleaned)

    def predict(
        self,
        instruction: str,
        obs: Dict[str, Any],
    ) -> Tuple[str, List[str]]:
        """
        Predict the next desktop action(s) given the natural-language task instruction
        and the current OSWorld environment observation dict.
        """
        self.step_counter += 1
        t0 = time.perf_counter()

        screenshot_bytes = obs.get("screenshot", b"")
        screenshot_path: Optional[Path] = None
        screenshot_sha256: Optional[str] = None
        img_size: Tuple[Optional[int], Optional[int]] = (None, None)

        if isinstance(screenshot_bytes, (bytes, bytearray)) and len(screenshot_bytes) > 0:
            screenshot_sha256 = hashlib.sha256(screenshot_bytes).hexdigest()
            img_size = self._inspect_png_dimensions(bytes(screenshot_bytes))
            screenshot_path = self.staging_dir / f"step_{self.step_counter:03d}_{screenshot_sha256[:12]}.png"
            screenshot_path.write_bytes(bytes(screenshot_bytes))

        budget = self.token_economy.initialize_task_budget(
            task_id=f"osworld_step_{self.step_counter}",
            prompt=instruction,
        )
        prompt = self._build_prompt(
            instruction=instruction,
            screenshot_path=screenshot_path,
            screenshot_sha256=screenshot_sha256,
            img_size=img_size,
            accessibility_tree=obs.get("accessibility_tree"),
            terminal_output=obs.get("terminal"),
            user_response=obs.get("user_response"),
        )

        model_call = call_model_gemini_38_flash_high(
            prompt,
            timeout_seconds=self.timeout_seconds,
        )

        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        response_text = str(model_call.get("response", "")).strip()
        total_tokens = int(model_call.get("tokens", 0) or 0)
        thinking_tokens = int(model_call.get("thinking_tokens", 0) or 0)

        pyautogui_actions: List[str] = []
        thought = ""

        if model_call.get("success") and response_text:
            try:
                parsed = self._parse_model_json(response_text)
                thought = str(parsed.get("thought", "")).strip()
                question_for_user = parsed.get("question_for_user")
                raw_actions = parsed.get("actions", [])

                if question_for_user and not raw_actions:
                    # OSWorld convention: empty actions list triggers user_simulator with response_text
                    response_text = str(question_for_user)
                    pyautogui_actions = []
                elif isinstance(raw_actions, list):
                    for act in raw_actions:
                        if isinstance(act, dict):
                            converted = self._convert_structured_action_to_pyautogui(act)
                            if converted == "ASK_USER":
                                response_text = str(act.get("text") or thought or instruction)
                                pyautogui_actions = []
                                break
                            elif converted:
                                pyautogui_actions.append(converted)
            except Exception as exc:
                self.runtime_logger.warning("Failed to parse AGI 1.6 JSON output at step %d: %s", self.step_counter, exc)
                thought = f"JSON parse fallback at step {self.step_counter}: {exc}"
                pyautogui_actions = ["WAIT"]
        else:
            err = model_call.get("error", "Unknown model error")
            self.runtime_logger.error("AGI 1.6 model call failed at step %d: %s", self.step_counter, err)
            thought = f"Model call error: {err}"
            pyautogui_actions = ["WAIT"]

        self.thoughts.append(thought or response_text)
        self.actions.append(pyautogui_actions)
        self.observations.append(
            {
                "step": self.step_counter,
                "screenshot_sha256": screenshot_sha256,
                "screenshot_path": str(screenshot_path) if screenshot_path else None,
                "image_dimensions": img_size,
            }
        )
        self.step_telemetry.append(
            {
                "step": self.step_counter,
                "model": self.model,
                "budget_category": budget.get("category"),
                "status": "SUCCESS" if model_call.get("success") else "ERROR",
                "latency_ms": elapsed_ms,
                "usage": {
                    "total_tokens": total_tokens,
                    "thinking_tokens": thinking_tokens,
                },
                "thought": thought,
                "pyautogui_actions": pyautogui_actions,
                "screenshot_sha256": screenshot_sha256,
                "host_desktop_injections": 0,
            }
        )

        return (thought or response_text), pyautogui_actions
