"""
Stage 1 — Headline Analyzer

The first firewall gate. Analyzes the article headline for:
  - Clickbait patterns (numbered lists, "You won't believe...", etc.)
  - ALL CAPS abuse (ratio of caps to total characters)
  - Excessive punctuation (!!!, ???, ...)
  - Sensationalist trigger words
  - Emotional manipulation language
  - Headline-length anomalies (too short = clickbait, very long = suspicious)
  - Question-based framing ("Is X trying to...?")
  - Contradictory/absolutist language ("ALWAYS", "NEVER", "DESTROY")

Returns a suspicion score 0–100 and a list of flagged issues.
"""

import re
from dataclasses import dataclass, field
from typing import List, Dict


# ── Wordlists ──────────────────────────────────────────────────────────────

CLICKBAIT_PATTERNS = [
    r"\bwon'?t believe\b",
    r"\byou need to (see|know|read)\b",
    r"\bwhat happens next\b",
    r"\bthis is why\b",
    r"\bthe truth about\b",
    r"\bsecret(s)? (they|the government|doctors?)\b",
    r"\bbreaking\s*:?\s*",
    r"\bexclusive\s*:?\s*",
    r"\burgent\s*:?\s*",
    r"\balert\s*:?\s*",
    r"\bshocking\b",
    r"\bblowing up\b",
    r"\bviral\b",
    r"\bwhat (he|she|they) said\b",
    r"\bthe real reason\b",
    r"\bno one is talking about\b",
    r"\bthey don'?t want you to know\b",
    r"\bthis will (shock|surprise|stun)\b",
    r"^\d+\s+(things|reasons|ways|facts|secrets|tricks|signs)",
    r"\bhere'?s what\b",
    r"\bwatch what happens\b",
    r"\bthis changes everything\b",
]

SENSATIONALIST_WORDS = {
    "explosive", "bombshell", "outrage", "scandal", "chaos", "crisis",
    "catastrophe", "disaster", "panic", "terror", "horrifying", "devastating",
    "shocking", "unbelievable", "incredible", "mind-blowing", "stunning",
    "exposed", "revealed", "leaked", "banned", "censored", "suppressed",
    "cover-up", "conspiracy", "hoax", "fraud", "corrupt", "rigged",
    "betrayal", "traitor", "collusion", "propaganda", "agenda",
    "mainstream media", "fake news", "globalist", "deep state",
    "woke", "radical", "extreme", "dangerous", "toxic", "evil",
    "destroy", "obliterate", "crush", "slam", "blast", "savage",
    "destroy", "decimate", "rip", "annihilate",
}

ABSOLUTIST_WORDS = {
    "always", "never", "every", "all", "none", "nobody", "everybody",
    "everything", "nothing", "impossible", "definitely", "certainly",
    "proves", "confirms", "undeniable", "irrefutable", "100%",
    "completely", "totally", "absolutely", "guaranteed",
}

EMOTIONAL_TRIGGER_WORDS = {
    "outrage", "disgusting", "horrifying", "sickening", "shameful",
    "pathetic", "disgusted", "furious", "enraged", "terrified", "scared",
    "worried", "angry", "hate", "love", "must", "need", "urgent",
    "now", "immediately", "today", "before it's too late",
}


@dataclass
class Stage1Result:
    score: float                     # 0 = clean, 100 = very suspicious
    verdict: str                     # PASS / WARN / FAIL
    flags: List[str] = field(default_factory=list)
    details: Dict = field(default_factory=dict)


def analyze_headline(headline: str) -> Stage1Result:
    """
    Run all headline checks and return a Stage1Result.
    """
    if not headline or not headline.strip():
        return Stage1Result(
            score=50.0,
            verdict="WARN",
            flags=["No headline provided"],
            details={"note": "Missing headline is itself suspicious"},
        )

    text = headline.strip()
    text_lower = text.lower()
    flags = []
    penalties = []

    # ── 1. ALL CAPS ratio ────────────────────────────────────────────────
    alpha_chars = [c for c in text if c.isalpha()]
    caps_ratio = sum(1 for c in alpha_chars if c.isupper()) / max(len(alpha_chars), 1)
    if caps_ratio > 0.6:
        flags.append(f"Excessive ALL CAPS ({caps_ratio:.0%} uppercase)")
        penalties.append(25)
    elif caps_ratio > 0.35:
        flags.append(f"Elevated capitalization ({caps_ratio:.0%} uppercase)")
        penalties.append(12)

    # ── 2. Punctuation abuse ─────────────────────────────────────────────
    exclamation_count = text.count("!")
    question_count = text.count("?")
    ellipsis_count = text.count("...")

    if exclamation_count >= 3:
        flags.append(f"Excessive exclamation marks ({exclamation_count})")
        penalties.append(20)
    elif exclamation_count >= 2:
        flags.append(f"Multiple exclamation marks ({exclamation_count})")
        penalties.append(10)

    if question_count >= 2:
        flags.append(f"Multiple question marks — leading question ({question_count})")
        penalties.append(10)

    if ellipsis_count >= 2:
        flags.append("Heavy use of ellipsis (...) — tension-building technique")
        penalties.append(8)

    # ── 3. Clickbait pattern matching ───────────────────────────────────
    matched_clickbait = []
    for pattern in CLICKBAIT_PATTERNS:
        if re.search(pattern, text_lower):
            matched_clickbait.append(pattern)

    if matched_clickbait:
        flags.append(f"Clickbait language pattern detected ({len(matched_clickbait)} match(es))")
        penalties.append(min(30, 15 * len(matched_clickbait)))

    # ── 4. Sensationalist word count ─────────────────────────────────────
    words = re.findall(r"\b\w+\b", text_lower)
    sensational_hits = [w for w in words if w in SENSATIONALIST_WORDS]
    absolutist_hits = [w for w in words if w in ABSOLUTIST_WORDS]
    emotional_hits = [w for w in words if w in EMOTIONAL_TRIGGER_WORDS]

    if sensational_hits:
        flags.append(f"Sensationalist words: {', '.join(set(sensational_hits[:5]))}")
        penalties.append(min(25, 8 * len(sensational_hits)))

    if absolutist_hits:
        flags.append(f"Absolutist language: {', '.join(set(absolutist_hits[:4]))}")
        penalties.append(min(15, 6 * len(absolutist_hits)))

    if emotional_hits:
        flags.append(f"Emotional trigger language: {', '.join(set(emotional_hits[:4]))}")
        penalties.append(min(12, 5 * len(emotional_hits)))

    # ── 5. Headline length anomaly ───────────────────────────────────────
    word_count = len(words)
    if word_count < 3:
        flags.append(f"Suspiciously short headline ({word_count} words)")
        penalties.append(15)
    elif word_count > 25:
        flags.append(f"Unusually long headline ({word_count} words)")
        penalties.append(8)

    # ── 6. Question-based framing ────────────────────────────────────────
    if text.endswith("?") and any(
        text_lower.startswith(q) for q in ["is ", "are ", "did ", "does ", "was ", "will ", "can ", "could ", "should "]
    ):
        flags.append("Leading question framing — implies claim without evidence")
        penalties.append(12)

    # ── 7. Spacing anomalies ─────────────────────────────────────────────
    double_space = len(re.findall(r"  +", text))
    if double_space > 0:
        flags.append(f"Irregular spacing ({double_space} instances of multiple spaces)")
        penalties.append(5)

    # ── 8. Number-based clickbait ────────────────────────────────────────
    if re.match(r"^\d+\b", text):
        flags.append("Numbered clickbait format (e.g. '10 Things...')")
        penalties.append(10)

    # ── Compute final score ──────────────────────────────────────────────
    raw = sum(penalties)
    score = min(100.0, float(raw))

    if score >= 60:
        verdict = "FAIL"
    elif score >= 30:
        verdict = "WARN"
    else:
        verdict = "PASS"

    return Stage1Result(
        score=score,
        verdict=verdict,
        flags=flags,
        details={
            "caps_ratio": round(caps_ratio, 3),
            "exclamation_count": exclamation_count,
            "question_count": question_count,
            "word_count": word_count,
            "sensational_words": list(set(sensational_hits)),
            "absolutist_words": list(set(absolutist_hits)),
            "clickbait_matches": len(matched_clickbait),
        },
    )
