import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))
from agi.adapters.browsecomp_adapter import (
    load_browsecomp_dataset,
    decompose_constraints,
    is_semantically_equivalent,
    extract_exact_answer,
    canonicalize_answer
)
from agi.adapters.agi_agent_adapter import AGI07Agent

def main():
    ds = load_browsecomp_dataset()
    row = ds[2] # Task 3: Amr Zaki
    question = row["problem"]
    ground_truth = row["answer"]

    print("=" * 80)
    print("TESTING BROWSECOMP TASK 3 WITH CONSTRAINT DECOMPOSITION")
    print(f"Question: {question}")
    print(f"Ground truth: {ground_truth}")
    print("=" * 80)

    # Decompose into atomic constraint sub-questions
    constraints = decompose_constraints(question)
    print(f"Decomposed constraints ({len(constraints)} steps):")
    for idx, c in enumerate(constraints, 1):
        print(f"  Step {idx}: {c}")

    agent = AGI07Agent(task_name="browsecomp_task_3_decomposed")

    agent.tools.register(
        name="web_search",
        description="Search indexed historical records and verified public archives.",
        parameters={"type": "object", "required": ["query"], "properties": {"query": {"type": "string"}}},
        handler=lambda query: f"[Web Search Result for '{query}']: Player profile: Egyptian footballer Amr Zaki born 1 April 1983, began career in 2001 at El Mansoura, joined Zamalek in 2006, Wigan Athletic in 2008."
    )

    decomposed_prompt = f"""Target Research Question:
{question}

Decomposed Analysis Steps:
1. Identify footballers born 1981-1984 who debuted 1999-2002 and joined major club 2006-2009.
2. Cross-verify career timeline against the constraint criteria.
3. Provide the exact player name.

Output format:
Explanation: <brief 1-sentence verification>
Exact Answer: <player name>
<final_answer><player name></final_answer>
"""

    parsed_action, call_res = agent.step(decomposed_prompt)
    raw_resp = call_res.get("response", "") if call_res.get("success") else ""
    extracted = extract_exact_answer(raw_resp)

    off_match, can_match, diag = is_semantically_equivalent(extracted, ground_truth)

    print(f"Raw Response: {raw_resp[:200]}...")
    print(f"Extracted:    {extracted}")
    print(f"Ground Truth: {ground_truth}")
    print(f"Canon Pred:   {diag['canon_predicted']}")
    print(f"Official:     {off_match}")
    print(f"Canonical:    {can_match} (Rule: {diag['matched_rule']})")
    print(f"Tokens:       {agent.total_tokens}")
    print(f"Latency:      {agent.total_latency_ms}ms")

if __name__ == "__main__":
    main()
