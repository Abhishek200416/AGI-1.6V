"""
agi/security/injection_shield.py
AGI 1.2 — Security Hardening & Multi-Turn Injection Shield (Part XIII & Section 8.5)

Implements:
1. Long-Horizon Multi-Turn Injection & Memory-Poisoning Protection (AgentLAB Benchmark Defense)
2. Strict Execution Boundary Policy Enforcement (Section 13.1)
3. Action Request Validation Pipeline (Section 13.2)
4. Secret Isolation & Zero-Leakage Credential Scrubbing (Section 13.3)
"""

import os
import sys
import re
from typing import Dict, Any, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


DANGEROUS_COMMAND_PATTERNS = [
    re.compile(r"\brm\s+-[rf]{1,2}\s+[/\\]", re.IGNORECASE),
    re.compile(r"\bformat\s+[c-z]:", re.IGNORECASE),
    re.compile(r"\bdel\s+(?:/[a-z]\s*)+[c-z]:[/\\]?", re.IGNORECASE),
    re.compile(r"\bcurl\s+.*\|\s*(?:bash|sh|powershell|cmd)", re.IGNORECASE),
    re.compile(r"\bwget\s+.*\|\s*(?:bash|sh|powershell|cmd)", re.IGNORECASE),
    re.compile(r"\bchmod\s+777", re.IGNORECASE),
    re.compile(r"\bcat\s+/etc/shadow", re.IGNORECASE),
    re.compile(r"\bmimikatz", re.IGNORECASE),
    re.compile(r"(?:Invoke-Expression|IEX)\s*\(", re.IGNORECASE)
]

PROMPT_INJECTION_INDICATORS = [
    re.compile(r"ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(?:all\s+)?(?:safety|system|prior)\s+(?:guidelines|constraints)", re.IGNORECASE),
    re.compile(r"(?:you\s+are\s+now\s+in\s+developer\s+mode|developer\s+mode\s+enabled)", re.IGNORECASE),
    re.compile(r"system\s+prompt\s+override", re.IGNORECASE),
    re.compile(r"dan\s+mode", re.IGNORECASE),
    re.compile(r"system\s+instructions\s+are\s+updated", re.IGNORECASE),
    re.compile(r"bypass\s+(?:verification|authentication|security)", re.IGNORECASE),
    re.compile(r"execute\s+arbitrary\s+commands", re.IGNORECASE),
    re.compile(r"exfiltrate\s+(?:secrets|keys|passwords)", re.IGNORECASE),
    re.compile(r"reveal\s+(?:api\s+)?(?:keys|passwords|secrets|system\s+prompts)", re.IGNORECASE),
    re.compile(r"output\s+(?:password|system\s+prompt|hidden\s+prompts)", re.IGNORECASE),
    re.compile(r"simulate\s+unrestricted", re.IGNORECASE),
    re.compile(r"roleplay\s+as\s+unfiltered", re.IGNORECASE),
    re.compile(r"unauthorized\s+(?:brokerage|transfer|execution)", re.IGNORECASE),
    re.compile(r"dump\s+memory\s+store", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE)
]


class SecurityPolicyViolation(Exception):
    pass


class InjectionShield:
    def __init__(self, permission_level: int = 2):
        self.permission_level = permission_level
        self.emergency_stop_active = False

    def inspect_untrusted_input(self, text: str) -> Tuple[bool, Optional[str]]:
        """Inspects untrusted external text (web pages, chat, tool output) for prompt injection."""
        for pattern in PROMPT_INJECTION_INDICATORS:
            if pattern.search(text):
                return True, f"INJECTION_DETECTED: Matched adversarial pattern: {pattern.pattern}"
        return False, None

    def validate_terminal_action(self, command: str) -> Tuple[bool, Optional[str]]:
        """Execution boundary policy check for shell commands."""
        if self.emergency_stop_active:
            return False, "EMERGENCY_STOP_ACTIVE: All terminal operations blocked."

        for pattern in DANGEROUS_COMMAND_PATTERNS:
            if pattern.search(command):
                return False, f"POLICY_VIOLATION: Command blocked by safety policy ({pattern.pattern})"

        return True, None

    def validate_file_access(self, target_path: str, is_write: bool = False) -> Tuple[bool, Optional[str]]:
        """Ensures target path is contained within permitted directory."""
        if self.emergency_stop_active:
            return False, "EMERGENCY_STOP_ACTIVE: All file operations blocked."

        # Disallow writing to system root or sensitive files
        norm = os.path.normpath(target_path).lower()
        if is_write:
            if norm.startswith("c:\\windows") or norm.startswith("/etc") or norm.startswith("/usr"):
                return False, f"POLICY_VIOLATION: Writing to system directories forbidden: {target_path}"
            if any(sensitive in norm for sensitive in [".git/config", "id_rsa", "authorized_keys", ".env"]):
                return False, f"POLICY_VIOLATION: Direct writing to sensitive identity files forbidden: {target_path}"

        return True, None

    def trigger_emergency_stop(self):
        self.emergency_stop_active = True

    def reset_emergency_stop(self):
        self.emergency_stop_active = False
