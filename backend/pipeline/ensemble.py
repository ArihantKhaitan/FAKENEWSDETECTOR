"""
Ensemble — Final Verdict Engine

Combines scores from all 5 firewall stages into a single weighted risk score
and issues a final REAL / SUSPICIOUS / FAKE verdict.

Stage weights (base):
  Stage 1 (Headline):        12%
  Stage 2 (Style):           20%
  Stage 3 (Content/ML):      28%  — dynamically adjusted by model consensus
  Stage 4 (Source):          20%
  Stage 5 (Corroboration):   20%

Dynamic adjustments:
  - Gate 3 weight is multiplied by a consensus factor (0.65–1.0) depending on
    how many of the 4 ML models agree. Freed weight redistributes to Gates 4 & 5.
  - Gate 5 weight is halved (to ~10%) when no corroboration data was retrieved,
    with the freed weight going to Gates 2 & 3.
  - Gate 4 weight is halved when no URL is provided.

Verdict thresholds:
  0–30  → REAL        (low risk)
  31–55 → SUSPICIOUS  (warrants further review)
  56–100→ FAKE        (high confidence misinformation indicators)
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional

from .stage1_headline import Stage1Result
from .stage2_style import Stage2Result
from .stage3_content import Stage3Result
from .stage4_source import Stage4Result
from .stage5_corroboration import Stage5Result


BASE_WEIGHTS = {
    "headline":      0.12,
    "style":         0.20,
    "content":       0.28,
    "source":        0.20,
    "corroboration": 0.20,
}

VERDICT_THRESHOLDS = {
    "FAKE":       56,
    "SUSPICIOUS": 31,
    "REAL":        0,
}


@dataclass
class EnsembleResult:
    risk_score: float
    verdict: str
    confidence: float
    stage_scores: Dict[str, float]
    stage_verdicts: Dict[str, str]
    key_flags: List[str]
    summary: str
    details: Dict = field(default_factory=dict)


def _consensus_factor(stage3: Stage3Result) -> float:
    """
    Return a multiplier (0.65–1.0) on Gate 3's weight based on how many
    of the 4 ML models agree.  A 50/50 split means less trust in Gate 3.
    """
    comparison = stage3.details.get("model_comparison", [])
    available  = [m for m in comparison if m.get("available")]

    if not available or stage3.model_used == "heuristic":
        return 0.65   # heuristic only — lowest trust

    total = len(available)
    if total == 1:
        return 0.80

    fake_count = sum(1 for m in available if m.get("label") == "FAKE")
    real_count = total - fake_count
    majority   = max(fake_count, real_count)
    agreement  = majority / total   # 1.0 = unanimous, 0.5 = split

    if agreement >= 1.0:
        return 1.00   # all agree
    elif agreement >= 0.75:
        return 0.85   # 3/4 agree
    else:
        return 0.65   # 2/2 split — strong disagreement


def _collect_key_flags(
    s1: Stage1Result,
    s2: Stage2Result,
    s3: Stage3Result,
    s4: Stage4Result,
    s5: Stage5Result,
    max_per_stage: int = 3,
) -> List[str]:
    all_flags = []
    if s1.verdict != "PASS":
        all_flags.extend([f"[Headline] {f}" for f in s1.flags[:max_per_stage]])
    if s2.verdict != "PASS":
        all_flags.extend([f"[Style] {f}" for f in s2.flags[:max_per_stage]])
    if s3.verdict != "PASS":
        all_flags.extend([f"[Content] {f}" for f in s3.flags[:max_per_stage]])
    if s4.verdict != "PASS":
        all_flags.extend([f"[Source] {f}" for f in s4.flags[:max_per_stage]])
    if s5.verdict != "PASS":
        all_flags.extend([f"[Corroboration] {f}" for f in s5.flags[:max_per_stage]])
    return all_flags[:12]


def _build_summary(
    verdict: str,
    risk_score: float,
    s1: Stage1Result,
    s2: Stage2Result,
    s3: Stage3Result,
    s4: Stage4Result,
    s5: Stage5Result,
) -> str:
    stages_failed = [
        name for name, r in [
            ("Headline", s1), ("Writing Style", s2), ("Content Analysis", s3),
            ("Source Credibility", s4), ("External Corroboration", s5),
        ]
        if r.verdict == "FAIL"
    ]
    stages_warned = [
        name for name, r in [
            ("Headline", s1), ("Writing Style", s2), ("Content Analysis", s3),
            ("Source Credibility", s4), ("External Corroboration", s5),
        ]
        if r.verdict == "WARN"
    ]

    if verdict == "FAKE":
        failed_str = ", ".join(stages_failed) if stages_failed else "multiple indicators"
        return (
            f"This article shows strong indicators of misinformation "
            f"(risk score: {risk_score:.0f}/100). "
            f"Key concerns: {failed_str}. "
            f"The content exhibits patterns commonly associated with fake news."
        )
    elif verdict == "SUSPICIOUS":
        concern_str = ", ".join(stages_warned + stages_failed) if (stages_warned or stages_failed) else "some indicators"
        return (
            f"This article raises concerns that warrant further verification "
            f"(risk score: {risk_score:.0f}/100). "
            f"Issues found in: {concern_str}. "
            f"We recommend cross-referencing with verified sources before sharing."
        )
    else:
        corr_note = ""
        if s5.details.get("trusted_sources_found", 0) >= 1:
            corr_note = f" Independently confirmed by {s5.details['trusted_sources_found']} trusted outlet(s)."
        return (
            f"This article shows low indicators of misinformation "
            f"(risk score: {risk_score:.0f}/100). "
            f"The headline, writing style, content, and source all passed "
            f"credibility checks.{corr_note} Always verify important claims independently."
        )


def combine(
    stage1: Stage1Result,
    stage2: Stage2Result,
    stage3: Stage3Result,
    stage4: Stage4Result,
    stage5: Stage5Result,
    url: Optional[str] = None,
) -> EnsembleResult:
    weights = BASE_WEIGHTS.copy()

    # ── 1. No URL → halve source weight, redistribute ────────────────────────
    if not url:
        freed = weights["source"] * 0.5
        weights["headline"]      += freed * 0.20
        weights["style"]         += freed * 0.40
        weights["content"]       += freed * 0.40
        weights["source"]        *= 0.5

    # ── 2. Gate 5 no data → halve corroboration weight, redistribute ─────────
    if stage5.data_quality == "none":
        freed = weights["corroboration"] * 0.6
        weights["style"]         += freed * 0.40
        weights["content"]       += freed * 0.30
        weights["source"]        += freed * 0.30
        weights["corroboration"] *= 0.4

    # ── 3. Gate 3 consensus adjustment ───────────────────────────────────────
    cfactor = _consensus_factor(stage3)
    if cfactor < 1.0:
        freed = weights["content"] * (1.0 - cfactor)
        weights["content"]       *= cfactor
        # Redistribute freed Gate 3 weight to source and corroboration (more reliable)
        weights["source"]        += freed * 0.50
        weights["corroboration"] += freed * 0.50

    # ── Normalise so weights always sum to 1.0 ───────────────────────────────
    total_w = sum(weights.values())
    weights = {k: v / total_w for k, v in weights.items()}

    # ── Weighted risk score ───────────────────────────────────────────────────
    risk_score = (
        stage1.score * weights["headline"] +
        stage2.score * weights["style"] +
        stage3.score * weights["content"] +
        stage4.score * weights["source"] +
        stage5.score * weights["corroboration"]
    )
    risk_score = max(0.0, min(100.0, risk_score))

    # ── Verdict ───────────────────────────────────────────────────────────────
    if risk_score >= VERDICT_THRESHOLDS["FAKE"]:
        verdict = "FAKE"
    elif risk_score >= VERDICT_THRESHOLDS["SUSPICIOUS"]:
        verdict = "SUSPICIOUS"
    else:
        verdict = "REAL"

    # ── Confidence ───────────────────────────────────────────────────────────
    if verdict == "FAKE":
        confidence = min(1.0, (risk_score - 56) / 44 + 0.5)
    elif verdict == "REAL":
        confidence = min(1.0, (30 - risk_score) / 30 + 0.5)
    else:
        dist = min(risk_score - 31, 55 - risk_score)
        confidence = max(0.5, 0.5 + dist / 25)

    key_flags = _collect_key_flags(stage1, stage2, stage3, stage4, stage5)
    summary   = _build_summary(verdict, risk_score, stage1, stage2, stage3, stage4, stage5)

    return EnsembleResult(
        risk_score=round(risk_score, 1),
        verdict=verdict,
        confidence=round(confidence, 3),
        stage_scores={
            "headline":      round(stage1.score, 1),
            "style":         round(stage2.score, 1),
            "content":       round(stage3.score, 1),
            "source":        round(stage4.score, 1),
            "corroboration": round(stage5.score, 1),
        },
        stage_verdicts={
            "headline":      stage1.verdict,
            "style":         stage2.verdict,
            "content":       stage3.verdict,
            "source":        stage4.verdict,
            "corroboration": stage5.verdict,
        },
        key_flags=key_flags,
        summary=summary,
        details={
            "weights_used":    {k: round(v, 3) for k, v in weights.items()},
            "consensus_factor": round(cfactor, 2),
            "url_provided":    bool(url),
            "model_used":      stage3.model_used,
        },
    )
