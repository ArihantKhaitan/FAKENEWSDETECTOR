"""
Web scraper — extracts headline and content from a news article URL.

Uses requests + BeautifulSoup with multiple extraction strategies:
  1. Open Graph meta tags (og:title, og:description)
  2. JSON-LD structured data (schema.org/Article)
  3. Common article CSS selectors (article, main, .article-body, etc.)
  4. Largest text block heuristic (fallback)
"""

import re
from typing import Tuple, Optional
from urllib.parse import urlparse

try:
    import requests
    from bs4 import BeautifulSoup
    SCRAPER_AVAILABLE = True
except ImportError:
    SCRAPER_AVAILABLE = False

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

ARTICLE_SELECTORS = [
    "article",
    '[class*="article-body"]',
    '[class*="story-body"]',
    '[class*="article-content"]',
    '[class*="entry-content"]',
    '[class*="post-content"]',
    '[class*="content-body"]',
    "main article",
    ".article",
    ".story",
    "#article-body",
    "#main-content",
]

HEADLINE_SELECTORS = [
    "h1.article-title",
    "h1.story-title",
    "h1.entry-title",
    "h1.post-title",
    "h1.headline",
    "h1",
]


def _clean_text(text: str) -> str:
    """Remove excess whitespace and non-content characters."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_from_meta(soup) -> Tuple[str, str]:
    """Extract from Open Graph / Twitter Card meta tags."""
    title = ""
    description = ""

    og_title = soup.find("meta", property="og:title")
    if og_title:
        title = og_title.get("content", "")

    og_desc = soup.find("meta", property="og:description")
    if og_desc:
        description = og_desc.get("content", "")

    if not title:
        tw_title = soup.find("meta", attrs={"name": "twitter:title"})
        if tw_title:
            title = tw_title.get("content", "")

    return title.strip(), description.strip()


def _extract_from_jsonld(soup) -> Tuple[str, str]:
    """Extract from JSON-LD structured data (schema.org/Article)."""
    import json
    scripts = soup.find_all("script", type="application/ld+json")
    for script in scripts:
        try:
            data = json.loads(script.string or "{}")
            if isinstance(data, list):
                data = data[0] if data else {}
            if data.get("@type") in ("Article", "NewsArticle", "BlogPosting"):
                headline = data.get("headline", "")
                body = data.get("articleBody", "")
                if headline or body:
                    return headline.strip(), body.strip()
        except Exception:
            continue
    return "", ""


def _extract_content_block(soup) -> str:
    """Try CSS selectors for the article body."""
    # Remove clutter elements
    for tag in soup.find_all(["script", "style", "nav", "footer", "aside",
                               "header", "form", "iframe", "noscript"]):
        tag.decompose()

    # Remove comment sections, ads, etc.
    for cls in ["comments", "comment", "advertisement", "ad", "social-share",
                 "related-articles", "newsletter", "signup", "sidebar"]:
        for tag in soup.find_all(class_=re.compile(cls, re.IGNORECASE)):
            tag.decompose()

    # Try specific selectors
    for selector in ARTICLE_SELECTORS:
        try:
            element = soup.select_one(selector)
            if element:
                text = _clean_text(element.get_text(separator=" "))
                if len(text) > 200:
                    return text
        except Exception:
            continue

    # Fallback: find the largest <p> block cluster
    paragraphs = soup.find_all("p")
    if paragraphs:
        text_blocks = []
        for p in paragraphs:
            t = p.get_text(separator=" ").strip()
            if len(t) > 40:
                text_blocks.append(t)
        if text_blocks:
            return _clean_text(" ".join(text_blocks))

    return ""


def _extract_headline(soup) -> str:
    for selector in HEADLINE_SELECTORS:
        try:
            el = soup.select_one(selector)
            if el:
                return el.get_text().strip()
        except Exception:
            continue
    return ""


def scrape_article(url: str, timeout: int = 10) -> Tuple[str, str, Optional[str]]:
    """
    Scrape a news article URL and return (headline, content, error).

    Returns:
        headline: Article title/headline string.
        content:  Article body text.
        error:    Error message if scraping failed, else None.
    """
    if not SCRAPER_AVAILABLE:
        return "", "", "requests/beautifulsoup4 not installed. Run: pip install requests beautifulsoup4"

    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        response.raise_for_status()
    except Exception as e:
        return "", "", f"Failed to fetch URL: {str(e)}"

    try:
        soup = BeautifulSoup(response.text, "html.parser")
    except Exception as e:
        return "", "", f"Failed to parse HTML: {str(e)}"

    # Try extraction strategies in order
    headline, content = _extract_from_jsonld(soup)
    if not headline:
        headline, _ = _extract_from_meta(soup)
    if not headline:
        headline = _extract_headline(soup)

    if not content or len(content) < 200:
        content = _extract_content_block(soup)

    if not content:
        meta_title, meta_desc = _extract_from_meta(soup)
        content = meta_desc

    if not headline and not content:
        return "", "", "Could not extract article content from this URL"

    return headline[:500], content[:15000], None  # Cap content at 15k chars
