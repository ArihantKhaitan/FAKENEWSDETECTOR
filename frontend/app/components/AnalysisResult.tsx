"use client";

import { useState } from "react";
import type { AnalysisData } from "../page";
import RiskGauge from "./RiskGauge";
import StageCard from "./StageCard";

interface Props { data: AnalysisData; }

const VCFG = {
  FAKE: {
    color: "#FF3B30", glass: "glass-fake", glow: "glow-fake",
    emoji: "✕", label: "Fake News Detected", sub: "Strong misinformation indicators",
    textColor: "#FF3B30", gradient: "linear-gradient(135deg, #FF3B30, #FF6B6B)",
  },
  SUSPICIOUS: {
    color: "#FF9F0A", glass: "glass-suspicious", glow: "glow-suspicious",
    emoji: "△", label: "Suspicious Content", sub: "Verify before sharing",
    textColor: "#FF9F0A", gradient: "linear-gradient(135deg, #FF9F0A, #FFCC00)",
  },
  REAL: {
    color: "#30D158", glass: "glass-real", glow: "glow-real",
    emoji: "✓", label: "Likely Credible", sub: "Low misinformation risk",
    textColor: "#30D158", gradient: "linear-gradient(135deg, #30D158, #34C759)",
  },
};

const STAGES = [
  { key: "headline" as const, index: 1, name: "Headline Analysis", icon: "◎", description: "Clickbait, caps, sensationalism", color: "#0071E3" },
  { key: "style"    as const, index: 2, name: "Writing Style",     icon: "≋", description: "Vocabulary, quotes, weasel words", color: "#BF5AF2" },
  { key: "content"  as const, index: 3, name: "Content AI",        icon: "◈", description: "Transformer model + semantics", color: "#30D158" },
  { key: "source"   as const, index: 4, name: "Source Credibility",icon: "◉", description: "Domain, URL, author, date", color: "#FF9F0A" },
];

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function AnalysisResult({ data }: Props) {
  const cfg = VCFG[data.verdict];
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const summary = `TruthLens Analysis: ${cfg.label}\nRisk Score: ${data.risk_score}/100\n${data.summary}\n\nAnalyzed via TruthLens`;
    copyToClipboard(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const factCheckUrl = `https://www.snopes.com/search/${encodeURIComponent(data.article.headline.split(" ").slice(0, 5).join(" "))}`;
  const googleNewsUrl = `https://news.google.com/search?q=${encodeURIComponent(data.article.headline.split(" ").slice(0, 6).join(" "))}`;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 24px 80px" }}>

      {/* ── Verdict banner ──────────────────────────────────────── */}
      <div
        className={`${cfg.glass} ${cfg.glow} animate-scale-in gradient-border`}
        style={{ borderRadius: "28px", padding: "40px 40px 36px", marginBottom: "20px" }}
      >
        <div style={{ display: "flex", gap: "40px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            {/* Verdict pill */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "6px 14px", borderRadius: "980px",
              background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
              marginBottom: "18px",
            }}>
              <span style={{ fontSize: "13px", color: cfg.color, fontWeight: 800 }}>{cfg.emoji}</span>
              <span style={{ fontSize: "11px", color: cfg.color, fontWeight: 600, letterSpacing: "0.04em" }}>{cfg.sub}</span>
            </div>

            <h2 style={{
              fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 700,
              color: "#1D1D1F", letterSpacing: "-0.028em", lineHeight: 1.04,
              marginBottom: "16px",
            }}>
              <span style={{ color: cfg.color }}>{cfg.emoji}</span>{" "}
              {cfg.label}
            </h2>

            <p style={{ fontSize: "15px", color: "#6E6E73", lineHeight: 1.65, marginBottom: "24px", maxWidth: "480px" }}>
              {data.summary}
            </p>

            {/* Meta pills */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
              {[
                { label: "Confidence", value: `${(data.confidence * 100).toFixed(0)}%`, icon: "◎" },
                { label: "Risk Score", value: `${data.risk_score}/100`, icon: "◈" },
                { label: "Words", value: data.article.word_count.toLocaleString(), icon: "≋" },
                { label: "Time", value: `${data.processing_time_ms.toFixed(0)}ms`, icon: "⊕" },
              ].map(m => (
                <div key={m.label} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 13px", borderRadius: "980px",
                  background: "rgba(255,255,255,0.5)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                }}>
                  <span style={{ fontSize: "11px", color: "#98989D" }}>{m.icon}</span>
                  <span style={{ fontSize: "11px", color: "#6E6E73" }}>{m.label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#1D1D1F" }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={handleShare}
                className="glass-subtle glass-shimmer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "9px 16px", borderRadius: "980px",
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: "13px", fontWeight: 500, color: "#1D1D1F",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
              >
                {copied ? (
                  <><span style={{ color: "#30D158" }}>✓</span> Copied!</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="1" y="3" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M4 3V2a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg> Share Results</>
                )}
              </button>

              <a href={factCheckUrl} target="_blank" rel="noopener noreferrer"
                className="glass-subtle"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "9px 16px", borderRadius: "980px",
                  fontSize: "13px", fontWeight: 500, color: "#1D1D1F", textDecoration: "none",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6 4v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
                </svg>
                Check Snopes ↗
              </a>

              <a href={googleNewsUrl} target="_blank" rel="noopener noreferrer"
                className="glass-subtle"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "9px 16px", borderRadius: "980px",
                  fontSize: "13px", fontWeight: 500, color: "#1D1D1F", textDecoration: "none",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8.5 8.5l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Google News ↗
              </a>
            </div>
          </div>

          {/* Gauge */}
          <RiskGauge score={data.risk_score} verdict={data.verdict} />
        </div>
      </div>

      {/* ── Article preview ──────────────────────────────────────── */}
      {data.article.headline && (
        <div
          className="glass animate-fade-up delay-200"
          style={{ padding: "18px 22px", borderRadius: "16px", marginBottom: "20px" }}
        >
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
            Article Analyzed
          </p>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1D1D1F", marginBottom: "6px", letterSpacing: "-0.006em" }}>
            {data.article.headline}
          </h3>
          {data.article.content_preview && (
            <p style={{ fontSize: "13px", color: "#6E6E73", lineHeight: 1.6 }}>{data.article.content_preview}</p>
          )}
          {data.article.url && (
            <a href={data.article.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "12px", color: "#0071E3", marginTop: "8px", display: "inline-block", textDecoration: "none" }}>
              {data.article.url.length > 70 ? data.article.url.slice(0, 67) + "..." : data.article.url}
              <span style={{ marginLeft: "3px" }}>↗</span>
            </a>
          )}
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px", alignItems: "start" }}>

        {/* Left: Gates */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

          {/* Firewall pipeline visual */}
          <div
            className="glass animate-fade-up delay-300"
            style={{ padding: "18px 20px", borderRadius: "18px" }}
          >
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>
              Firewall Pipeline
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
              {STAGES.map((s, i) => {
                const v = data.stage_verdicts[s.key];
                const c = v === "PASS" ? "#30D158" : v === "FAIL" ? "#FF3B30" : "#FF9F0A";
                const sc = Math.round(data.stage_scores[s.key]);
                return (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                      <div style={{
                        width: "46px", height: "46px", borderRadius: "13px",
                        background: `${c}12`,
                        border: `2px solid ${c}50`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: `0 4px 12px ${c}20, inset 0 1px 0 rgba(255,255,255,0.8)`,
                        backdropFilter: "blur(10px)",
                      }}>
                        <span style={{ fontSize: "18px" }}>{s.icon}</span>
                      </div>
                      <div style={{ fontSize: "10px", color: c, fontWeight: 700 }}>{sc}</div>
                    </div>
                    {i < STAGES.length - 1 && (
                      <svg width="20" height="2" viewBox="0 0 20 2" style={{ marginBottom: "12px" }}>
                        <line x1="0" y1="1" x2="20" y2="1" stroke={c} strokeWidth="1.5" strokeDasharray="4,3" />
                      </svg>
                    )}
                  </div>
                );
              })}
              {/* Final verdict */}
              <svg width="20" height="2" viewBox="0 0 20 2" style={{ marginBottom: "12px" }}>
                <line x1="0" y1="1" x2="20" y2="1" stroke={cfg.color} strokeWidth="1.5" strokeDasharray="4,3" />
              </svg>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                <div style={{
                  width: "46px", height: "46px", borderRadius: "13px",
                  background: cfg.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 6px 20px ${cfg.color}40`,
                }}>
                  <span style={{ fontSize: "18px", color: "#fff", fontWeight: 700 }}>{cfg.emoji}</span>
                </div>
                <div style={{ fontSize: "10px", color: cfg.color, fontWeight: 700 }}>Verdict</div>
              </div>
            </div>
          </div>

          {/* Gate cards */}
          {STAGES.map((s, i) => (
            <StageCard
              key={s.key}
              index={s.index} name={s.name} icon={s.icon}
              description={s.description}
              data={data.stages[s.key]}
              delay={300 + i * 70}
              accentColor={s.color}
            />
          ))}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Key flags */}
          {data.key_flags.length > 0 && (
            <div className="glass animate-fade-up delay-400" style={{ padding: "20px", borderRadius: "18px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
                Key Flags
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {data.key_flags.map((flag, i) => (
                  <div key={i} style={{
                    padding: "9px 12px", borderRadius: "10px",
                    background: "rgba(255,59,48,0.05)",
                    border: "1px solid rgba(255,59,48,0.1)",
                    fontSize: "12px", color: "#3D3D3F", lineHeight: 1.5,
                  }}>
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attention word cloud */}
          {data.attention_words.length > 0 && (
            <div className="glass animate-fade-up delay-500" style={{ padding: "20px", borderRadius: "18px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
                Key Words
              </p>
              <p style={{ fontSize: "11px", color: "#98989D", marginBottom: "12px" }}>Words that influenced the analysis</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {data.attention_words.slice(0, 20).map(({ word, weight }) => {
                  const alpha = 0.06 + weight * 0.22;
                  const bg = data.verdict === "FAKE"
                    ? `rgba(255,59,48,${alpha})`
                    : data.verdict === "SUSPICIOUS"
                    ? `rgba(255,159,10,${alpha})`
                    : `rgba(48,209,88,${alpha})`;
                  const tc = data.verdict === "FAKE" ? "#c0392b"
                    : data.verdict === "SUSPICIOUS" ? "#8a5500" : "#1a7a3c";
                  return (
                    <span key={word} style={{
                      display: "inline-block",
                      padding: "4px 9px", borderRadius: "6px", background: bg,
                      fontSize: `${10 + Math.round(weight * 4)}px`,
                      fontWeight: weight > 0.55 ? 600 : 500,
                      color: weight > 0.45 ? tc : "#6E6E73",
                      cursor: "default",
                      transition: "transform 0.15s ease",
                      border: `1px solid ${bg}`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                    title={`Weight: ${(weight * 100).toFixed(0)}%`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Score breakdown */}
          <div className="glass animate-fade-up delay-600" style={{ padding: "20px", borderRadius: "18px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>
              Score Breakdown
            </p>
            {STAGES.map(s => {
              const sc = data.stage_scores[s.key];
              const v = data.stage_verdicts[s.key];
              const c = v === "PASS" ? "#30D158" : v === "FAIL" ? "#FF3B30" : "#FF9F0A";
              return (
                <div key={s.key} style={{ marginBottom: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "12px", color: "#3D3D3F", fontWeight: 500 }}>
                      {s.icon} {s.name}
                    </span>
                    <span style={{ fontSize: "12px", color: c, fontWeight: 700 }}>{Math.round(sc)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${sc}%`, background: `linear-gradient(90deg, ${c}60, ${c})` }} />
                  </div>
                </div>
              );
            })}

            <div style={{
              marginTop: "14px", padding: "12px 14px",
              background: `${cfg.color}08`, borderRadius: "12px",
              border: `1px solid ${cfg.color}20`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#1D1D1F" }}>Overall Risk</span>
              <span style={{ fontSize: "22px", fontWeight: 700, color: cfg.color, letterSpacing: "-0.03em" }}>
                {data.risk_score}<span style={{ fontSize: "12px", fontWeight: 500, color: "#98989D" }}>/100</span>
              </span>
            </div>
          </div>

          {/* Model Comparison */}
          {(() => {
            const comparison: {
              name: string; short: string; color: string;
              label: string; confidence: number; risk_score: number | null;
              trained_on: string; available: boolean;
            }[] = data.stages.content?.details?.model_comparison as never ?? [];
            const available = comparison.filter(m => m.available);
            if (available.length === 0) return null;

            const allAgree = available.every(m => m.label === available[0].label);
            const fakeCount = available.filter(m => m.label === "FAKE").length;
            const realCount = available.filter(m => m.label === "REAL").length;

            return (
              <div className="glass animate-fade-up delay-700" style={{ padding: "20px", borderRadius: "18px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>
                      Model Comparison
                    </p>
                    <p style={{ fontSize: "11px", color: "#6E6E73" }}>
                      {available.length} AI models tested
                    </p>
                  </div>
                  {/* Consensus badge */}
                  <div style={{
                    padding: "4px 10px", borderRadius: "980px", fontSize: "10px", fontWeight: 700,
                    background: allAgree
                      ? (available[0].label === "FAKE" ? "rgba(255,59,48,0.1)" : "rgba(48,209,88,0.1)")
                      : "rgba(255,159,10,0.1)",
                    color: allAgree
                      ? (available[0].label === "FAKE" ? "#FF3B30" : "#30D158")
                      : "#FF9F0A",
                    border: `1px solid ${allAgree ? (available[0].label === "FAKE" ? "rgba(255,59,48,0.25)" : "rgba(48,209,88,0.25)") : "rgba(255,159,10,0.25)"}`,
                  }}>
                    {allAgree ? `All agree: ${available[0].label}` : `${fakeCount} FAKE / ${realCount} REAL`}
                  </div>
                </div>

                {/* Per-model rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {available.map((m, i) => {
                    const isFake = m.label === "FAKE";
                    const barColor = isFake ? "#FF3B30" : "#30D158";
                    const conf = Math.round(m.confidence * 100);

                    return (
                      <div key={i} style={{
                        padding: "12px 14px", borderRadius: "13px",
                        background: "rgba(0,0,0,0.025)",
                        border: "1px solid rgba(255,255,255,0.7)",
                      }}>
                        {/* Model name + verdict */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <div style={{
                              width: "8px", height: "8px", borderRadius: "50%",
                              background: m.color, flexShrink: 0,
                              boxShadow: `0 0 6px ${m.color}60`,
                            }} />
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#1D1D1F" }}>{m.name}</span>
                          </div>
                          <div style={{
                            display: "flex", alignItems: "center", gap: "5px",
                            padding: "3px 9px", borderRadius: "980px",
                            background: isFake ? "rgba(255,59,48,0.1)" : "rgba(48,209,88,0.1)",
                            border: `1px solid ${isFake ? "rgba(255,59,48,0.2)" : "rgba(48,209,88,0.2)"}`,
                          }}>
                            <span style={{ fontSize: "9px", fontWeight: 800, color: barColor }}>
                              {isFake ? "✕" : "✓"}
                            </span>
                            <span style={{ fontSize: "10px", fontWeight: 700, color: barColor }}>{m.label}</span>
                          </div>
                        </div>

                        {/* Confidence bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, height: "4px", background: "rgba(0,0,0,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{
                              width: `${conf}%`, height: "100%", borderRadius: "2px",
                              background: `linear-gradient(90deg, ${barColor}60, ${barColor})`,
                              transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                            }} />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: barColor, minWidth: "34px", textAlign: "right" }}>
                            {conf}%
                          </span>
                        </div>

                        {/* Trained on */}
                        <p style={{ fontSize: "10px", color: "#98989D", marginTop: "6px", lineHeight: 1.4 }}>
                          Trained on: {m.trained_on}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Models that failed to load */}
                {comparison.filter(m => !m.available).length > 0 && (
                  <p style={{ fontSize: "10px", color: "#C0C0C8", marginTop: "10px", textAlign: "center" }}>
                    {comparison.filter(m => !m.available).map(m => m.name).join(", ")} — not loaded
                  </p>
                )}
              </div>
            );
          })()}

          {/* Verify with trusted sources */}
          <div className="glass-subtle animate-fade-up delay-800" style={{ padding: "16px 18px", borderRadius: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#1D1D1F", marginBottom: "6px" }}>
              Verify independently
            </p>
            <p style={{ fontSize: "12px", color: "#6E6E73", lineHeight: 1.6 }}>
              AI analysis is probabilistic. Cross-reference with{" "}
              <a href="https://apnews.com" target="_blank" rel="noopener noreferrer" style={{ color: "#0071E3", textDecoration: "none" }}>AP News</a>,{" "}
              <a href="https://reuters.com" target="_blank" rel="noopener noreferrer" style={{ color: "#0071E3", textDecoration: "none" }}>Reuters</a>, or{" "}
              <a href="https://factcheck.org" target="_blank" rel="noopener noreferrer" style={{ color: "#0071E3", textDecoration: "none" }}>FactCheck.org</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
