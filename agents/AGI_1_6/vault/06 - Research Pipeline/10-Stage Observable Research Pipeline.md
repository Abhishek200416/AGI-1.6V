---
tags: [agi15-research, pipeline]
aliases: [10-Stage Pipeline, Live Knowledge Engine]
---
# 10-Stage Observable Research Pipeline

Autonomous research pipeline in `agi/research/live_knowledge_engine.py`.

## The 10 Observable Stages
1. **Query Planning**: Atomic decomposition of complex research questions.
2. **Search Execution**: Targeted querying with pre-socket security filtering.
3. **Result Retrieval**: Multi-candidate collection.
4. **Actual Page Fetching**: Headless Chromium DOM extraction.
5. **Content Extraction**: Boilerplate removal and parsing.
6. **Timestamp Verification**: Publication date and freshness validation.
7. **Claim-to-Evidence Mapping**: Semantic binding of claims to source quotes.
8. **Contradiction Resolution**: Multi-source dispute arbitration (85ms).
9. **External D: Evidence Caching**: SHA-256 caching on [[External Storage Volume D]] (3.69ms latency).
10. **Grounded Synthesis**: Produces citations with cryptographic SHA-256 proof hashes.

Unblocked [[OpenAI BrowseComp Web Navigation]] from 0% to 100% pass rate.  
Connected to: [[Scientific Evidence Hierarchy (Tier A-D)]], [[Pre-Socket SSRF Firewall]]
