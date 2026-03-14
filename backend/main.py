"""
FastAPI Backend — Fake News Detection API

Endpoints:
  POST /api/analyze      — Analyze article by text (headline + content)
  POST /api/analyze-url  — Analyze article by URL (scrapes content first)
  GET  /api/health       — Health check
  GET  /api/demo         — Run demo analysis on a sample article

CORS is configured to allow the Next.js frontend at localhost:3000.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, ConfigDict
from typing import Optional, List, Dict
import time
import asyncio
import threading

from pipeline.stage1_headline import analyze_headline
from pipeline.stage2_style import analyze_style
from pipeline.stage3_content import analyze_content, preload_all_models, get_models_status
from pipeline.stage4_source import analyze_source
from pipeline.ensemble import combine
from utils.scraper import scrape_article


# ── App setup ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Fake News Detector API",
    description="Multi-stage attention-based fake news detection system",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_preload():
    """Kick off model loading in a background thread immediately at startup."""
    thread = threading.Thread(target=preload_all_models, daemon=True)
    thread.start()


# ── Request/Response Models ────────────────────────────────────────────────

class TextAnalysisRequest(BaseModel):
    headline: str = ""
    content: str = ""
    url: Optional[str] = None


class URLAnalysisRequest(BaseModel):
    url: str


class StageResult(BaseModel):
    score: float
    verdict: str
    flags: List[str]
    details: Dict


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    risk_score: float
    verdict: str
    confidence: float
    summary: str
    key_flags: List[str]
    stages: Dict[str, StageResult]
    stage_scores: Dict[str, float]
    stage_verdicts: Dict[str, str]
    attention_words: List[Dict]
    processing_time_ms: float
    article: Dict
    model_used: str


# ── Analysis function ──────────────────────────────────────────────────────

def run_pipeline(
    headline: str,
    content: str,
    url: Optional[str] = None,
) -> AnalysisResponse:
    """Run the full 4-stage pipeline and return a structured response."""
    t_start = time.time()

    # Run all 4 stages
    s1 = analyze_headline(headline)
    s2 = analyze_style(content)
    s3 = analyze_content(headline, content)
    s4 = analyze_source(url=url, content=content, headline=headline)

    # Ensemble
    result = combine(s1, s2, s3, s4, url=url)

    processing_ms = (time.time() - t_start) * 1000

    return AnalysisResponse(
        risk_score=result.risk_score,
        verdict=result.verdict,
        confidence=result.confidence,
        summary=result.summary,
        key_flags=result.key_flags,
        stages={
            "headline": StageResult(
                score=s1.score,
                verdict=s1.verdict,
                flags=s1.flags,
                details=s1.details,
            ),
            "style": StageResult(
                score=s2.score,
                verdict=s2.verdict,
                flags=s2.flags,
                details=s2.details,
            ),
            "content": StageResult(
                score=s3.score,
                verdict=s3.verdict,
                flags=s3.flags,
                details=s3.details,
            ),
            "source": StageResult(
                score=s4.score,
                verdict=s4.verdict,
                flags=s4.flags,
                details=s4.details,
            ),
        },
        stage_scores=result.stage_scores,
        stage_verdicts=result.stage_verdicts,
        attention_words=s3.attention_words,
        processing_time_ms=round(processing_ms, 1),
        article={
            "headline": headline[:200],
            "content_preview": content[:300] + ("..." if len(content) > 300 else ""),
            "url": url,
            "word_count": len(content.split()),
        },
        model_used=s3.model_used,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/api/status")
async def model_status():
    """Returns whether ML models are loaded and ready to serve requests."""
    return get_models_status()


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_text(req: TextAnalysisRequest):
    """Analyze article from provided text."""
    if not req.headline.strip() and not req.content.strip():
        raise HTTPException(status_code=400, detail="At least one of headline or content must be provided")

    try:
        # Run in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: run_pipeline(req.headline, req.content, req.url),
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/analyze-url", response_model=AnalysisResponse)
async def analyze_url(req: URLAnalysisRequest):
    """Scrape article from URL then analyze."""
    try:
        loop = asyncio.get_event_loop()

        # Scrape the URL
        headline, content, error = await loop.run_in_executor(
            None,
            lambda: scrape_article(req.url),
        )

        if error:
            raise HTTPException(status_code=422, detail=f"Could not scrape URL: {error}")

        if not headline and not content:
            raise HTTPException(status_code=422, detail="No content could be extracted from the URL")

        result = await loop.run_in_executor(
            None,
            lambda: run_pipeline(headline, content, req.url),
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URL analysis failed: {str(e)}")


@app.get("/api/demo", response_model=AnalysisResponse)
async def demo_analysis():
    """Demo analysis using a synthetic fake news example."""
    sample_headline = "BREAKING: Scientists EXPOSE Government COVER-UP — You Won't Believe What They Found!!!"
    sample_content = """
    Sources say that secret government insiders have allegedly leaked explosive documents
    revealing a shocking cover-up that mainstream media is desperately trying to suppress.
    Reportedly, these bombshell revelations could destroy the entire political establishment
    as we know it. Anonymous sources within deep state organizations claim this is urgent.

    Everybody knows the truth is out there but they don't want you to see it!!!
    The elites are PANICKING because patriots are waking up to their agenda.
    This changes EVERYTHING. Share before it gets BANNED and CENSORED.

    People are saying this is the biggest scandal in history. Some experts claim the
    information has been suppressed for years. You won't believe what happens next.
    Wake up sheeple! The truth is being hidden from you RIGHT NOW.
    """

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: run_pipeline(sample_headline, sample_content, None),
    )
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
