"use client";

import { useState, useRef } from "react";
import Navbar from "./components/Navbar";
import HeroInput from "./components/HeroInput";
import AnalysisResult from "./components/AnalysisResult";
import LoadingScreen from "./components/LoadingScreen";

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

export default function Home() {
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <Navbar />

        {/* Hero */}
        <section style={{ paddingTop: "110px", paddingBottom: "80px", textAlign: "center" }}>
          <div style={{ maxWidth: "820px", margin: "0 auto", padding: "0 24px" }}>

            {/* Pill */}
            <div
              className="animate-fade-in glass-subtle no-select"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "7px 16px", borderRadius: "980px", marginBottom: "32px",
              }}
            >
              <span style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "linear-gradient(135deg, #0071E3, #5AC8FA)",
                display: "inline-block", animation: "pulse-glow 2s ease-in-out infinite",
              }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#0071E3", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                AI-Powered
              </span>
              <span style={{ width: "1px", height: "12px", background: "rgba(0,0,0,0.1)", display: "inline-block" }} />
              <span style={{ fontSize: "11px", color: "#6E6E73", fontWeight: 500 }}>
                4-Stage Firewall Detection
              </span>
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
              <span className="text-gradient-blue">real?</span>
            </h1>

            <p
              className="animate-fade-up delay-200"
              style={{
                fontSize: "20px", color: "#6E6E73", lineHeight: 1.65,
                marginBottom: "20px", fontWeight: 400,
              }}
            >
              Paste a headline, article, or URL. Four AI gates analyze{" "}
              <strong style={{ color: "#3D3D3F", fontWeight: 500 }}>headline patterns</strong>,{" "}
              <strong style={{ color: "#3D3D3F", fontWeight: 500 }}>writing style</strong>,{" "}
              <strong style={{ color: "#3D3D3F", fontWeight: 500 }}>content semantics</strong>, and{" "}
              <strong style={{ color: "#3D3D3F", fontWeight: 500 }}>source credibility</strong> — simultaneously.
            </p>

            {/* Stage flow */}
            <div
              className="animate-fade-up delay-300"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "8px", marginBottom: "48px", flexWrap: "wrap",
              }}
            >
              {[
                { icon: "◎", label: "Headline", color: "#0071E3" },
                { icon: "≋", label: "Style", color: "#BF5AF2" },
                { icon: "◈", label: "Content AI", color: "#30D158" },
                { icon: "◉", label: "Source", color: "#FF9F0A" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    className="glass-subtle"
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      padding: "6px 12px", borderRadius: "980px",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: s.color }}>{s.icon}</span>
                    <span style={{ fontSize: "12px", color: "#3D3D3F", fontWeight: 500 }}>{s.label}</span>
                  </div>
                  {i < 3 && (
                    <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                      <path d="M1 5h12M9 1l4 4-4 4" stroke="rgba(0,0,0,0.2)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            {/* Input card */}
            <div className="animate-fade-up delay-400">
              <HeroInput onAnalyze={handleAnalyze} onDemo={handleDemo} loading={loading} />
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
              TruthLens · 4-Stage AI Pipeline · Results are probabilistic — always verify with trusted sources
            </p>
            <p style={{ color: "#C0C0C8", fontSize: "12px", marginTop: "6px" }}>
              Deep Learning Lab · BiLSTM + Attention + BERT Transfer Learning
            </p>
          </footer>
        )}
      </div>
    </>
  );
}
