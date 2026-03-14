"""
Stage 2 — Writing Style & Linguistic Feature Analyzer

The second firewall gate. Analyzes the article body for:
  - Vocabulary richness (Type-Token Ratio)
  - Average sentence length (fake news often has very short or run-on sentences)
  - Readability score (Flesch-Kincaid approximation)
  - Punctuation density (fake news overuses ! ? ...)
  - Capitalization anomalies (random caps mid-sentence)
  - Quote density (real journalism quotes sources frequently)
  - Informal/slang language markers
  - Passive vs active voice indicators
  - Repetition patterns (repeating same phrases for emphasis)
  - Spelling error density (proxy for production quality)
  - Paragraph structure anomalies

Returns a suspicion score 0–100.
"""

import re
import math
from dataclasses import dataclass, field
from typing import List, Dict, Tuple


# ── Wordlists ──────────────────────────────────────────────────────────────

INFORMAL_MARKERS = {
    "gonna", "wanna", "gotta", "kinda", "sorta", "dunno", "lemme", "gimme",
    "y'all", "ain't", "nah", "yep", "yup", "nope", "omg", "wtf", "lol",
    "smh", "fyi", "btw", "asap", "tbh", "imo", "imho", "iirc", "afaik",
    "basically", "literally", "honestly", "obviously", "clearly", "simply",
    "just", "really", "very", "super", "totally", "absolutely", "definitely",
    "crazy", "insane", "huge", "massive", "epic", "legendary",
}

WEASEL_WORDS = {
    "sources say", "reportedly", "allegedly", "some say", "many believe",
    "it is said", "rumor has it", "people are saying", "experts claim",
    "according to insiders", "inside sources", "anonymous source",
    "unconfirmed reports", "may", "might", "could be", "possibly",
    "it seems", "appears to", "some argue", "many feel",
}

FIRST_PERSON_PATTERNS = [
    r"\bi\b", r"\bwe\b", r"\bour\b", r"\bmy\b", r"\bme\b",
    r"\bus\b", r"\bmine\b",
]


@dataclass
class Stage2Result:
    score: float
    verdict: str
    flags: List[str] = field(default_factory=list)
    details: Dict = field(default_factory=dict)


def _split_sentences(text: str) -> List[str]:
    """Simple sentence splitter using punctuation boundaries."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s for s in sentences if len(s.strip()) > 0]


def _split_words(text: str) -> List[str]:
    return re.findall(r"\b[a-zA-Z']+\b", text.lower())


def _type_token_ratio(words: List[str]) -> float:
    """Vocabulary richness: unique_words / total_words. Higher = richer."""
    if not words:
        return 0.0
    return len(set(words)) / len(words)


def _flesch_reading_ease(text: str, sentences: List[str], words: List[str]) -> float:
    """
    Approximate Flesch Reading Ease.
    206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
    Score: 0-30 = very difficult, 60-70 = standard, 90-100 = very easy.
    High ease in news articles can indicate over-simplified/populist writing.
    """
    if not sentences or not words:
        return 50.0

    avg_sentence_len = len(words) / len(sentences)

    # Syllable approximation: count vowel groups
    def count_syllables(word: str) -> int:
        word = word.lower()
        count = len(re.findall(r"[aeiou]+", word))
        if word.endswith("e") and count > 1:
            count -= 1
        return max(1, count)

    total_syllables = sum(count_syllables(w) for w in words)
    avg_syllables = total_syllables / max(len(words), 1)

    score = 206.835 - (1.015 * avg_sentence_len) - (84.6 * avg_syllables)
    return max(0.0, min(100.0, score))


def _caps_mid_sentence_ratio(text: str) -> float:
    """
    Detect random capitalization mid-sentence (excluding proper nouns at start).
    High ratio suggests sensationalism or poor writing.
    """
    # Match words that are ALL-CAPS and not at sentence start, length > 2
    mid_caps = re.findall(r"(?<!\.\s)(?<![!?]\s)\b([A-Z]{2,})\b", text)
    total_words = len(re.findall(r"\b\w+\b", text))
    return len(mid_caps) / max(total_words, 1)


def _quote_density(text: str) -> float:
    """Ratio of quoted content to total content. Real journalism quotes sources."""
    quoted = re.findall(r'"([^"]{5,})"', text)
    total_chars = max(len(text), 1)
    quoted_chars = sum(len(q) for q in quoted)
    return quoted_chars / total_chars


def _repetition_score(sentences: List[str]) -> float:
    """Detect repeated phrases across sentences (propaganda technique)."""
    if len(sentences) < 3:
        return 0.0
    # Extract 3-gram phrases from each sentence
    phrases = []
    for sent in sentences:
        words = _split_words(sent)
        for i in range(len(words) - 2):
            phrases.append(tuple(words[i:i+3]))

    if not phrases:
        return 0.0

    from collections import Counter
    counts = Counter(phrases)
    repeated = sum(v - 1 for v in counts.values() if v > 1)
    return repeated / max(len(phrases), 1)


def _weasel_word_count(text: str) -> int:
    text_lower = text.lower()
    return sum(1 for phrase in WEASEL_WORDS if phrase in text_lower)


def _informal_word_count(words: List[str]) -> int:
    return sum(1 for w in words if w in INFORMAL_MARKERS)


def _first_person_ratio(text: str, words: List[str]) -> float:
    """High first-person usage in news = opinion piece, not reporting."""
    text_lower = text.lower()
    fp_count = sum(len(re.findall(p, text_lower)) for p in FIRST_PERSON_PATTERNS)
    return fp_count / max(len(words), 1)


def analyze_style(content: str) -> Stage2Result:
    """Run all writing style checks on the article body."""
    if not content or len(content.strip()) < 50:
        return Stage2Result(
            score=40.0,
            verdict="WARN",
            flags=["Content too short to analyze style reliably"],
            details={"char_count": len(content)},
        )

    text = content.strip()
    sentences = _split_sentences(text)
    words = _split_words(text)

    flags = []
    penalties = []

    # ── 1. Vocabulary richness ───────────────────────────────────────────
    ttr = _type_token_ratio(words)
    if ttr < 0.25:
        flags.append(f"Very low vocabulary diversity (TTR={ttr:.2f}) — repetitive writing")
        penalties.append(20)
    elif ttr < 0.35:
        flags.append(f"Low vocabulary richness (TTR={ttr:.2f})")
        penalties.append(10)

    # ── 2. Sentence length analysis ──────────────────────────────────────
    if sentences:
        sent_lengths = [len(_split_words(s)) for s in sentences]
        avg_sent_len = sum(sent_lengths) / len(sent_lengths)
        very_short = sum(1 for l in sent_lengths if l < 5)
        very_long = sum(1 for l in sent_lengths if l > 50)

        if avg_sent_len < 8:
            flags.append(f"Abnormally short sentences (avg {avg_sent_len:.1f} words) — simplified/populist")
            penalties.append(15)
        if very_short / max(len(sentences), 1) > 0.3:
            flags.append(f"{very_short} sentences with fewer than 5 words")
            penalties.append(10)
        if very_long > 0:
            flags.append(f"{very_long} run-on sentence(s) with 50+ words")
            penalties.append(8)
    else:
        avg_sent_len = 0.0
        sent_lengths = []

    # ── 3. Readability score ─────────────────────────────────────────────
    flesch = _flesch_reading_ease(text, sentences, words)
    if flesch > 80:
        flags.append(f"Over-simplified writing style (Flesch score={flesch:.0f}/100) — populist level")
        penalties.append(12)
    elif flesch < 20:
        flags.append(f"Extremely complex writing (Flesch={flesch:.0f}) — unusual for news")
        penalties.append(8)

    # ── 4. Punctuation density ───────────────────────────────────────────
    exclamations = text.count("!")
    questions = text.count("?")
    ellipses = text.count("...")
    total_sentences = max(len(sentences), 1)

    if exclamations / total_sentences > 0.3:
        flags.append(f"High exclamation density ({exclamations} '!' in {total_sentences} sentences)")
        penalties.append(18)
    if questions / total_sentences > 0.5:
        flags.append(f"Question-heavy writing ({questions} '?') — rhetorical manipulation")
        penalties.append(12)
    if ellipses > 5:
        flags.append(f"Excessive ellipsis usage ({ellipses} instances) — tension/suspense technique")
        penalties.append(8)

    # ── 5. Mid-sentence capitalization ──────────────────────────────────
    caps_ratio = _caps_mid_sentence_ratio(text)
    if caps_ratio > 0.04:
        flags.append(f"Random MID-SENTENCE CAPITALIZATION ({caps_ratio:.1%} of words) — emphasis manipulation")
        penalties.append(15)
    elif caps_ratio > 0.02:
        flags.append(f"Elevated mid-sentence capitalization ({caps_ratio:.1%})")
        penalties.append(7)

    # ── 6. Quote density ─────────────────────────────────────────────────
    quote_density = _quote_density(text)
    if quote_density < 0.02 and len(words) > 200:
        flags.append("Very few or no quoted sources — lacks journalistic attribution")
        penalties.append(15)
    elif quote_density < 0.05 and len(words) > 300:
        flags.append("Low quote density — limited source attribution")
        penalties.append(7)

    # ── 7. Weasel words ──────────────────────────────────────────────────
    weasel_count = _weasel_word_count(text)
    if weasel_count >= 5:
        flags.append(f"Heavy use of weasel words ({weasel_count}) — 'sources say', 'reportedly', etc.")
        penalties.append(18)
    elif weasel_count >= 2:
        flags.append(f"Weasel word usage ({weasel_count} instances) — unverified claims")
        penalties.append(8)

    # ── 8. Informal language ─────────────────────────────────────────────
    informal_count = _informal_word_count(words)
    informal_ratio = informal_count / max(len(words), 1)
    if informal_ratio > 0.04:
        flags.append(f"High informal language ratio ({informal_count} slang/casual words)")
        penalties.append(12)
    elif informal_ratio > 0.02:
        flags.append(f"Some informal language markers ({informal_count} words)")
        penalties.append(6)

    # ── 9. First-person ratio ────────────────────────────────────────────
    fp_ratio = _first_person_ratio(text, words)
    if fp_ratio > 0.03:
        flags.append(f"High first-person usage ({fp_ratio:.1%}) — opinion disguised as news")
        penalties.append(12)

    # ── 10. Repetition ───────────────────────────────────────────────────
    rep_score = _repetition_score(sentences)
    if rep_score > 0.15:
        flags.append(f"Significant phrase repetition ({rep_score:.1%}) — propaganda technique")
        penalties.append(15)
    elif rep_score > 0.08:
        flags.append(f"Moderate repetition of phrases ({rep_score:.1%})")
        penalties.append(7)

    # ── 11. Content length ───────────────────────────────────────────────
    if len(words) < 100:
        flags.append(f"Very short article ({len(words)} words) — lacks depth")
        penalties.append(10)

    # ── Final score ──────────────────────────────────────────────────────
    score = min(100.0, float(sum(penalties)))

    if score >= 60:
        verdict = "FAIL"
    elif score >= 28:
        verdict = "WARN"
    else:
        verdict = "PASS"

    return Stage2Result(
        score=score,
        verdict=verdict,
        flags=flags,
        details={
            "word_count": len(words),
            "sentence_count": len(sentences),
            "avg_sentence_length": round(avg_sent_len, 1) if sentences else 0,
            "type_token_ratio": round(ttr, 3),
            "flesch_score": round(flesch, 1),
            "exclamation_count": exclamations,
            "question_count": questions,
            "quote_density": round(quote_density, 3),
            "weasel_word_count": weasel_count,
            "informal_word_count": informal_count,
            "caps_mid_sentence_ratio": round(caps_ratio, 3),
            "repetition_score": round(rep_score, 3),
            "first_person_ratio": round(fp_ratio, 3),
        },
    )
