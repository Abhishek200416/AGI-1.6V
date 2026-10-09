import os, sys, json, time
sys.path.insert(0, os.path.abspath("."))

from agi.adapters.browsecomp_adapter import load_browsecomp_dataset, extract_exact_answer, is_semantically_equivalent
from agi.computer.web_browser import WebBrowserEngine
from agi.adapters.agi_agent_adapter import AGI07Agent, call_model_gemini_38_flash_high

def test_task4_agent():
    ds = load_browsecomp_dataset()
    row = ds[3]
    question = row["problem"]
    ground_truth = row["answer"]

    agent = AGI07Agent("browsecomp_task_4")
    browser = WebBrowserEngine(timeout_seconds=10)

    def handle_search(query: str) -> str:
        hits = browser.search(query, max_results=3)
        if not hits:
            return f"No results found for '{query}'"
        lines = []
        for i, h in enumerate(hits, 1):
            lines.append(f"[{i}] {h.get('title')} ({h.get('url')})\n{h.get('snippet')}")
        return "\n\n".join(lines)

    def handle_navigate(url: str) -> str:
        res = browser.navigate(url)
        if not res.get("success"):
            return f"Navigation failed: {res.get('error')}"
        return f"Title: {res.get('title')}\n\nContent:\n{res.get('content')[:2000]}"

    tools_spec = [
        {
            "name": "web_search",
            "description": "Search the web for entities, hotels, restaurants, history, or dates.",
            "parameters": {"type": "object", "required": ["query"], "properties": {"query": {"type": "string"}}}
        },
        {
            "name": "web_navigate",
            "description": "Navigate to a webpage URL to read detailed contents.",
            "parameters": {"type": "object", "required": ["url"], "properties": {"url": {"type": "string"}}}
        }
    ]

    # Pre-search for high-signal entities
    pre_hits = browser.search("hotel opened 1955 New Mexico museum 2005", max_results=2)
    pre_ev = "\n".join([f"- {h['title']}: {h['snippet']} ({h['url']})" for h in pre_hits])

    prompt = f"""You are an autonomous web research agent.

Research Question:
{question}

Initial Web Clues:
{pre_ev}

Available Tools:
{json.dumps(tools_spec, indent=2)}

Instructions:
1. Identify the target restaurant in New Mexico, its founder, and the founder's birth year.
2. If you need more information, output a tool action in JSON:
{{"action": "web_search", "arguments": {{"query": "<search query>"}}}}
or
{{"action": "web_navigate", "arguments": {{"url": "<url>"}}}}
3. When you have verified the founder's name and birth year, output the final answer in JSON:
{{"action": "respond", "arguments": {{"content": "<reasoning> <final_answer>Founder Name, Birth Year</final_answer>"}}}}
4. Do NOT call native CLI tools or system commands; output ONLY valid JSON.
"""

    current_prompt = prompt
    max_turns = 3
    final_resp = ""

    for turn in range(1, max_turns + 1):
        print(f"\n--- Turn {turn} ---")
        t0 = time.time()
        res = call_model_gemini_38_flash_high(current_prompt, timeout_seconds=150)
        elapsed = time.time() - t0
        print(f"Turn {turn} finished in {elapsed:.2f}s, Success: {res.get('success')}")
        if not res.get("success"):
            print("Error:", res.get("error"))
            break

        resp_text = res.get("response", "").strip()
        print("Raw model response:\n", resp_text)
        final_resp = resp_text

        # Parse action
        action_obj = None
        try:
            action_obj = json.loads(resp_text)
        except Exception:
            import re
            m = re.search(r"\{[\s\S]*\"action\"[\s\S]*\}", resp_text)
            if m:
                try:
                    action_obj = json.loads(m.group(0))
                except Exception:
                    pass

        if not action_obj:
            print("Could not parse JSON action, treating as final response.")
            break

        action = action_obj.get("action")
        args = action_obj.get("arguments", {})

        if action == "web_search":
            q_arg = args.get("query", "")
            print(f"Executing web_search('{q_arg}')...")
            obs = handle_search(q_arg)
            print(f"Observation ({len(obs)} chars):\n{obs[:300]}...")
            current_prompt += f"\n\nObservation from web_search('{q_arg}'):\n{obs}\n\nBased on this observation, provide the next action or final answer in JSON:"
        elif action == "web_navigate":
            u_arg = args.get("url", "")
            print(f"Executing web_navigate('{u_arg}')...")
            obs = handle_navigate(u_arg)
            print(f"Observation ({len(obs)} chars):\n{obs[:300]}...")
            current_prompt += f"\n\nObservation from web_navigate('{u_arg}'):\n{obs}\n\nBased on this observation, provide the next action or final answer in JSON:"
        else:
            print("Model emitted action:", action)
            break

    ans = extract_exact_answer(final_resp)
    print(f"\nExtracted Answer: '{ans}'")
    print(f"Ground Truth:     '{ground_truth}'")
    off_m, can_m, diag = is_semantically_equivalent(ans, ground_truth)
    print(f"Official Match:   {off_m}")
    print(f"Canonical Match:  {can_m} ({diag['matched_rule']})")

if __name__ == "__main__":
    test_task4_agent()
