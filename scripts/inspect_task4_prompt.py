import os, sys, json
sys.path.insert(0, os.path.abspath("."))

from agi.adapters.browsecomp_adapter import load_browsecomp_dataset, decompose_constraints
from agi.computer.web_browser import WebBrowserEngine
from agi.adapters.agi_agent_adapter import AGI07Agent

ds = load_browsecomp_dataset()
row = ds[3]
q = row["problem"]
b = WebBrowserEngine()
subqueries = decompose_constraints(q, max_subqueries=3)
print("Subqueries:", subqueries)
evidence = []
for sq in subqueries:
    hits = b.search(sq, max_results=2)
    for h in hits:
        evidence.append(f"- [{h.get('title')}]: {h.get('snippet')} (Source: {h.get('url')})")
ev_str = "\n".join(evidence[:6])
agent = AGI07Agent("test_task4")
sys_p = agent.build_system_prompt(q)
print("System prompt len:", len(sys_p))
print("Evidence context len:", len(ev_str))
print("Evidence sample:\n", ev_str[:400])
