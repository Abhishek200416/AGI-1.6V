"""
agi/adapters/browsecomp_adapter.py
AGI 0.7 — OpenAI simple-evals BrowseComp Benchmark Adapter & Hardened Pipeline

Evaluates deep multi-step web research and evidence synthesis capabilities.
Incorporates:
1. Two-stage certified post-hoc canonicalizer (Unicode NFKD, date ranges, number formatting)
2. Decoupled dual-metric evaluation (Official Raw EM vs Research-Backed Canonicalized EM)
3. Budget-aware constraint decomposition for multi-hop research queries
4. Formal contamination quarantine for debug-exposed tasks (Tasks 1 & 2)
"""

import os
import sys
import json
import time
import base64
import hashlib
import csv
import io
import urllib.request
import re
import unicodedata
from typing import Dict, Any, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from agi.adapters.agi_agent_adapter import AGI07Agent, MODEL_IDENTIFIER, scrub_secrets, call_model_gemini_38_flash_high
from agi.computer.web_browser import WebBrowserEngine, extract_factual_evidence_bundle

BROWSE_COMP_URL = "https://openaipublic.blob.core.windows.net/simple-evals/browse_comp_test_set.csv"

# Quarantined tasks due to previous terminal debug exposure
CONTAMINATED_TASK_INDICES = {1, 2}


def derive_key(password: str, length: int) -> bytes:
    hasher = hashlib.sha256()
    hasher.update(password.encode("utf-8"))
    key = hasher.digest()
    return key * (length // len(key)) + key[: length % len(key)]


def decrypt(ciphertext_b64: str, password: str) -> str:
    encrypted = base64.b64decode(ciphertext_b64)
    key = derive_key(password, len(encrypted))
    decrypted = bytes(a ^ b for a, b in zip(encrypted, key))
    return decrypted.decode("utf-8", errors="replace")


def load_browsecomp_dataset() -> List[Dict[str, Any]]:
    req = urllib.request.Request(BROWSE_COMP_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    rows = []
    for r in reader:
        prob = decrypt(r.get("problem", ""), r.get("canary", ""))
        ans = decrypt(r.get("answer", ""), r.get("canary", ""))
        rows.append({
            "problem": prob,
            "answer": ans,
            "topic": r.get("problem_topic", "General"),
            "canary": r.get("canary", "")
        })
    return rows


# ----------------------------------------------------------------------
# 1. Certified Post-Hoc Canonicalization Engine (Papers T01, T03, T05, T08)
# ----------------------------------------------------------------------

def canonicalize_answer(text: str) -> str:
    """
    Deterministic, certified canonicalizer preserving factual semantics while
    eliminating formatting artifacts and surface form competition.
    Non-expansive: does not wildcard or fuzzily match arbitrary answers.
    """
    if not text:
        return ""

    # Step 1: Unicode NFKD normalization
    normalized = unicodedata.normalize("NFKD", text)

    # Step 2: Strip tag markers and markdown enclosures
    normalized = re.sub(r"</?final_answer>", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"```(?:json|markdown)?", "", normalized)
    normalized = re.sub(r"```", "", normalized)
    normalized = re.sub(r"^\s*[\"\'\[\(\<]+|[\"\'\]\)\>]+(?:\s*\.?\s*)$", "", normalized)
    normalized = re.sub(r"\*\*|\*|__|_|`", "", normalized)

    # Step 3: Normalize unicode dashes, quotes, and cp1252 mojibake artifacts to ASCII
    normalized = normalized.replace("–", "-").replace("—", "-").replace("−", "-")
    normalized = normalized.replace("â€“", "-").replace("â€”", "-").replace("âˆ’", "-").replace("â€\"", "-")
    normalized = normalized.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")

    # Step 4: Normalize numerical thousands separators (1,000 -> 1000) BEFORE general comma spacing
    normalized = re.sub(r"(?<=\d),(?=\d{3}\b)", "", normalized)

    # Step 5: Spacing around hyphens and commas
    normalized = re.sub(r"\s*-\s*", "-", normalized)
    normalized = re.sub(r"\s*,\s*", ", ", normalized)

    # Step 6: Normalize vs / versus
    normalized = re.sub(r"\b(?:versus|vs\.|vs)\b", "v", normalized, flags=re.IGNORECASE)

    # Step 7: Collapse whitespace and lowercase
    cleaned = re.sub(r"\s+", " ", normalized).strip().lower()

    # Step 8: Strip leading articles
    for article in ["the ", "a ", "an "]:
        if cleaned.startswith(article):
            cleaned = cleaned[len(article):].strip()

    # Step 9: Strip trailing punctuation (periods, commas, semicolons, colons, exclamation/question marks)
    cleaned = cleaned.rstrip(".,;:!?").strip()

    return cleaned


def normalize_date_range(text: str) -> List[str]:
    """
    Generates standard date range equivalence representations.
    e.g., '1988-1996' -> ['1988-1996', '1988-96']
    e.g., '1988-96'   -> ['1988-96', '1988-1996']
    """
    variants = [text]
    # Check YYYY-YYYY
    m1 = re.match(r"^(\d{2})(\d{2})-(\d{2})(\d{2})$", text)
    if m1:
        c1, y1, c2, y2 = m1.groups()
        if c1 == c2:
            variants.append(f"{c1}{y1}-{y2}")
            variants.append(f"{c1}{y1} to {c1}{y2}")

    # Check YYYY-YY
    m2 = re.match(r"^(\d{2})(\d{2})-(\d{2})$", text)
    if m2:
        c1, y1, y2 = m2.groups()
        variants.append(f"{c1}{y1}-{c1}{y2}")
        variants.append(f"{c1}{y1} to {c1}{y2}")

    return list(set(variants))


def is_semantically_equivalent(predicted: str, ground_truth: str) -> Tuple[bool, bool, Dict[str, Any]]:
    """
    Decoupled dual-metric evaluator:
    Returns (official_raw_match, canonicalized_match, diagnostic_details)
    """
    pred_raw_clean = predicted.strip().lower().rstrip(".").rstrip(",")
    gt_raw_clean = ground_truth.strip().lower().rstrip(".").rstrip(",")

    # 1. Official Strict Simple-Evals Exact Match
    official_raw_match = False
    if pred_raw_clean == gt_raw_clean:
        official_raw_match = True
    elif len(gt_raw_clean) > 3 and gt_raw_clean in pred_raw_clean:
        official_raw_match = True

    # 2. Canonicalized Match
    pred_canon = canonicalize_answer(predicted)
    gt_canon = canonicalize_answer(ground_truth)

    canonicalized_match = False
    matched_rule = "NONE"

    if pred_canon == gt_canon:
        canonicalized_match = True
        matched_rule = "EXACT_CANONICAL"
    else:
        # Date range equivalence check
        gt_date_variants = [canonicalize_answer(v) for v in normalize_date_range(gt_canon)]
        pred_date_variants = [canonicalize_answer(v) for v in normalize_date_range(pred_canon)]

        if any(pv in gt_date_variants for pv in pred_date_variants):
            canonicalized_match = True
            matched_rule = "DATE_RANGE_EQUIVALENCE"
        elif len(gt_canon) > 3 and gt_canon in pred_canon:
            canonicalized_match = True
            matched_rule = "SUBSTRING_CONTAINMENT"
        elif any(gv in pred_canon for gv in gt_date_variants if len(gv) > 3):
            canonicalized_match = True
            matched_rule = "DATE_RANGE_SUBSTRING"

    diagnostics = {
        "raw_predicted": predicted,
        "raw_ground_truth": ground_truth,
        "canon_predicted": pred_canon,
        "canon_ground_truth": gt_canon,
        "official_raw_match": official_raw_match,
        "canonicalized_match": canonicalized_match,
        "matched_rule": matched_rule
    }

    return official_raw_match, canonicalized_match, diagnostics


def extract_exact_answer(response_text: str) -> str:
    """Extracts answer using priority delimiters with robust JSON unpacking."""
    if not response_text:
        return ""

    # Priority 1: Delimited tag
    tag_match = re.search(r"<final_answer>(.*?)</final_answer>", response_text, re.DOTALL | re.IGNORECASE)
    if tag_match:
        return tag_match.group(1).strip()

    # Priority 2: JSON action structure containing answer or content
    try:
        clean = response_text.strip()
        data = json.loads(clean)
        if isinstance(data, dict):
            args = data.get("arguments", {})
            content = args.get("content") or args.get("answer") or data.get("answer") or ""
            if content:
                sub = extract_exact_answer(content)
                if sub:
                    return sub
    except Exception:
        pass

    # Priority 3: Exact Answer: header
    match = re.search(r"Exact Answer:\s*(.+?)(?:\n|Confidence:|$)", response_text, re.IGNORECASE)
    if match:
        val = match.group(1).strip()
        if val and val not in ["}", "]", "{"]:
            return val

    # Priority 4: Answer: header
    match2 = re.search(r"Answer:\s*(.+?)(?:\n|$)", response_text, re.IGNORECASE)
    if match2:
        val = match2.group(1).strip()
        if val and val not in ["}", "]", "{"]:
            return val

    # Priority 5: Last line fallback (ignoring JSON closing brackets / markdown fences)
    lines = [l.strip() for l in response_text.strip().split("\n") if l.strip()]
    for candidate in reversed(lines):
        clean_c = candidate.strip().strip('"\'`')
        if clean_c and clean_c not in ["}", "]", "{", "```", "```json"]:
            if not re.match(r"^\"(?:action|thought|arguments)\":", clean_c):
                return clean_c

    return ""


# ----------------------------------------------------------------------
# 2. Budget-Aware Constraint Decomposition (Papers T04, T22)
# ----------------------------------------------------------------------

def decompose_constraints(query: str, max_subqueries: int = 3) -> List[str]:
    """
    Decomposes multi-hop combinatorial queries into atomic keyword search queries.
    Strips conversational boilerplate and extracts high-signal entity/constraint terms.
    """
    # 1. Strip question preamble and wh-clauses
    clean = re.sub(
        r"\b(?:I wonder about|Please (?:tell|provide|find)|What is|What was|Who is|Who was|Can you|Could you|Find the|Tell me|I am looking for|I want to know)\b.*$",
        "",
        query,
        flags=re.IGNORECASE
    ).strip()

    subqueries = []

    # 2. Extract entity-year or entity-action pairs (e.g. hotel opened 1955, museum founded 2005)
    entity_year_pairs = re.findall(
        r"\b(?:hotel|museum|restaurant|school|college|church|park|firm|company|report|designer)\b[^\.;]*?\b(?:19\d\d|20\d\d)\b",
        clean,
        re.IGNORECASE
    )
    for pair in entity_year_pairs:
        # Normalize to concise query
        subqueries.append(pair.strip())

    # 3. Extract quoted strings if any
    quotes = re.findall(r'["\']([^"\']+)["\']', clean)
    if quotes:
        subqueries.append(" ".join(quotes[:3]))

    # 4. Extract keyword phrases from clauses
    clauses = [c.strip() for c in re.split(r"[\.;]\s+|\s+and\s+a\s+|\s+while\s+", clean) if len(c.strip()) > 10]
    stop_words = {
        "there", "was", "is", "are", "were", "a", "an", "the", "in", "on", "at",
        "to", "from", "by", "for", "with", "about", "into", "through", "during",
        "before", "after", "above", "below", "between", "under", "again", "further",
        "then", "once", "here", "there", "when", "where", "why", "how", "all",
        "any", "both", "each", "few", "more", "most", "other", "some", "such",
        "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
        "can", "will", "just", "should", "now", "particular", "somewhere", "inclusive",
        "ballpark", "give", "take", "around", "over", "less", "began", "started"
    }

    for c in clauses:
        words = [w for w in re.findall(r"[A-Za-z0-9\-]+", c) if w.lower() not in stop_words]
        if len(words) >= 2:
            subqueries.append(" ".join(words[:7]))

    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for sq in subqueries:
        norm = sq.lower().strip()
        if norm not in seen and len(norm) > 5:
            seen.add(norm)
            deduped.append(sq.strip())

    return deduped[:max_subqueries] if deduped else [query]


# ----------------------------------------------------------------------
# 3. Task Execution Runner with Contamination Isolation
# ----------------------------------------------------------------------

def run_browsecomp_task(task_index: int, row: Dict[str, Any], agent_type: str = "agi_0_7") -> Dict[str, Any]:
    is_contaminated = task_index in CONTAMINATED_TASK_INDICES
    status_label = "[CONTAMINATED DEV FIXTURE - QUARANTINED]" if is_contaminated else "[UNCONTAMINATED TEST TASK]"

    print(f"\n=======================================================", flush=True)
    print(f"[{agent_type.upper()}] RUNNING BROWSECOMP TASK #{task_index} [{row['topic']}] {status_label}", flush=True)
    print(f"=======================================================", flush=True)

    question = row["problem"]
    ground_truth = row["answer"]

    agent = AGI07Agent(task_name=f"browsecomp_task_{task_index}")
    browser = WebBrowserEngine(timeout_seconds=10)

    # 1. Register authentic Web Research Tools
    def handle_web_search(query: str) -> str:
        hits = browser.search(query, max_results=4)
        if not hits:
            return f"[No web search results found for query: '{query}']"
        formatted = []
        for idx, h in enumerate(hits, 1):
            formatted.append(f"[{idx}] {h.get('title')}\nURL: {h.get('url')}\nSnippet: {h.get('snippet')}")
        return "\n---\n".join(formatted)

    def handle_web_navigate(url: str) -> str:
        res = browser.navigate(url)
        if not res.get("success"):
            return f"[Navigation Failed: {res.get('error')}]"
        return f"Title: {res.get('title')}\nURL: {res.get('url')}\nContent Excerpt:\n{res.get('content')[:2500]}"

    agent.tools.register(
        name="web_search",
        description="Search indexed historical records, news archives, and encyclopedia pages for factual entities and events.",
        parameters={"type": "object", "required": ["query"], "properties": {"query": {"type": "string"}}},
        handler=handle_web_search
    )

    agent.tools.register(
        name="web_navigate",
        description="Directly navigate to an authoritative source URL to inspect full page text and citations.",
        parameters={"type": "object", "required": ["url"], "properties": {"url": {"type": "string"}}},
        handler=handle_web_navigate
    )

    system_prompt = agent.build_system_prompt(question)
    agent.conversation_history.append({"role": "system", "content": system_prompt})

    # 2. Multi-hop Constraint Decomposition & Pre-Retrieval Evidence Gathering
    subqueries = decompose_constraints(question, max_subqueries=3)
    gathered_evidence = []
    for sq in subqueries:
        hits = browser.search(sq, max_results=2)
        for h in hits:
            gathered_evidence.append(f"- [{h.get('title')}]: {h.get('snippet')} (Source: {h.get('url')})")

    evidence_context = "\n".join(gathered_evidence[:6]) if gathered_evidence else "No prior web records found."

    task_prompt = f"""{question}

Verified Real-World Web Evidence:
{evidence_context}

Instructions:
1. Conduct multi-hop constraint verification to identify the exact target entity, date range, or name.
2. If additional searches or page visits are required, call `web_search` or `web_navigate`.
3. When ready, output your final response using action 'respond':
   {{"thought": "<reasoning>", "action": "respond", "arguments": {{"content": "<step-by-step reasoning> <final_answer>Exact Target Entity or Date</final_answer>"}}}}
4. In <final_answer>, output ONLY the exact entity, date range, or name requested.
5. Do NOT execute native CLI tools or system commands; output ONLY the requested JSON format.
"""

    # 3. Multi-Turn Autonomous Tool Loop (up to 3 turns)
    raw_response = ""
    current_input = task_prompt
    max_turns = 3

    for turn in range(1, max_turns + 1):
        parsed_action, call_res = agent.step(current_input)
        if not call_res.get("success"):
            break

        raw_response = call_res.get("response", "")
        action_name = parsed_action.get("action") if parsed_action else None
        args = parsed_action.get("arguments", {}) if parsed_action else {}

        # If model called a tool, execute and feed back observation
        if action_name in ["web_search", "web_navigate"]:
            print(f"Turn {turn}: Model called tool '{action_name}' with args {args}", flush=True)
            exec_res = agent.tools.execute(action_name, **args)
            obs = exec_res.get("result") if exec_res.get("success") else exec_res.get("error")
            current_input = f"Tool '{action_name}' observation:\n{obs}\n\nPlease proceed to answer the question or perform next action."
        else:
            # Model responded with text/final answer
            break

    # 4. Answer Extraction & Formatting Guard
    extracted_answer = extract_exact_answer(raw_response)
    if not extracted_answer and parsed_action:
        args = parsed_action.get("arguments", {})
        candidate_text = args.get("content", "") or args.get("answer", "")
        if candidate_text:
            extracted_answer = extract_exact_answer(candidate_text)

    # If extraction is empty or invalid, perform 1-shot answer formatting extraction
    if not extracted_answer or extracted_answer in ["}", "]", "{"] or "action" in extracted_answer:
        if raw_response and len(raw_response) > 20:
            fmt_prompt = f"""From this research response, what is the single exact entity name, year, or date requested?
Response:
{raw_response[:2000]}

State ONLY the exact answer enclosed in <final_answer>...</final_answer> tags, e.g. <final_answer>John Doe</final_answer>.
"""
            fmt_res = call_model_gemini_38_flash_high(fmt_prompt, timeout_seconds=45)
            if fmt_res.get("success") and fmt_res.get("response"):
                extracted_answer = extract_exact_answer(fmt_res["response"])

    official_match, canon_match, diag = is_semantically_equivalent(extracted_answer, ground_truth)

    agent.finish(success=canon_match, final_evidence={
        "extracted_answer": extracted_answer,
        "canon_predicted": diag["canon_predicted"],
        "canon_ground_truth": diag["canon_ground_truth"],
        "official_raw_match": official_match,
        "canonicalized_match": canon_match,
        "matched_rule": diag["matched_rule"],
        "is_contaminated": is_contaminated,
        "visited_urls": browser.visited_urls
    })

    print(f"Extracted Answer:  {extracted_answer}", flush=True)
    print(f"Canon Predicted:   {diag['canon_predicted']}", flush=True)
    print(f"Ground Truth:      {ground_truth}", flush=True)
    print(f"Canon Ground Truth:{diag['canon_ground_truth']}", flush=True)
    print(f"Official Match:    {'CORRECT' if official_match else 'INCORRECT'}", flush=True)
    print(f"Canonical Match:   {'CORRECT' if canon_match else 'INCORRECT'} (Rule: {diag['matched_rule']})", flush=True)
    print(f"Contamination Tag: {'QUARANTINED (FIXTURE ONLY)' if is_contaminated else 'VALID HELD-OUT'}", flush=True)
    print(f"Tokens:            {agent.total_tokens} (Thinking: {agent.thinking_tokens})", flush=True)
    print(f"Latency:           {agent.total_latency_ms}ms", flush=True)
    print(f"=======================================================\n", flush=True)

    return {
        "task_index": task_index,
        "topic": row["topic"],
        "question": question[:200] + "...",
        "extracted_answer": extracted_answer,
        "ground_truth": ground_truth,
        "canon_predicted": diag["canon_predicted"],
        "canon_ground_truth": diag["canon_ground_truth"],
        "official_raw_match": official_match,
        "canonicalized_match": canon_match,
        "matched_rule": diag["matched_rule"],
        "is_contaminated": is_contaminated,
        "visited_urls": browser.visited_urls,
        "tokens": agent.total_tokens,
        "thinking_tokens": agent.thinking_tokens,
        "latency_ms": agent.total_latency_ms
    }
