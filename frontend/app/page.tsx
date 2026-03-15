"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "./components/Navbar";
import HeroInput from "./components/HeroInput";
import AnalysisResult from "./components/AnalysisResult";
import LoadingScreen from "./components/LoadingScreen";
import FloatingCards from "./components/FloatingCards";
import { TextShimmer } from "./components/ui/TextShimmer";

export type AnalysisData = {
  risk_score: number;
  verdict: "REAL" | "SUSPICIOUS" | "FAKE";
  confidence: number;
  summary: string;
  key_flags: string[];
  stages: {
    headline: StageData;
    style: StageData;
    content: StageData;
    source: StageData;
    corroboration: StageData;
  };
  stage_scores: Record<string, number>;
  stage_verdicts: Record<string, string>;
  attention_words: Array<{ word: string; weight: number }>;
  processing_time_ms: number;
  article: {
    headline: string;
    content_preview: string;
    url: string | null;
    word_count: number;
  };
  model_used: string;
};

export type StageData = {
  score: number;
  verdict: string;
  flags: string[];
  details: Record<string, unknown>;
};

const STAGES = [
  { icon: "◎", label: "Headline", color: "#0071E3", desc: "8 checks: CAPS, clickbait, punctuation abuse, emotional triggers" },
  { icon: "≋", label: "Style", color: "#BF5AF2", desc: "TTR, Flesch score, quote density, weasel words, formality" },
  { icon: "◈", label: "Content AI", color: "#30D158", desc: "4 transformer models compared in parallel — RoBERTa, DistilRoBERTa, BERT-base, BERT-tiny" },
  { icon: "◉", label: "Source", color: "#FF9F0A", desc: "200+ domain blacklist, TLD trust, HTTPS, URL structure" },
  { icon: "⊕", label: "Corroboration", color: "#64D2FF", desc: "Google News search — checks if trusted outlets independently cover this story" },
];

export default function Home() {
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelsStatus, setModelsStatus] = useState({ comparison_loaded: 0, comparison_total: 4 });
  const resultRef = useRef<HTMLDivElement>(null);

  // Poll /api/status until models are ready
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    async function checkStatus() {
      try {
        const res = await fetch("/api/status");
        if (res.ok) {
          const data = await res.json();
          setModelsStatus({ comparison_loaded: data.comparison_loaded, comparison_total: data.comparison_total });
          if (data.models_ready) {
            setModelsReady(true);
            return; // stop polling
          }
        }
      } catch {
        // backend not yet up, keep polling
      }
      timer = setTimeout(checkStatus, 3000);
    }
    checkStatus();
    return () => clearTimeout(timer);
  }, []);

  async function handleAnalyze(
    mode: "text" | "url",
    data: { headline?: string; content?: string; url?: string }
  ) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const endpoint = mode === "url" ? "/api/analyze-url" : "/api/analyze";
      const body =
        mode === "url"
          ? { url: data.url }
          : { headline: data.headline || "", content: data.content || "" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }

      const json: AnalysisData = await res.json();
      setResult(json);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/demo");
      if (!res.ok) throw new Error("Demo failed");
      const json: AnalysisData = await res.json();
      setResult(json);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Demo failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Animated gradient mesh */}
      <div className="mesh-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      {/* Floating info cards */}
      <FloatingCards />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <Navbar />

        {/* Hero */}
        <section style={{ paddingTop: "110px", paddingBottom: "80px", textAlign: "center" }}>
          <div style={{ maxWidth: "820px", margin: "0 auto", padding: "0 24px" }}>

            {/* Stat badges */}
            <div
              className="animate-fade-in no-select"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "32px", flexWrap: "wrap" }}
            >
              {[
                { icon: "🧠", label: "130k articles trained", color: "#0071E3" },
                { icon: "⚡", label: "5 AI gates", color: "#BF5AF2" },
                { icon: "🎯", label: "Real-time analysis", color: "#30D158" },
              ].map((b, i) => (
                <div
                  key={i}
                  className="glass-subtle"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "980px" }}
                >
                  <span style={{ fontSize: "12px" }}>{b.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: b.color, letterSpacing: "0.03em" }}>{b.label}</span>
                </div>
              ))}
            </div>

            {/* Headline */}
            <h1
              className="animate-fade-up delay-100"
              style={{
                fontSize: "clamp(52px, 8vw, 92px)",
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 1.0,
                color: "#1D1D1F",
                marginBottom: "28px",
              }}
            >
              Is this news{" "}
              <TextShimmer
                as="span"
                duration={2}
                spread={4}
                className="[--base-color:#0071E3] [--base-gradient-color:#5AC8FA]"
              >
                real?
              </TextShimmer>
            </h1>

            <p
              className="animate-fade-up delay-200"
              style={{
                fontSize: "20px", color: "#6E6E73", lineHeight: 1.65,
                marginBottom: "20px", fontWeight: 400,
              }}
            >
              Paste a headline, article, or URL. Five AI gates analyze{" "}
              <strong style={{ color: "#3D3D3F", fontWeight: 500 }}>headline patterns</strong>,{" "}
              <strong style={{ color: "#3D3D3F", fontWeight: 500 }}>writing style</strong>,{" "}
              <strong style={{ color: "#3D3D3F", fontWeight: 500 }}>content semantics</strong>, and{" "}
              <strong style={{ color: "#3D3D3F", fontWeight: 500 }}>source credibility</strong> — simultaneously.
            </p>

            {/* Interactive stage flow */}
            <div
              className="animate-fade-up delay-300"
              style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "6px", marginBottom: "48px", flexWrap: "wrap" }}
            >
              {STAGES.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <button
                      onMouseEnter={() => setHoveredStage(i)}
                      onMouseLeave={() => setHoveredStage(null)}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: hoveredStage === i ? "8px 16px" : "7px 13px",
                        borderRadius: "980px",
                        background: hoveredStage === i ? `${s.color}15` : "rgba(255,255,255,0.45)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: hoveredStage === i ? `1.5px solid ${s.color}50` : "1px solid rgba(255,255,255,0.6)",
                        boxShadow: hoveredStage === i
                          ? `0 4px 20px ${s.color}25, inset 0 1px 0 rgba(255,255,255,0.8)`
                          : "0 4px 20px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                        transform: hoveredStage === i ? "translateY(-2px) scale(1.04)" : "translateY(0) scale(1)",
                      }}
                    >
                      <span style={{ fontSize: "14px", color: s.color, transition: "transform 0.2s", transform: hoveredStage === i ? "rotate(15deg)" : "rotate(0)" }}>{s.icon}</span>
                      <span style={{ fontSize: "12px", color: hoveredStage === i ? s.color : "#3D3D3F", fontWeight: hoveredStage === i ? 600 : 500 }}>{s.label}</span>
                    </button>
                    {hoveredStage === i && (
                      <div style={{
                        position: "absolute", marginTop: "40px",
                        background: "rgba(255,255,255,0.92)",
                        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                        border: `1px solid ${s.color}30`,
                        borderRadius: "12px", padding: "10px 14px",
                        maxWidth: "200px", zIndex: 10,
                        boxShadow: `0 8px 30px rgba(0,0,0,0.1), 0 0 0 1px ${s.color}15`,
                        animation: "fadeUp 0.2s ease forwards",
                      }}>
                        <p style={{ fontSize: "11.5px", color: "#3D3D3F", lineHeight: 1.5, margin: 0, textAlign: "left" }}>{s.desc}</p>
                      </div>
                    )}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div style={{ display: "flex", alignItems: "center", paddingTop: "10px" }}>
                      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                        <path d="M1 5h14M11 1l4 4-4 4" stroke={hoveredStage === i || hoveredStage === i + 1 ? STAGES[i].color : "rgba(0,0,0,0.18)"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.3s" }} />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input card */}
            <div className="animate-fade-up delay-400">
              <HeroInput
                onAnalyze={handleAnalyze}
                onDemo={handleDemo}
                loading={loading}
                modelsReady={modelsReady}
                modelsStatus={modelsStatus}
              />
            </div>
          </div>
        </section>

        {/* Loading */}
        {loading && <LoadingScreen />}

        {/* Error */}
        {error && !loading && (
          <div className="animate-fade-up" style={{ maxWidth: "700px", margin: "0 auto 48px", padding: "0 24px" }}>
            <div
              className="glass"
              style={{
                padding: "20px 24px", borderRadius: "16px",
                display: "flex", gap: "14px", alignItems: "flex-start",
                borderLeft: "3px solid rgba(255,59,48,0.6)",
              }}
            >
              <span style={{ fontSize: "20px", marginTop: "1px" }}>⚠</span>
              <div>
                <p style={{ color: "#c0392b", fontWeight: 600, marginBottom: "4px", fontSize: "15px" }}>
                  Analysis Error
                </p>
                <p style={{ color: "#6E6E73", fontSize: "14px", lineHeight: 1.5 }}>{error}</p>
                <p style={{ color: "#98989D", fontSize: "13px", marginTop: "8px" }}>
                  Make sure the backend is running:{" "}
                  <code style={{ background: "rgba(0,0,0,0.05)", padding: "2px 7px", borderRadius: "5px", fontFamily: "monospace", fontSize: "12px" }}>
                    cd backend && uvicorn main:app --reload --port 8000
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div ref={resultRef}>
            <AnalysisResult data={result} />
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <footer style={{ padding: "48px 24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.5)", marginTop: "60px" }}>
            <p style={{ color: "#98989D", fontSize: "13px" }}>
              TruthLens · 5-Stage AI Pipeline · Results are probabilistic — always verify with trusted sources
            </p>
          </footer>
        )}
      </div>
    </>
  );
}
