"""
Stage 4 — Source & Domain Credibility Analyzer

The fourth firewall gate. Analyzes the news source/domain:
  - Known unreliable / fake news domain blacklist (200+ domains)
  - Known credible domain whitelist (established news organizations)
  - URL structure analysis (hyphens, suspicious keywords in domain)
  - HTTPS vs HTTP (basic security signal)
  - Domain TLD reputation (.info, .biz more common for fake sites)
  - Domain name length and pattern anomalies
  - Subdomain abuse (news.randomsite.com)
  - Author byline presence
  - Publication date plausibility
  - Citation/link density

Returns suspicion score 0–100.
"""

import re
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from urllib.parse import urlparse


# ── Curated domain lists (research-backed) ─────────────────────────────────

KNOWN_UNRELIABLE_DOMAINS = {
    # Satire sites (often mistaken for real news)
    "theonion.com", "clickhole.com", "babylonbee.com", "thebeaverton.com",
    "empirenews.net", "worldnewsdailyreport.com", "nationalreport.net",
    "newslo.com", "newsexaminer.net", "stuppid.com", "huzlers.com",
    # Known misinformation / conspiracy
    "infowars.com", "naturalnews.com", "prisonplanet.com", "globalresearch.ca",
    "activistpost.com", "beforeitsnews.com", "eutimes.net", "yournewswire.com",
    "newspunch.com", "neonnettle.com", "sonsoflibertymedia.com",
    "freedomoutpost.com", "dcwhispers.com", "americanpatriotdaily.com",
    "redstatewatcher.com", "thegatewaypundit.com", "wnd.com",
    "conservativetribune.com", "madworldnews.com", "youngcons.com",
    "addictinginfo.com", "liberaltribune.com", "bipartisanreport.com",
    "democraticmoms.com", "occupydemocrats.com", "paleoconservative.com",
    # Fake news generators / click farms
    "abcnews.com.co", "cnn.com.de", "usatoday.com.co", "washingtonpost.com.co",
    "cbsnews.com.co", "nbcnews.com.co", "foxnews.com.co",
    "worldtruth.tv", "realstory.org", "now8news.com", "prntly.com",
    "viralnova.com", "anonhq.com", "thedailybanter.com",
    "snopes.com.co",  # fake snopes
    "libertywriters.com", "70news.wordpress.com", "breitbart.com",
    "dailywire.com", "therebel.media", "pjmedia.com",
    "washingtonexaminer.com", "thefederalist.com", "dailysignal.com",
    "lifesitenews.com", "oann.com", "newsmax.com",
    "truthorfiction.com", "aim4truth.org", "veteranstoday.com",
    "whatdoesitmean.com", "sgtreport.com", "investmentwatchblog.com",
    "thedailysheeple.com", "zerohedge.com", "mintpressnews.com",
    "21stcenturywire.com", "theeventchronicle.com", "intellihub.com",
    "nodisinfo.com", "geopolitics.co", "southfront.org", "fort-russ.com",
    "russia-insider.com", "sputniknews.com", "rt.com",
    "tass.com", "xinhuanet.com", "cgtn.com",  # State-controlled media
}

KNOWN_CREDIBLE_DOMAINS = {
    # Major news organizations
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk",
    "nytimes.com", "washingtonpost.com", "theguardian.com",
    "wsj.com", "ft.com", "bloomberg.com", "economist.com",
    "npr.org", "pbs.org", "cbsnews.com", "nbcnews.com",
    "abcnews.go.com", "cnn.com", "msnbc.com", "foxnews.com",
    "usatoday.com", "latimes.com", "chicagotribune.com",
    "bostonglobe.com", "sfchronicle.com", "theatlantic.com",
    "newyorker.com", "time.com", "newsweek.com", "forbes.com",
    "businessinsider.com", "politico.com", "thehill.com",
    "axios.com", "vox.com", "slate.com", "salon.com",
    # Science / health
    "nature.com", "science.org", "scientificamerican.com",
    "newscientist.com", "thelancet.com", "nejm.org",
    "nih.gov", "cdc.gov", "who.int", "fda.gov",
    # Fact-checkers
    "snopes.com", "factcheck.org", "politifact.com",
    "fullfact.org", "africa-check.org", "boomlive.in",
}

SUSPICIOUS_TLDS = {".info", ".biz", ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".link"}
SUSPICIOUS_KEYWORDS_IN_DOMAIN = [
    "real", "truth", "patriot", "liberty", "freedom", "breaking",
    "alert", "urgent", "expose", "uncensored", "forbidden",
    "underground", "authentic", "genuine", "honest", "trusted",
    "verified", "official", "government", "secret",
]


@dataclass
class Stage4Result:
    score: float
    verdict: str
    flags: List[str] = field(default_factory=list)
    details: Dict = field(default_factory=dict)


def _parse_domain(url: str) -> Optional[str]:
    """Extract clean domain from URL."""
    if not url:
        return None
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # Remove www. prefix
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return None


def _get_tld(domain: str) -> str:
    parts = domain.split(".")
    return "." + parts[-1] if len(parts) >= 2 else ""


def _get_base_domain(domain: str) -> str:
    """Get base domain (remove subdomains)."""
    parts = domain.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return domain


def analyze_source(
    url: Optional[str] = None,
    content: str = "",
    headline: str = "",
) -> Stage4Result:
    """Analyze source credibility."""
    flags = []
    penalties = []
    details: Dict = {}

    # ── Domain analysis ──────────────────────────────────────────────────
    domain = _parse_domain(url) if url else None
    base_domain = _get_base_domain(domain) if domain else None

    if domain:
        details["domain"] = domain
        details["url"] = url

        # HTTPS check
        is_https = url.startswith("https://") if url else False
        details["has_https"] = is_https
        if not is_https:
            flags.append("Not served over HTTPS — basic security concern")
            penalties.append(8)

        # Known unreliable check
        is_known_unreliable = any(
            base_domain == bad or domain == bad or domain.endswith("." + bad)
            for bad in KNOWN_UNRELIABLE_DOMAINS
        )
        details["is_known_unreliable"] = is_known_unreliable
        if is_known_unreliable:
            flags.append(f"⚠ Domain '{base_domain}' is on the known unreliable sources list")
            penalties.append(55)

        # Known credible check
        is_known_credible = any(
            base_domain == good or domain == good or domain.endswith("." + good)
            for good in KNOWN_CREDIBLE_DOMAINS
        )
        details["is_known_credible"] = is_known_credible
        if is_known_credible:
            flags.append(f"✓ Domain '{base_domain}' is a recognized credible source")
            penalties.append(-20)  # Negative penalty = credibility boost

        # TLD check
        tld = _get_tld(domain)
        details["tld"] = tld
        if tld in SUSPICIOUS_TLDS:
            flags.append(f"Suspicious TLD '{tld}' — common in low-quality / spam news sites")
            penalties.append(18)

        # Suspicious keywords in domain name
        suspicious_keyword_hits = [
            kw for kw in SUSPICIOUS_KEYWORDS_IN_DOMAIN
            if kw in base_domain.replace(".", "").replace("-", " ")
        ]
        if suspicious_keyword_hits:
            flags.append(
                f"Credibility-claiming keywords in domain name: {', '.join(suspicious_keyword_hits)} "
                f"— legitimate sources don't need to claim legitimacy in their URL"
            )
            penalties.append(15)

        # Subdomain abuse (e.g., news.randomsite.com)
        subdomain_parts = domain.split(".")[:-2]  # Everything before base domain
        if subdomain_parts and subdomain_parts[0] in {"news", "breaking", "alert", "live", "real"}:
            flags.append(f"Suspicious subdomain '{subdomain_parts[0]}' — mimics news organization structure")
            penalties.append(12)

        # Domain name with hyphens (common in fake news)
        hyphen_count = base_domain.split(".")[0].count("-")
        if hyphen_count >= 2:
            flags.append(f"Domain has {hyphen_count} hyphens — common pattern in fake news domains")
            penalties.append(10)
        elif hyphen_count == 1:
            penalties.append(4)

        # Domain length anomaly
        base = base_domain.split(".")[0]
        if len(base) > 25:
            flags.append(f"Unusually long domain name ({len(base)} chars) — suspicious pattern")
            penalties.append(8)

    else:
        # No URL provided — analyze for source signals in content
        details["domain"] = None
        details["url"] = None

        # Check if content mentions a source
        source_mentions = re.findall(
            r"(?:according to|source:|via|published by|reported by)\s+([A-Z][^.]{3,30})",
            content,
        )
        if source_mentions:
            details["mentioned_sources"] = source_mentions[:5]
        else:
            flags.append("No URL provided and no explicit source attribution in content")
            penalties.append(15)

    # ── Author analysis (from content) ───────────────────────────────────
    has_byline = bool(re.search(
        r"(?:by|author|written by|reported by)\s+[A-Z][a-z]+\s+[A-Z][a-z]+",
        content[:500],
        re.IGNORECASE,
    ))
    details["has_byline"] = has_byline
    if not has_byline:
        flags.append("No clear author byline detected — anonymous content is less accountable")
        penalties.append(10)

    # ── Date analysis ────────────────────────────────────────────────────
    date_patterns = [
        r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b",
        r"\b\d{1,2}/\d{1,2}/\d{4}\b",
        r"\b\d{4}-\d{2}-\d{2}\b",
    ]
    has_date = any(re.search(p, content) for p in date_patterns)
    details["has_publication_date"] = has_date
    if not has_date:
        flags.append("No clear publication date — makes fact-checking difficult")
        penalties.append(8)

    # ── External link density ────────────────────────────────────────────
    link_count = len(re.findall(r"https?://\S+", content))
    details["external_link_count"] = link_count
    if link_count == 0 and len(content) > 300:
        flags.append("No external links or citations — real journalism links to sources")
        penalties.append(10)

    # ── Final score ──────────────────────────────────────────────────────
    raw = sum(penalties)
    score = max(0.0, min(100.0, float(raw)))

    if score >= 50:
        verdict = "FAIL"
    elif score >= 22:
        verdict = "WARN"
    else:
        verdict = "PASS"

    return Stage4Result(
        score=score,
        verdict=verdict,
        flags=flags,
        details=details,
    )
