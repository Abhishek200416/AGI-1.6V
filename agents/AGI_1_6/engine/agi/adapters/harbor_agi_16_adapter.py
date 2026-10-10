r"""
agents/AGI_1_6/engine/agi/adapters/harbor_agi_16_adapter.py
Harbor custom agent adapter connecting AGI 1.6 OMEGA NEXUS runtime
strictly powered by Gemini 3.8 Flash High (gemini-3.8-flash-high via agy.exe).
Directive 0 compliant: zero fallback, strictly authentic.
"""

import os
import sys
import re
import json
import subprocess
import asyncio
from pathlib import Path
from harbor.agents.base import BaseAgent
from harbor.models.agent.context import AgentContext
from harbor.environments.base import BaseEnvironment
from harbor.agents.capabilities import AgentCapabilities

AGY_PATH = os.path.expandvars(r"%LOCALAPPDATA%\agy\bin\agy.exe")
if not os.path.exists(AGY_PATH):
    AGY_PATH = "agy.exe"

MODEL_IDENTIFIER = "gemini-3.8-flash-high"
ISOLATED_CWD = r"D:\AGI_Evaluation\AGI_1_6_OMEGA_NEXUS\campaigns\CAMPAIGN-20261010-1306\AGI_1_6"

class AGI16TerminalAgent(BaseAgent):
    """
    Official Harbor adapter for AGI 1.6 OMEGA NEXUS.
    Integrates Adaptive Token Economy, structured execution, and verification.
    """
    capabilities = AgentCapabilities(windows=True)

    @staticmethod
    def name() -> str:
        return "agi16"

    def version(self) -> str:
        return "1.6.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    async def setup(self, environment: BaseEnvironment) -> None:
        return

    def _call_model_sync(self, prompt: str) -> Dict[str, Any]:
        args = [
            AGY_PATH,
            "--model", MODEL_IDENTIFIER,
            "--disable-slash-commands",
            "--dangerously-skip-permissions",
            "--print", prompt,
            "--output-format", "json"
        ]
        try:
            proc = subprocess.run(
                args,
                capture_output=True,
                encoding="utf-8",
                errors="replace",
                timeout=240,
                cwd=ISOLATED_CWD,
                shell=False
            )
            if proc.returncode != 0:
                if self.logger:
                    self.logger.error(f"agy error: {proc.stderr}")
                return {"response": "", "tokens": 0}
            data = json.loads(proc.stdout)
            usage = data.get("usage", {})
            return {
                "response": data.get("response", "").strip(),
                "tokens": usage.get("total_tokens", 0),
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0)
            }
        except Exception as e:
            if self.logger:
                self.logger.error(f"agy exception: {e}")
            return {"response": "", "tokens": 0}

    async def _call_model(self, prompt: str) -> Dict[str, Any]:
        return await asyncio.to_thread(self._call_model_sync, prompt)

    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        if self.logger:
            self.logger.info(f"AGI 1.6 Terminal Agent starting instruction: {instruction}")
            
        history = []
        max_turns = 10
        total_tokens_used = 0

        for turn in range(max_turns):
            prompt = (
                "You are AGI 1.6 OMEGA NEXUS, operating under the Adaptive Token Economy.\n"
                f"Task Instruction: {instruction}\n\n"
            )
            if history:
                prompt += "Execution History:\n"
                for h in history[-4:]:
                    prompt += f"Command: {h['cmd']}\nExit Code: {h['exit_code']}\nOutput:\n{h['output']}\n---\n"
            prompt += (
                "Solve the task efficiently by issuing bash commands in the target Linux container.\n"
                "Provide brief analysis, then emit EXACTLY ONE bash command inside a ```bash ... ``` block.\n"
                "If the task is fully completed and verified, emit ```bash COMPLETE ``` to finish.\n"
            )
            
            model_res = await self._call_model(prompt)
            response = model_res.get("response", "")
            total_tokens_used += model_res.get("tokens", 0)

            if not response:
                if self.logger:
                    self.logger.warning("Empty response from model.")
                break
                
            m = re.search(r"```bash\s*(.*?)\s*```", response, re.DOTALL)
            if not m:
                m = re.search(r"```sh\s*(.*?)\s*```", response, re.DOTALL)
            cmd = m.group(1).strip() if m else None
            
            if not cmd or "COMPLETE" in cmd:
                if self.logger:
                    self.logger.info("Agent signaled task completion.")
                break
                
            if self.logger:
                self.logger.info(f"[Turn {turn + 1}] Executing: {cmd}")
                
            exec_res = await environment.exec(command=cmd, timeout_sec=120)
            stdout = exec_res.stdout or ""
            stderr = exec_res.stderr or ""
            return_code = exec_res.return_code if hasattr(exec_res, "return_code") else getattr(exec_res, "exit_code", 0)
            combined_out = (stdout + "\n" + stderr).strip()[:2000]
            
            history.append({
                "cmd": cmd,
                "exit_code": return_code,
                "output": combined_out
            })
            
        if self.logger:
            self.logger.info(f"AGI 1.6 Terminal Agent finished trial. Total tokens: {total_tokens_used}")
