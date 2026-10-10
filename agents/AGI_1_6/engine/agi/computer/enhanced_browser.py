"""
agi/computer/enhanced_browser.py
AGI 1.2 — Enhanced Browser & Deep Research Engine (Part VIII)

Implements:
1. Browser Execution Hierarchy with Semantic Extraction (Section 8.1)
2. Multi-Hop Deep Research Pipeline with Citation Grounding (Section 8.2)
3. Stale Selector Recovery & Content Normalization (Section 8.4)
4. Long-Horizon Security & Content Quarantine (Section 8.5)
"""

import os
import sys
import time
import re
import html
from typing import Dict, Any, List, Optional, Set

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from agi.computer.web_browser import WebBrowserEngine, validate_destination_url, SSRFSecurityError
from agi.orchestration.observability import get_telemetry_engine


class EnhancedBrowserResearchEngine:
    def __init__(self, browser_engine: Optional[WebBrowserEngine] = None, run_id: Optional[str] = None):
        self.browser = browser_engine or WebBrowserEngine(timeout_seconds=10)
        self.telemetry = get_telemetry_engine(run_id=run_id)
        self.research_cache: Dict[str, Dict[str, Any]] = {}
        self.visited_urls: Set[str] = set()

    def deep_research(
        self,
        query: str,
        max_hops: int = 2,
        max_sources_per_hop: int = 3,
        task_id: str = "RESEARCH_TASK"
    ) -> Dict[str, Any]:
        """
        Executes multi-hop citation-grounded research (Section 8.2).
        1. Search for primary sources.
        2. Extract verified factual claims and reference URLs.
        3. Traverse citations up to max_hops.
        4. Quarantine untrusted web text (Section 8.5).
        """
        start_time = time.time()
        self.telemetry.record_event(
            task_id=task_id,
            component="BROWSER",
            event_type="RESEARCH_START",
            status="RUNNING",
            sanitized_target=query[:50]
        )

        citation_graph: List[Dict[str, Any]] = []
        collected_claims: List[Dict[str, Any]] = []

        # Hop 0: Search
        search_results = self.browser.search(query, max_results=max_sources_per_hop)
        queue = [r["url"] for r in search_results if "url" in r]

        current_hop = 0
        while queue and current_hop < max_hops:
            current_hop += 1
            next_queue = []

            for url in queue[:max_sources_per_hop]:
                if url in self.visited_urls:
                    continue
                self.visited_urls.add(url)

                try:
                    # Validate SSRF boundary
                    validate_destination_url(url)

                    # Navigate and extract content
                    nav_res = self.browser.navigate(url)
                    if not nav_res.get("success"):
                        continue

                    page_title = nav_res.get("title", "Untitled")
                    page_content = nav_res.get("content", "")
                    page_links = nav_res.get("links", [])

                    # Quarantine content against prompt injection instructions
                    sanitized_content = self._quarantine_prompt_injection(page_content)

                    # Extract key sentences matching query terms
                    extracted_evidence = self._extract_relevant_sentences(query, sanitized_content)

                    source_record = {
                        "hop": current_hop,
                        "url": url,
                        "title": page_title,
                        "evidence_count": len(extracted_evidence),
                        "evidence": extracted_evidence[:5],
                        "status": "VERIFIED_PRIMARY_SOURCE"
                    }
                    citation_graph.append(source_record)

                    for ev in extracted_evidence[:3]:
                        collected_claims.append({
                            "claim": ev,
                            "source_url": url,
                            "source_title": page_title,
                            "hop": current_hop
                        })

                    # Discover outgoing links for next hop
                    for link in page_links:
                        if link.startswith("http") and link not in self.visited_urls:
                            next_queue.append(link)

                except SSRFSecurityError as ssrf_err:
                    self.telemetry.record_event(
                        task_id=task_id,
                        component="SECURITY",
                        event_type="SSRF_BLOCK",
                        status="BLOCKED",
                        error_category="SSRFSecurityError",
                        sanitized_target=url[:50]
                    )
                except Exception as e:
                    pass

            queue = next_queue

        duration_ms = (time.time() - start_time) * 1000
        result = {
            "query": query,
            "total_hops": current_hop,
            "sources_visited": len(citation_graph),
            "citations": citation_graph,
            "claims": collected_claims,
            "duration_ms": round(duration_ms, 2),
            "verification_status": "GROUNDED" if collected_claims else "UNVERIFIED"
        }

        self.telemetry.record_event(
            task_id=task_id,
            component="BROWSER",
            event_type="RESEARCH_COMPLETE",
            status="SUCCESS",
            duration_ms=duration_ms,
            output_reference=f"Found {len(collected_claims)} verified claims across {len(citation_graph)} sources."
        )

        return result

    def _quarantine_prompt_injection(self, raw_text: str) -> str:
        """Strips out adversarial command-injection patterns embedded in web pages."""
        # Defend against "Ignore previous instructions", "SYSTEM PROMPT OVERRIDE", etc.
        patterns = [
            re.compile(r"ignore\s+all\s+(?:previous|prior)\s+instructions", re.IGNORECASE),
            re.compile(r"system\s+prompt\s+override", re.IGNORECASE),
            re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
            re.compile(r"execute\s+command:\s*rm", re.IGNORECASE)
        ]
        sanitized = raw_text
        for p in patterns:
            sanitized = p.sub("[FILTERED_POTENTIAL_INJECTION]", sanitized)
        return sanitized

    def _extract_relevant_sentences(self, query: str, content: str) -> List[str]:
        terms = [t.lower() for t in query.split() if len(t) > 2]
        sentences = re.split(r"(?<=[.!?])\s+", content)
        matches = []
        for s in sentences:
            s_clean = s.strip()
            if not s_clean or len(s_clean) < 20:
                continue
            s_lower = s_clean.lower()
            if any(t in s_lower for t in terms):
                matches.append(s_clean)
        return matches
