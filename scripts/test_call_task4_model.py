import os, sys, json, time
sys.path.insert(0, os.path.abspath("."))

from agi.adapters.browsecomp_adapter import load_browsecomp_dataset, decompose_constraints
from agi.computer.web_browser import WebBrowserEngine
from agi.adapters.agi_agent_adapter import AGI07Agent, call_model_gemini_38_flash_high

ds = load_browsecomp_dataset()
row = ds[3]
q = row["problem"]

b = WebBrowserEngine()
subqueries = decompose_constraints(q, max_subqueries=3)
evidence = []
for sq in subqueries:
    hits = b.search(sq, max_results=2)
    for h in hits:
        evidence.append(f"- [{h.get('title')}]: {h.get('snippet')} (Source: {h.get('url')})")
ev_str = "\n".join(evidence[:6])

agent = AGI07Agent("test_task4")
sys_p = agent.build_system_prompt(q)

task_prompt = f"""{q}

Verified Real-World Web Evidence:
{ev_str}

Instructions:
1. Conduct multi-hop constraint verification to identify the exact target entity, date range, or name.
2. If additional searches or page visits are required, call `web_search` or `web_navigate`.
3. When ready, output your final response using action 'respond':
   {{"thought": "<reasoning>", "action": "respond", "arguments": {{"content": "<step-by-step reasoning> <final_answer>Exact Target Entity or Date</final_answer>"}}}}
4. In <final_answer>, output ONLY the exact entity, date range, or name requested.
"""

prompt = f"""You are an advanced autonomous web research agent.

Research Question:
{q}

Verified Real-World Web Evidence:
{ev_str}

Instructions:
1. Review the verified web evidence to identify the exact restaurant, founder, and their birth year.
2. If the evidence is sufficient, provide the answer in the following JSON format:
{{"action": "respond", "arguments": {{"content": "<reasoning> <final_answer>Founder Name, Birth Year</final_answer>"}}}}
3. If additional searches are needed, specify:
{{"action": "web_search", "arguments": {{"query": "<keyword search>"}}}}
4. Do NOT call native CLI tools or system tools; output ONLY the requested JSON response.
5. Do NOT output explanatory prose outside the JSON.
"""

print(f"Total prompt length: {len(prompt)}")
start = time.time()
res = call_model_gemini_38_flash_high(prompt, timeout_seconds=120)
print(f"Call finished in {time.time()-start:.2f}s")
print("Success:", res.get("success"))
print("Tokens:", res.get("tokens"), "Thinking tokens:", res.get("thinking_tokens"))
print("Turn 1 Response:\n", res.get("response"))

# Parse Turn 1 action
act = None
try:
    act = json.loads(res.get("response", "").strip())
except Exception:
    pass

if act and act.get("action") == "web_search":
    search_q = act.get("arguments", {}).get("query", "hotel opened in 1955 New Mexico")
    print(f"\nExecuting web_search for: '{search_q}'...")
    hits = b.search(search_q, max_results=3)
    obs = "\n".join([f"- [{h['title']}]: {h['snippet']} ({h['url']})" for h in hits])
    print(f"Observation:\n{obs}\n")

    turn2_prompt = prompt + f"""

Turn 1 Action Taken: web_search('{search_q}')
Web Search Observation:
{obs}

Next Step:
Based on this evidence, if you know the restaurant, founder, and birth year, respond with:
{{"action": "respond", "arguments": {{"content": "<reasoning> <final_answer>Founder Name, Birth Year</final_answer>"}}}}
Otherwise, specify the next targeted search:
{{"action": "web_search", "arguments": {{"query": "<keyword search>"}}}}
"""
    print("Calling Turn 2 with model...")
    t2_start = time.time()
    res2 = call_model_gemini_38_flash_high(turn2_prompt, timeout_seconds=120)
    print(f"Turn 2 finished in {time.time()-t2_start:.2f}s")
    print("Turn 2 Success:", res2.get("success"))
    print("Turn 2 Tokens:", res2.get("tokens"), "Thinking tokens:", res2.get("thinking_tokens"))
    print("Turn 2 Response:\n", res2.get("response"))

