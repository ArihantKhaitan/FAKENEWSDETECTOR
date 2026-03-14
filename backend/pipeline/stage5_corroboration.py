"""
Stage 5 — External Corroboration

Searches Google News RSS (free, no API key) for the article headline and checks
whether credible outlets are independently reporting the same story.

Scoring logic:
  3+ trusted outlets cover it  → score  8  (PASS  — strong corroboration)
  1–2 trusted outlets          → score 20  (PASS  — some corroboration)
  Results only from bad domains→ score 65  (FAIL  — only disreputable coverage)
  Results but no known outlets → score 32  (WARN  — coverage but unverifiable)
  No results at all            → score 38  (WARN  — new story or very niche)
  Network/parse failure        → score 38  (WARN  — no data, weight reduced in ensemble)

data_quality:
  "full"    → search succeeded, use full 20% weight
  "none"    → network error, reduce ensemble weight to ~4% (nearly ignore)
"""

import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import List, Dict

# ── Domain lists ─────────────────────────────────────────────────────────────

TRUSTED_SOURCES = {
    # International wire services
    "reuters.com", "apnews.com",
    # UK/US broadcasters & papers
    "bbc.com", "bbc.co.uk", "nytimes.com", "theguardian.com",
    "washingtonpost.com", "wsj.com", "ft.com", "bloomberg.com",
    "theatlantic.com", "politico.com", "axios.com", "time.com",
    "nbcnews.com", "abcnews.go.com", "cbsnews.com", "cnn.com",
    "npr.org", "pbs.org", "usatoday.com", "latimes.com",
    "chicagotribune.com", "bostonglobe.com", "sfchronicle.com",
    # UK press
    "independent.co.uk", "telegraph.co.uk", "thetimes.co.uk",
    "thesun.co.uk", "mirror.co.uk", "dailymail.co.uk",
    # International
    "dw.com", "aljazeera.com", "france24.com", "euronews.com",
    "lemonde.fr", "spiegel.de", "straitstimes.com", "scmp.com",
    # India
    "thehindu.com", "ndtv.com", "hindustantimes.com",
    "economictimes.com", "livemint.com", "business-standard.com",
    "firstpost.com", "scroll.in", "theprint.in", "thewire.in",
    "deccanherald.com", "tribuneindia.com", "telegraphindia.com",
}

SUSPICIOUS_SOURCES = {
    "infowars.com", "naturalnews.com", "breitbart.com", "thegatewaypundit.com",
    "worldnewsdailyreport.com", "yournewswire.com", "newspunch.com",
    "beforeitsnews.com", "activistpost.com", "zerohedge.com",
    "globalresearch.ca", "21stcenturywire.com", "thedailybeast.com",
    "rt.com", "sputniknews.com", "tass.com",
}


# ── Data class ────────────────────────────────────────────────────────────────

@dataclass
class Stage5Result:
    score: float
    verdict: str                             # PASS / WARN / FAIL
    flags: List[str] = field(default_factory=list)
    details: Dict = field(default_factory=dict)
    data_quality: str = "full"               # "full" | "none" — used by ensemble to adjust weight


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_domain(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return ""


def _search_google_news(query: str, timeout: int = 6) -> List[Dict]:
    """
    Query Google News RSS feed, return up to 10 results as dicts.
    Returns [] on any network or parse error.
    """
    short_query = " ".join(query.split()[:9])
    encoded = urllib.parse.quote(short_query)
    rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"

    req = urllib.request.Request(
        rss_url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; TruthLens/2.0; +https://github.com)"},
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            xml_data = resp.read()
    except Exception:
        return []

    try:
        root = ET.fromstring(xml_data)
        channel = root.find("channel")
        if channel is None:
            return []

        results = []
        for item in channel.findall("item")[:10]:
            title_el  = item.find("title")
            source_el = item.find("source")
            link_el   = item.find("link")

            title       = title_el.text  if title_el  is not None else ""
            source_name = source_el.text if source_el is not None else ""
            # Google News <source url="https://..."> gives the real outlet domain
            source_url  = (source_el.get("url", "") if source_el is not None else "")
            link        = link_el.text if link_el is not None else ""

            domain = _extract_domain(source_url) if source_url else _extract_domain(link)
            results.append({"title": title, "source": source_name, "domain": domain})

        return results
    except Exception:
        return []


# ── Main gate ─────────────────────────────────────────────────────────────────

def analyze_corroboration(headline: str, content: str) -> Stage5Result:
    """
    Gate 5: check how many credible outlets independently report this story.
    Works for both URL-based and raw-text submissions.
    """
    query = headline.strip()

    # Fall back to first sentence of content when no headline
    if (not query or len(query) < 10) and content:
        sentences = re.split(r"[.!?\n]", content.strip())
        query = next((s.strip() for s in sentences if len(s.strip()) > 20), "")[:150]

    if not query:
        return Stage5Result(
            score=38.0,
            verdict="WARN",
            flags=["No headline available to search for corroboration"],
            details={"search_performed": False, "reason": "no_headline"},
            data_quality="none",
        )

    results = _search_google_news(query)

    # ── Network / parse failure ───────────────────────────────────────────────
    if results is None or (isinstance(results, list) and len(results) == 0
                           and query):
        # Distinguish: we attempted a search but got nothing back
        # Could be network error OR genuinely no coverage.
        # Return neutral score; ensemble will reduce weight.
        return Stage5Result(
            score=38.0,
            verdict="WARN",
            flags=["No corroboration data retrieved (network issue or no coverage yet)"],
            details={
                "search_performed": True,
                "query": query[:80],
                "total_results": 0,
                "trusted_sources_found": 0,
                "suspicious_sources_found": 0,
            },
            data_quality="none",
        )

    trusted    = [r for r in results if r["domain"] in TRUSTED_SOURCES]
    suspicious = [r for r in results if r["domain"] in SUSPICIOUS_SOURCES]
    total      = len(results)

    trusted_count    = len(trusted)
    suspicious_count = len(suspicious)

    flags = []

    # ── Score ─────────────────────────────────────────────────────────────────
    if trusted_count >= 3:
        score   = 8.0
        verdict = "PASS"
        source_names = ", ".join(dict.fromkeys(r["source"] for r in trusted[:4]))
        flags.append(f"Covered by {trusted_count} trusted outlets: {source_names}")

    elif trusted_count >= 1:
        score   = 20.0
        verdict = "PASS"
        source_names = ", ".join(dict.fromkeys(r["source"] for r in trusted[:2]))
        flags.append(f"Found in {trusted_count} credible source(s): {source_names}")

    elif suspicious_count > 0 and trusted_count == 0:
        score   = 65.0
        verdict = "FAIL"
        susp_names = ", ".join(dict.fromkeys(r["source"] for r in suspicious[:3]))
        flags.append(f"Story found only on flagged domain(s): {susp_names}")

    elif total > 0:
        # Results exist but none from our known lists — neutral
        score   = 32.0
        verdict = "WARN"
        flags.append(f"{total} result(s) found but none from verified outlets")

    else:
        # Genuinely zero results
        score   = 38.0
        verdict = "WARN"
        flags.append("No news coverage found — may be breaking news or very niche topic")

    if suspicious_count > 0 and trusted_count > 0:
        flags.append(f"Also appears on {suspicious_count} low-credibility site(s)")

    top_sources = list(dict.fromkeys(r["source"] for r in results if r["source"]))[:5]

    return Stage5Result(
        score=score,
        verdict=verdict,
        flags=flags,
        details={
            "query": query[:80],
            "search_performed": True,
            "total_results": total,
            "trusted_sources_found": trusted_count,
            "suspicious_sources_found": suspicious_count,
            "top_sources": top_sources,
        },
        data_quality="full",
    )
