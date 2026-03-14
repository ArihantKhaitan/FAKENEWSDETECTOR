"""
Ensemble — Final Verdict Engine

Combines scores from all 4 firewall stages into a single weighted risk score
and issues a final REAL / SUSPICIOUS / FAKE verdict.

Stage weights (tuned on fake news detection research):
  Stage 1 (Headline):     15%  — first signal, relatively weak alone
  Stage 2 (Style):        25%  — strong linguistic discriminator
  Stage 3 (Content/ML):   40%  — strongest signal (deep semantic analysis)
  Stage 4 (Source):       20%  — critical when URL is available

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


STAGE_WEIGHTS = {
    "headline": 0.15,
    "style":    0.25,
    "content":  0.40,
    "source":   0.20,
}

VERDICT_THRESHOLDS = {
    "FAKE":       56,
    "SUSPICIOUS": 31,
    "REAL":        0,
}


@dataclass
class EnsembleResult:
    risk_score: float           # 0–100
    verdict: str                # REAL / SUSPICIOUS / FAKE
    confidence: float           # 0–1
    stage_scores: Dict[str, float]
    stage_verdicts: Dict[str, str]
    key_flags: List[str]
    summary: str
    details: Dict = field(default_factory=dict)


def _collect_key_flags(
    s1: Stage1Result,
    s2: Stage2Result,
    s3: Stage3Result,
    s4: Stage4Result,
    max_per_stage: int = 3,
) -> List[str]:
    """Collect the most important flags from each stage."""
    all_flags = []

    # Only include flags from stages that WARN or FAIL
    if s1.verdict != "PASS":
        all_flags.extend([f"[Headline] {f}" for f in s1.flags[:max_per_stage]])
    if s2.verdict != "PASS":
        all_flags.extend([f"[Style] {f}" for f in s2.flags[:max_per_stage]])
    if s3.verdict != "PASS":
        all_flags.extend([f"[Content] {f}" for f in s3.flags[:max_per_stage]])
    if s4.verdict != "PASS":
        all_flags.extend([f"[Source] {f}" for f in s4.flags[:max_per_stage]])

    return all_flags[:12]  # Limit total displayed flags


def _build_summary(
    verdict: str,
    risk_score: float,
    s1: Stage1Result,
    s2: Stage2Result,
    s3: Stage3Result,
    s4: Stage4Result,
) -> str:
    """Generate a human-readable summary of the analysis."""
    stages_failed = [
        name for name, r in [
            ("Headline", s1), ("Writing Style", s2),
            ("Content Analysis", s3), ("Source Credibility", s4)
        ]
        if r.verdict == "FAIL"
    ]
    stages_warned = [
        name for name, r in [
            ("Headline", s1), ("Writing Style", s2),
            ("Content Analysis", s3), ("Source Credibility", s4)
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
        return (
            f"This article shows low indicators of misinformation "
            f"(risk score: {risk_score:.0f}/100). "
            f"The headline, writing style, content, and source all passed "
            f"credibility checks. Always verify important claims independently."
        )


def combine(
    stage1: Stage1Result,
    stage2: Stage2Result,
    stage3: Stage3Result,
    stage4: Stage4Result,
    url: Optional[str] = None,
) -> EnsembleResult:
    """
    Combine all stage results into a final verdict.

    If no URL is provided, source weight is redistributed to other stages.
    """
    weights = STAGE_WEIGHTS.copy()

    # Redistribute source weight if no URL available
    if not url:
        extra = weights["source"] * 0.5
        weights["headline"] += extra * 0.2
        weights["style"] += extra * 0.4
        weights["content"] += extra * 0.4
        weights["source"] *= 0.5

    # Weighted score
    risk_score = (
        stage1.score * weights["headline"] +
        stage2.score * weights["style"] +
        stage3.score * weights["content"] +
        stage4.score * weights["source"]
    )
    risk_score = max(0.0, min(100.0, risk_score))

    # Verdict
    if risk_score >= VERDICT_THRESHOLDS["FAKE"]:
        verdict = "FAKE"
    elif risk_score >= VERDICT_THRESHOLDS["SUSPICIOUS"]:
        verdict = "SUSPICIOUS"
    else:
        verdict = "REAL"

    # Confidence: distance from nearest threshold boundary
    if verdict == "FAKE":
        confidence = min(1.0, (risk_score - 56) / 44 + 0.5)
    elif verdict == "REAL":
        confidence = min(1.0, (30 - risk_score) / 30 + 0.5)
    else:
        dist = min(risk_score - 31, 55 - risk_score)
        confidence = max(0.5, 0.5 + dist / 25)

    key_flags = _collect_key_flags(stage1, stage2, stage3, stage4)
    summary = _build_summary(verdict, risk_score, stage1, stage2, stage3, stage4)

    return EnsembleResult(
        risk_score=round(risk_score, 1),
        verdict=verdict,
        confidence=round(confidence, 3),
        stage_scores={
            "headline": round(stage1.score, 1),
            "style":    round(stage2.score, 1),
            "content":  round(stage3.score, 1),
            "source":   round(stage4.score, 1),
        },
        stage_verdicts={
            "headline": stage1.verdict,
            "style":    stage2.verdict,
            "content":  stage3.verdict,
            "source":   stage4.verdict,
        },
        key_flags=key_flags,
        summary=summary,
        details={
            "weights_used": {k: round(v, 3) for k, v in weights.items()},
            "url_provided": bool(url),
            "model_used": stage3.model_used,
        },
    )
