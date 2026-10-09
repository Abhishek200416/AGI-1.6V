"""
matrix/eval/gemini_high_provider.py
Sole foundation model provider for MATRIX X1.2: gemini-3.8-flash-high via Antigravity CLI (agy.exe)
Enforces Directive 0 (zero silent fallback, calibrated timeouts, token extraction).
"""

import os
import sys
import json
import time
import subprocess
from typing import Dict, Any, Optional

AGY_PATH = os.path.expandvars(r"%LOCALAPPDATA%\agy\bin\agy.exe")
if not os.path.exists(AGY_PATH):
    AGY_PATH = "agy.exe"

MODEL_IDENTIFIER = "gemini-3.8-flash-high"


def call_gemini_38_flash_high(
    prompt: str,
    timeout_seconds: int = 120
) -> Dict[str, Any]:
    """
    Invokes gemini-3.8-flash-high strictly via agy.exe.
    Returns structured result containing response, tokens, thinking tokens, latency, status.
    """
    start_time = time.time()
    
    args = [
        AGY_PATH,
        "--model", MODEL_IDENTIFIER,
        "--disable-slash-commands",
        "--print", prompt,
        "--output-format", "json"
    ]
    
    try:
        proc = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            shell=False
        )
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        if proc.returncode != 0:
            return {
                "success": False,
                "error": f"agy exited with code {proc.returncode}: {proc.stderr.strip()}",
                "model": MODEL_IDENTIFIER,
                "latency_ms": elapsed_ms,
                "tokens": 0,
                "thinking_tokens": 0,
                "response": None
            }
            
        data = json.loads(proc.stdout)
        status = data.get("status", "UNKNOWN")
        response_text = data.get("response", "")
        usage = data.get("usage", {})
        
        return {
            "success": status == "SUCCESS",
            "model": MODEL_IDENTIFIER,
            "status": status,
            "response": response_text.strip() if response_text else "",
            "tokens": usage.get("total_tokens", 0),
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "thinking_tokens": usage.get("thinking_tokens", 0),
            "latency_ms": elapsed_ms,
            "conversation_id": data.get("conversation_id")
        }
        
    except subprocess.TimeoutExpired:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "error": f"Timeout expired after {timeout_seconds}s",
            "model": MODEL_IDENTIFIER,
            "latency_ms": elapsed_ms,
            "tokens": 0,
            "thinking_tokens": 0,
            "response": None
        }
    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "error": str(e),
            "model": MODEL_IDENTIFIER,
            "latency_ms": elapsed_ms,
            "tokens": 0,
            "thinking_tokens": 0,
            "response": None
        }


if __name__ == "__main__":
    print("Testing gemini-3.8-flash-high provider connection...")
    res = call_gemini_38_flash_high("What is 19 * 23? Output only the number.", timeout_seconds=60)
    print("Result:", json.dumps(res, indent=2))
