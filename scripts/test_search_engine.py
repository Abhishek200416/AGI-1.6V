"""
scripts/test_search_engine.py
Test DuckDuckGo HTML and Wikipedia search parsing in Python.
"""
import requests
import re
import html
import json

def test_duckduckgo_get(query: str):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    print(f"\n--- Testing DuckDuckGo GET: {query} ---")
    try:
        r = requests.get(
            f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}",
            headers=headers,
            timeout=10
        )
        print(f"Status: {r.status_code}, Length: {len(r.text)}")
        links = re.findall(r'<a class="result__snippet[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r.text)
        print(f"Links found: {len(links)}")
        # Check for challenge or captcha
        if "anomaly" in r.text.lower() or "challenge" in r.text.lower():
            print("Notice: DuckDuckGo triggered bot challenge/anomaly check.")
    except Exception as e:
        print(f"DDG Error: {e}")

def test_wikipedia_api(query: str):
    headers = {"User-Agent": "AGI07ResearchAgent/1.0 (audited-evaluation@example.com)"}
    print(f"\n--- Testing Wikipedia API: {query} ---")
    try:
        url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={requests.utils.quote(query)}&format=json&utf8=1"
        r = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {r.status_code}")
        data = r.json()
        search_results = data.get("query", {}).get("search", [])
        print(f"Total hits: {len(search_results)}")
        for idx, item in enumerate(search_results[:3], 1):
            title = item.get("title", "")
            snip = html.unescape(re.sub(r'<[^>]+>', '', item.get("snippet", "")))
            page_id = item.get("pageid")
            page_url = f"https://en.wikipedia.org/?curid={page_id}"
            print(f"[{idx}] {title} ({page_url})")
            print(f"    Snippet: {snip[:120]}...")
        return search_results
    except Exception as e:
        print(f"Wiki Error: {e}")
        return []

def test_direct_fetch(url: str):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    print(f"\n--- Testing Direct Fetch: {url} ---")
    try:
        r = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {r.status_code}, Length: {len(r.text)}")
        # Clean text
        text = re.sub(r'<script.*?</script>', '', r.text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        clean_text = ' '.join(text.split())
        print(f"Extracted Text: {clean_text[:200]}...")
        return clean_text
    except Exception as e:
        print(f"Direct Fetch Error: {e}")
        return ""

def test_duckduckgo_lite(query: str):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    print(f"\n--- Testing DuckDuckGo LITE: {query} ---")
    try:
        r = requests.post(
            "https://lite.duckduckgo.com/lite/",
            data={"q": query},
            headers=headers,
            timeout=10
        )
        print(f"Status: {r.status_code}, Length: {len(r.text)}")
        snippets = re.findall(r"<td[^>]*class=['\"]result-snippet['\"][^>]*>(.*?)</td>", r.text, re.DOTALL)
        links = re.findall(r"<a[^>]*class=['\"]result-link['\"][^>]*href=['\"]([^'\"]+)['\"][^>]*>(.*?)</a>", r.text, re.DOTALL)
        print(f"Snippets found: {len(snippets)}, Links found: {len(links)}")
        for i in range(min(5, len(links))):
            snip = html.unescape(re.sub(r'<[^>]+>', '', snippets[i])).strip() if i < len(snippets) else ""
            title = html.unescape(re.sub(r'<[^>]+>', '', links[i][1])).strip()
            url = links[i][0]
            print(f"[{i+1}] {title}")
            print(f"    URL: {url}")
            print(f"    Snippet: {snip[:140]}...")
    except Exception as e:
        print(f"DDG Lite Error: {e}")

if __name__ == "__main__":
    test_duckduckgo_lite("Rosalea Murphy Pink Adobe Santa Fe")
