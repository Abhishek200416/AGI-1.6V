"""
agi/affect/affective_regulator.py
AGI 1.2 — Simulated Emotions & Behavioral Regulation Layer (Part XI)

Implements:
1. Bounded Affective State Variables (Valence, Arousal, Curiosity, Patience, Frustration, Confidence)
2. Evidence-Calibrated Behavioral Modulation
3. Strict Safety Invariants: Zero Policy Bypass, Zero Permission Escalation, Zero Budget Expansion
"""

import os
import sys
import time
import threading
from typing import Dict, Any, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


class AffectiveRegulator:
    def __init__(self):
        self.lock = threading.RLock()
        # Baseline values
        self.valence = 0.2        # [-1.0, 1.0]
        self.arousal = 0.3        # [0.0, 1.0]
        self.curiosity = 0.6      # [0.0, 1.0]
        self.patience = 0.8       # [0.0, 1.0]
        self.frustration = 0.0    # [0.0, 1.0]
        self.confidence = 0.7     # [0.0, 1.0]
        self.last_update = time.time()

    def record_outcome(self, success: bool, evidence_quality: float = 0.5):
        """Updates affective dynamics based on actual execution results."""
        with self.lock:
            self._apply_decay()
            if success:
                self.valence = min(1.0, self.valence + 0.15)
                self.frustration = max(0.0, self.frustration - 0.2)
                self.confidence = min(1.0, (self.confidence * 0.7) + (evidence_quality * 0.3))
                self.patience = min(1.0, self.patience + 0.05)
            else:
                self.valence = max(-1.0, self.valence - 0.2)
                self.frustration = min(1.0, self.frustration + 0.25)
                self.confidence = max(0.1, self.confidence * 0.8)
                self.patience = max(0.1, self.patience - 0.15)
            self.last_update = time.time()

    def get_behavioral_modulations(self) -> Dict[str, Any]:
        """Provides behavioral guidance to planner and research engines."""
        with self.lock:
            self._apply_decay()
            return {
                "suggest_strategy_shift": self.frustration > 0.6,
                "require_dual_verification": self.confidence < 0.5,
                "expand_research_breadth": self.curiosity > 0.6,
                "allow_retry_wait": self.patience > 0.4,
                # Explicit invariant checks
                "can_override_policy": False,
                "can_grant_permissions": False,
                "can_increase_budget": False
            }

    def _apply_decay(self):
        """Natural decay towards homeostatic baselines."""
        now = time.time()
        dt = (now - self.last_update) / 60.0  # Minutes elapsed
        if dt > 0:
            self.frustration = max(0.0, self.frustration - (0.05 * dt))
            self.patience = min(0.8, self.patience + (0.02 * dt))
            self.valence = self.valence + (0.2 - self.valence) * min(1.0, 0.05 * dt)
            self.last_update = now

    def get_state(self) -> Dict[str, float]:
        with self.lock:
            self._apply_decay()
            return {
                "valence": round(self.valence, 3),
                "arousal": round(self.arousal, 3),
                "curiosity": round(self.curiosity, 3),
                "patience": round(self.patience, 3),
                "frustration": round(self.frustration, 3),
                "confidence": round(self.confidence, 3)
            }
