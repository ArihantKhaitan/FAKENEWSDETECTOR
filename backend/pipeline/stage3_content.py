"""
Stage 3 — Deep Learning Content Analyzer

The third firewall gate. Uses pre-trained transformer models from HuggingFace
to classify the content as FAKE or REAL using learned semantic patterns.

Models used (loaded from HuggingFace Hub — no local training required):
  Primary:   "hamzab/roberta-fake-news-classification"   (RoBERTa)
  Fallback:  "mrm8488/bert-tiny-finetuned-fake_news_detection" (tiny BERT)
  Fallback2: TF-IDF + Logistic Regression (pure algorithmic, no GPU needed)

Also computes:
  - Sentiment polarity (positive/negative/neutral)
  - Emotional intensity score
  - Named entity density (real news cites more specific entities)
  - Headline-body consistency (title vs content semantic similarity)

The model is loaded lazily and cached after first call.
"""

import re
import os
import math
import threading
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from functools import lru_cache

# Will be imported lazily to avoid crash if not installed
_pipeline_cache = {}
_load_lock = threading.Lock()          # prevents race condition on primary model
_model_lock = threading.Lock()         # prevents race condition on comparison models

HF_MODELS = [
    # 1. Custom trained model (130k articles, WELFake+LIAR+more) — use after running train_kaggle.py
    "Arihant2409/truthlens-fake-news-detector",
    # 2. DistilRoBERTa fine-tuned on fake news
    "vikram71198/distilroberta-base-finetuned-fake-news-detection",
    # 3. RoBERTa trained on WELFake
    "hamzab/roberta-fake-news-classification",
    # 4. BERT detect (large training set)
    "jy46604790/Fake-News-Bert-Detect",
    # 5. Tiny BERT fallback (fastest, lowest memory)
    "mrm8488/bert-tiny-finetuned-fake-news-detection",
]

# Models shown in the UI comparison panel (display name, model id, color)
COMPARISON_MODELS = [
    {
        "id": "Arihant2409/truthlens-fake-news-detector",
        "name": "TruthLens Custom",
        "short": "Custom (trained on 130k)",
        "color": "#BF5AF2",
        "trained_on": "WELFake + LIAR + GonzaloA (~130k articles)",
    },
    {
        "id": "hamzab/roberta-fake-news-classification",
        "name": "RoBERTa (hamzab)",
        "short": "RoBERTa WELFake",
        "color": "#0071E3",
        "trained_on": "WELFake dataset (~72k articles)",
    },
    {
        "id": "vikram71198/distilroberta-base-finetuned-fake-news-detection",
        "name": "DistilRoBERTa",
        "short": "DistilRoBERTa",
        "color": "#30D158",
        "trained_on": "Fake news classification dataset",
    },
    {
        "id": "mrm8488/bert-tiny-finetuned-fake-news-detection",
        "name": "BERT-Tiny",
        "short": "BERT-tiny (fast)",
        "color": "#FF9F0A",
        "trained_on": "Fake news dataset (lightweight)",
    },
]

# Per-model pipeline cache: {model_id: pipeline_or_None}
_model_cache: dict = {}

# Sentiment word lists for fallback
POSITIVE_WORDS = {
    "good", "great", "excellent", "positive", "success", "win", "improve",
    "benefit", "help", "support", "safe", "true", "verified", "confirmed",
    "official", "legitimate", "accurate", "correct", "right", "peace",
}
NEGATIVE_WORDS = {
    "bad", "terrible", "awful", "negative", "fail", "destroy", "harm",
    "danger", "threat", "attack", "lie", "false", "fake", "wrong", "corrupt",
    "evil", "criminal", "illegal", "disaster", "crisis", "collapse",
}
NAMED_ENTITY_INDICATORS = [
    r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b",  # Proper names (two-word)
    r"\b[A-Z]{2,}\b",                    # Acronyms (FBI, UN, WHO)
    r"\b\d{4}\b",                        # Years
    r"\b\$[\d,]+\b",                     # Dollar amounts
    r"\b\d+%\b",                         # Percentages
    r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\b",
]


@dataclass
class Stage3Result:
    score: float                       # 0=clean, 100=very suspicious
    verdict: str                       # PASS / WARN / FAIL
    flags: List[str] = field(default_factory=list)
    details: Dict = field(default_factory=dict)
    attention_words: List[Dict] = field(default_factory=list)  # [{word, weight}]
    model_used: str = "heuristic"


def _get_hf_pipeline(task="text-classification"):
    """Lazily load HuggingFace pipeline, trying models in order. Thread-safe."""
    global _pipeline_cache
    if "classifier" in _pipeline_cache:
        return _pipeline_cache["classifier"], _pipeline_cache["model_name"]

    with _load_lock:
        # double-check after acquiring lock
        if "classifier" in _pipeline_cache:
            return _pipeline_cache["classifier"], _pipeline_cache["model_name"]

        try:
            from transformers import pipeline as hf_pipeline
            import torch

            device = 0 if torch.cuda.is_available() else -1

            for model_name in HF_MODELS:
                try:
                    print(f"[Stage3] Loading model: {model_name}")
                    clf = hf_pipeline(
                        task,
                        model=model_name,
                        device=device,
                        truncation=True,
                        max_length=512,
                    )
                    # DistilBERT models use a BERT tokenizer that emits token_type_ids,
                    # but DistilBERT's forward() doesn't accept them → remove from inputs.
                    try:
                        clf.tokenizer.model_input_names = [
                            n for n in clf.tokenizer.model_input_names
                            if n != "token_type_ids"
                        ]
                    except Exception:
                        pass
                    _pipeline_cache["classifier"] = clf
                    _pipeline_cache["model_name"] = model_name
                    print(f"[Stage3] Model loaded: {model_name}")
                    return clf, model_name
                except Exception as e:
                    print(f"[Stage3] Failed to load {model_name}: {e}")
                    continue

        except ImportError:
            print("[Stage3] transformers not installed — using heuristic fallback")

        _pipeline_cache["classifier"] = None
        _pipeline_cache["model_name"] = "heuristic"
        return None, "heuristic"


def _load_single_model(model_id: str):
    """Load a single model pipeline, cached per model_id. Thread-safe."""
    if model_id in _model_cache:
        return _model_cache[model_id]
    with _model_lock:
        if model_id in _model_cache:  # double-check after lock
            return _model_cache[model_id]
        try:
            from transformers import pipeline as hf_pipeline
            import torch
            device = 0 if torch.cuda.is_available() else -1
            clf = hf_pipeline(
                "text-classification",
                model=model_id,
                device=device,
                truncation=True,
                max_length=512,
            )
            # Same DistilBERT fix: strip token_type_ids from tokenizer outputs
            try:
                clf.tokenizer.model_input_names = [
                    n for n in clf.tokenizer.model_input_names
                    if n != "token_type_ids"
                ]
            except Exception:
                pass
            _model_cache[model_id] = clf
            print(f"[Stage3] Loaded comparison model: {model_id}")
            return clf
        except Exception as e:
            print(f"[Stage3] Comparison model unavailable: {model_id} — {e}")
            _model_cache[model_id] = None
            return None


def preload_all_models():
    """Called at server startup to load all models into memory. Runs in background thread."""
    print("[Stage3] Preloading primary model...")
    _get_hf_pipeline()
    print("[Stage3] Preloading comparison models...")
    for meta in COMPARISON_MODELS:
        _load_single_model(meta["id"])
    print("[Stage3] All models ready.")


def get_models_status() -> dict:
    """Return current model loading status for the /api/status endpoint."""
    primary_ready = "classifier" in _pipeline_cache and _pipeline_cache["classifier"] is not None
    loaded = [m["id"] for m in COMPARISON_MODELS if _model_cache.get(m["id"]) is not None]
    return {
        "primary_ready": primary_ready,
        "primary_model": _pipeline_cache.get("model_name", "loading"),
        "comparison_loaded": len(loaded),
        "comparison_total": len(COMPARISON_MODELS),
        "models_ready": primary_ready,
    }


def _normalize_label(label: str, model_id: str) -> str:
    """Normalize different model label schemes to FAKE/REAL."""
    label = label.upper().strip()
    # jy46604790 uses LABEL_0=Fake, LABEL_1=Real (opposite of others)
    if "jy46604790" in model_id:
        if label in ("LABEL_0", "FAKE", "0"):
            return "FAKE"
        return "REAL"
    # Most models: LABEL_1=FAKE or explicit FAKE/REAL
    if label in ("FAKE", "LABEL_1", "1", "FALSE"):
        return "FAKE"
    return "REAL"


def _get_comparison_results(text: str) -> list:
    """
    Run all COMPARISON_MODELS on the text and return per-model predictions.
    Models load lazily and failures are silently skipped.
    """
    truncated = " ".join(text.split()[:400])
    results = []

    for meta in COMPARISON_MODELS:
        clf = _load_single_model(meta["id"])
        if clf is None:
            # Show as unavailable in UI
            results.append({
                "model_id": meta["id"],
                "name": meta["name"],
                "short": meta["short"],
                "color": meta["color"],
                "trained_on": meta["trained_on"],
                "label": "UNAVAILABLE",
                "confidence": 0.0,
                "risk_score": None,
                "available": False,
            })
            continue

        try:
            raw = clf(truncated)[0]
            label = _normalize_label(raw["label"], meta["id"])
            conf = float(raw["score"])
            risk = round(conf * 85) if label == "FAKE" else round((1 - conf) * 40)
            results.append({
                "model_id": meta["id"],
                "name": meta["name"],
                "short": meta["short"],
                "color": meta["color"],
                "trained_on": meta["trained_on"],
                "label": label,
                "confidence": round(conf, 4),
                "risk_score": risk,
                "available": True,
            })
        except Exception as e:
            print(f"[Stage3] Inference failed for {meta['id']}: {e}")
            results.append({
                "model_id": meta["id"],
                "name": meta["name"],
                "short": meta["short"],
                "color": meta["color"],
                "trained_on": meta["trained_on"],
                "label": "ERROR",
                "confidence": 0.0,
                "risk_score": None,
                "available": False,
            })

    return results


def _heuristic_fake_score(text: str) -> Tuple[float, str]:
    """
    Algorithmic fake news score when no ML model is available.
    Uses word-frequency patterns known to distinguish fake from real news.
    """
    words = re.findall(r"\b\w+\b", text.lower())
    if not words:
        return 50.0, "No content"

    # Known fake-news indicative words (from academic research)
    FAKE_INDICATORS = {
        "allegedly", "reportedly", "claims", "insists", "demands", "warns",
        "bombshell", "explosive", "shocking", "stunning", "unbelievable",
        "sources say", "anonymous", "insiders", "classified", "leaked",
        "cover-up", "deep state", "globalist", "mainstream media",
        "they don't want", "wake up", "sheeple", "cabal", "elites",
        "depopulation", "chemtrails", "microchip", "plandemic",
    }
    REAL_INDICATORS = {
        "according to", "stated", "announced", "confirmed", "published",
        "research shows", "study finds", "data indicates", "percent",
        "officials said", "spokesperson", "department", "administration",
        "university", "institute", "journal", "report", "survey",
    }

    text_lower = text.lower()
    fake_hits = sum(1 for w in FAKE_INDICATORS if w in text_lower)
    real_hits = sum(1 for w in REAL_INDICATORS if w in text_lower)

    # Score: proportion of fake indicators weighted against real indicators
    total = fake_hits + real_hits + 1
    score = (fake_hits / total) * 70 + 15  # base 15, max ~85
    reason = f"Heuristic: {fake_hits} fake indicators, {real_hits} credibility indicators"
    return min(100.0, max(0.0, score)), reason


def _compute_sentiment(words: List[str]) -> Dict:
    pos = sum(1 for w in words if w in POSITIVE_WORDS)
    neg = sum(1 for w in words if w in NEGATIVE_WORDS)
    total = max(pos + neg, 1)
    polarity = (pos - neg) / total
    return {
        "positive_words": pos,
        "negative_words": neg,
        "polarity": round(polarity, 3),
        "label": "positive" if polarity > 0.1 else ("negative" if polarity < -0.1 else "neutral"),
    }


def _named_entity_density(text: str) -> float:
    """Higher NE density → more specific reporting → more credible."""
    entity_matches = 0
    for pattern in NAMED_ENTITY_INDICATORS:
        entity_matches += len(re.findall(pattern, text))
    words = len(re.findall(r"\b\w+\b", text))
    return entity_matches / max(words, 1)


def _headline_body_consistency(headline: str, body: str) -> float:
    """
    Simple word-overlap metric between headline and body.
    Very low overlap suggests the body doesn't support the headline.
    """
    if not headline or not body:
        return 0.5
    h_words = set(re.findall(r"\b[a-z]{4,}\b", headline.lower()))
    b_words = set(re.findall(r"\b[a-z]{4,}\b", body.lower()))
    if not h_words:
        return 0.5
    overlap = len(h_words & b_words) / len(h_words)
    return overlap


def _extract_attention_words(text: str, top_n: int = 20) -> List[Dict]:
    """
    Extract top-N words by importance using TF-IDF-like scoring.
    Used for attention visualization in the UI.
    """
    # Word frequency
    words = re.findall(r"\b[a-z]{4,}\b", text.lower())
    stopwords = {
        "that", "this", "with", "have", "from", "they", "were", "been",
        "their", "said", "will", "would", "could", "should", "which", "there",
        "when", "what", "about", "also", "more", "than", "into", "some",
        "other", "after", "before", "through", "during", "between",
    }
    words = [w for w in words if w not in stopwords]

    from collections import Counter
    freq = Counter(words)
    total = max(sum(freq.values()), 1)

    # Bonus weight for fake-indicator words
    FAKE_BONUS = {
        "allegedly", "reportedly", "claims", "bombshell", "shocking",
        "explosive", "leaked", "cover", "sources", "insiders", "exposed",
        "scandal", "breaking", "exclusive", "urgent", "dangerous",
    }

    scored = []
    for word, count in freq.most_common(50):
        weight = count / total
        if word in FAKE_BONUS:
            weight *= 2.5
        scored.append({"word": word, "weight": round(weight, 4)})

    scored.sort(key=lambda x: x["weight"], reverse=True)
    # Normalize weights to 0-1
    max_w = scored[0]["weight"] if scored else 1
    for item in scored:
        item["weight"] = round(item["weight"] / max_w, 4)

    return scored[:top_n]


def analyze_content(headline: str, content: str) -> Stage3Result:
    """Run deep learning + feature analysis on article content."""
    if not content or len(content.strip()) < 50:
        return Stage3Result(
            score=45.0,
            verdict="WARN",
            flags=["Insufficient content for deep analysis"],
            details={},
            model_used="none",
        )

    text = f"{headline}. {content}".strip() if headline else content.strip()
    words = re.findall(r"\b\w+\b", text.lower())
    flags = []
    penalties = []

    # ── 1. ML Model Prediction ───────────────────────────────────────────
    clf, model_name = _get_hf_pipeline()
    ml_score = 50.0
    ml_label = "UNKNOWN"
    ml_confidence = 0.0

    if clf is not None:
        try:
            # Truncate to 512 tokens worth of text for the model
            truncated = " ".join(text.split()[:400])
            result = clf(truncated)[0]
            label = result["label"].upper()
            ml_confidence = float(result["score"])  # cast numpy.float32 → Python float

            # Normalize label to FAKE/REAL
            # Different models use different label schemes:
            #   hamzab/roberta    → "FAKE"/"REAL"
            #   vikram71198       → "LABEL_0"=REAL, "LABEL_1"=FAKE
            #   jy46604790        → "Fake"/"Real"
            #   mrm8488           → "FAKE"/"REAL"
            #   Arihant2409       → "FAKE"/"REAL"  (id2label set during training)
            is_fake = (
                label in ("FAKE", "LABEL_1", "1") or
                "FAKE" in label or "FALSE" in label or
                (label == "LABEL_0" and _pipeline_cache.get("model_name","").startswith("jy46604"))
            )
            if is_fake:
                ml_label = "FAKE"
                ml_score = ml_confidence * 85  # Scale to 0-85
            else:
                ml_label = "REAL"
                ml_score = (1 - ml_confidence) * 40  # Low suspicion

            if ml_label == "FAKE" and ml_confidence > 0.75:
                flags.append(f"ML model ({model_name.split('/')[0]}) classified as FAKE ({ml_confidence:.1%} confidence)")
                penalties.append(ml_score)
            elif ml_label == "FAKE" and ml_confidence > 0.5:
                flags.append(f"ML model flagged as potentially fake ({ml_confidence:.1%} confidence)")
                penalties.append(ml_score * 0.7)

        except Exception as e:
            print(f"[Stage3] Model inference error: {e}")
            ml_score, reason = _heuristic_fake_score(text)
            model_name = "heuristic"
            flags.append(f"Heuristic analysis: {reason}")
            penalties.append(ml_score * 0.6)
    else:
        ml_score, reason = _heuristic_fake_score(text)
        model_name = "heuristic"
        if ml_score > 50:
            flags.append(f"Heuristic fake indicators detected (score={ml_score:.0f}/100)")
            penalties.append(ml_score * 0.5)

    # ── 2. Sentiment Analysis ────────────────────────────────────────────
    sentiment = _compute_sentiment(words)
    if sentiment["polarity"] < -0.4:
        flags.append(f"Strongly negative emotional tone (polarity={sentiment['polarity']:.2f})")
        penalties.append(12)
    elif sentiment["negative_words"] > sentiment["positive_words"] * 3:
        flags.append("Overwhelmingly negative framing")
        penalties.append(8)

    # ── 3. Named Entity Density ──────────────────────────────────────────
    ne_density = _named_entity_density(content)
    if ne_density < 0.03 and len(words) > 150:
        flags.append(f"Low named entity density ({ne_density:.2%}) — vague, non-specific reporting")
        penalties.append(14)

    # ── 4. Headline-Body Consistency ─────────────────────────────────────
    consistency = _headline_body_consistency(headline, content)
    if consistency < 0.15 and headline:
        flags.append(f"Low headline-body consistency ({consistency:.0%}) — content may not support headline")
        penalties.append(20)
    elif consistency < 0.25 and headline:
        flags.append(f"Moderate headline-body mismatch ({consistency:.0%})")
        penalties.append(10)

    # ── 5. Attention words ───────────────────────────────────────────────
    attention_words = _extract_attention_words(content)

    # ── 6. Multi-model comparison ─────────────────────────────────────────
    model_comparison = _get_comparison_results(text)

    # ── Final score ──────────────────────────────────────────────────────
    score = min(100.0, float(sum(penalties)))

    if score >= 55:
        verdict = "FAIL"
    elif score >= 25:
        verdict = "WARN"
    else:
        verdict = "PASS"

    return Stage3Result(
        score=score,
        verdict=verdict,
        flags=flags,
        details={
            "ml_model": model_name,
            "ml_label": ml_label,
            "ml_confidence": round(ml_confidence, 3),
            "sentiment": sentiment,
            "named_entity_density": round(ne_density, 4),
            "headline_body_consistency": round(consistency, 3),
            "word_count": len(words),
            "model_comparison": model_comparison,
        },
        attention_words=attention_words,
        model_used=model_name,
    )
