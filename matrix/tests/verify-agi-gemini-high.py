"""
matrix/tests/verify-agi-gemini-high.py
Deterministic live verification for AGI 0.7 powered by gemini-3.8-flash-high.
"""
import sys
import json
import os
from matrix.eval.gemini_high_provider import call_gemini_38_flash_high

def test_agi_live_invocation():
    print("[AGI 0.7] Executing live model reasoning test via gemini-3.8-flash-high...")
    prompt = "Compute 37 * 43. Output ONLY the numerical answer."
    result = call_gemini_38_flash_high(prompt, timeout_seconds=60)
    
    print(f"Success: {result['success']}")
    print(f"Model: {result['model']}")
    print(f"Latency: {result['latency_ms']} ms")
    print(f"Tokens: {result['tokens']}")
    print(f"Thinking Tokens: {result['thinking_tokens']}")
    print(f"Raw Response: {result['response']}")
    
    assert result['success'] is True, f"Model call failed: {result.get('error')}"
    assert result['model'] == "gemini-3.8-flash-high", "Wrong model identifier"
    assert "1591" in str(result['response']), f"Expected 1591 in response, got: {result['response']}"
    
    # Save verification proof
    proof = {
        "agent": "AGI 0.7",
        "model": result['model'],
        "prompt": prompt,
        "expected": "1591",
        "actual": str(result['response']).strip(),
        "tokens": result['tokens'],
        "thinking_tokens": result['thinking_tokens'],
        "latency_ms": result['latency_ms'],
        "verified": True
    }
    os.makedirs("agi/evidence", exist_ok=True)
    with open("agi/evidence/live_model_proof.json", "w", encoding="utf-8") as f:
        json.dump(proof, f, indent=2)
        
    print("[PASS] AGI 0.7 live model invocation verified cleanly. Non-verbal proof saved to agi/evidence/live_model_proof.json")

if __name__ == "__main__":
    test_agi_live_invocation()
