"use client";

import { useState } from "react";

type Mode = "text" | "url";

interface Props {
  onAnalyze: (mode: Mode, data: { headline?: string; content?: string; url?: string }) => void;
  onDemo: () => void;
  loading: boolean;
  modelsReady?: boolean;
  modelsStatus?: { comparison_loaded: number; comparison_total: number };
}

export default function HeroInput({ onAnalyze, onDemo, loading, modelsReady = true, modelsStatus }: Props) {
  const [mode, setMode] = useState<Mode>("text");
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");

  const canSubmit =
    !loading &&
    modelsReady &&
    (mode === "url" ? url.trim() !== "" : headline.trim() !== "" || content.trim() !== "");

  function handleSubmit() {
    if (!canSubmit) return;
    if (mode === "url") onAnalyze("url", { url: url.trim() });
    else onAnalyze("text", { headline: headline.trim(), content: content.trim() });
  }

  return (
    <div
      className="glass gradient-border glass-shimmer"
      style={{ maxWidth: "760px", margin: "0 auto", borderRadius: "24px", padding: "8px" }}
    >
      {/* Models warming-up banner */}
      {!modelsReady && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 14px", marginBottom: "8px",
          background: "rgba(255,159,10,0.07)", borderRadius: "16px",
          border: "1px solid rgba(255,159,10,0.2)",
        }}>
          <svg viewBox="0 0 16 16" width="14" height="14" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(255,159,10,0.3)" strokeWidth="2" />
            <path d="M8 2a6 6 0 016 6" stroke="#FF9F0A" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#8a5500" }}>
              AI models loading
            </span>
            <span style={{ fontSize: "11px", color: "#98989D", marginLeft: "6px" }}>
              {modelsStatus
                ? `${modelsStatus.comparison_loaded}/${modelsStatus.comparison_total} models ready — first startup only, ~30s`
                : "first startup only, ~30s"}
            </span>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div
        style={{
          display: "flex", gap: "4px", padding: "4px",
          background: "rgba(0,0,0,0.04)", borderRadius: "18px", marginBottom: "12px",
        }}
      >
        {(["text", "url"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: "10px 20px",
              border: "none", borderRadius: "14px",
              fontSize: "14px", fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.22s ease",
              background: mode === m ? "rgba(255,255,255,0.85)" : "transparent",
              color: mode === m ? "#1D1D1F" : "#6E6E73",
              boxShadow: mode === m
                ? "0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
                : "none",
              backdropFilter: mode === m ? "blur(10px)" : "none",
            }}
          >
            {m === "text" ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="1" y="1.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="3" y1="4.5" x2="10" y2="4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                  <line x1="3" y1="6.5" x2="10" y2="6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                  <line x1="3" y1="8.5" x2="7" y2="8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                </svg>
                Paste Article Text
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M5 8L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M3.5 6L2.5 7a2 2 0 002.8 2.8l1-.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 3.5l1-1A2 2 0 019.8 5.3L8.8 6.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Analyze URL
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ padding: "0 8px 8px" }}>
        {mode === "text" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: "7px" }}>
                Headline
              </label>
              <input
                type="text"
                className="input-glass"
                placeholder="Paste the article headline here..."
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: "7px" }}>
                Article Content
              </label>
              <textarea
                className="input-glass"
                placeholder="Paste the full article text here..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={5}
                style={{ fontSize: "15px", lineHeight: 1.6 }}
              />
            </div>
          </div>
        ) : (
          <div>
            <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: "7px" }}>
              Article URL
            </label>
            <input
              type="url"
              className="input-glass"
              placeholder="https://example.com/news/article..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ fontSize: "16px" }}
            />
            <p style={{ fontSize: "12px", color: "#98989D", marginTop: "8px", textAlign: "left" }}>
              We automatically scrape the headline and body from the page
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", flexWrap: "wrap", gap: "10px" }}>
          <button
            onClick={onDemo}
            disabled={loading}
            style={{
              background: "none", border: "none", padding: "8px 0",
              fontSize: "13px", color: "#6E6E73", cursor: "pointer",
              fontFamily: "inherit", transition: "color 0.2s",
              textDecoration: "underline", textDecorationColor: "rgba(0,0,0,0.15)",
              textUnderlineOffset: "2px",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#1D1D1F")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6E6E73")}
          >
            Try a demo example →
          </button>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? (
              <>
                <svg viewBox="0 0 16 16" width="15" height="15" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                  <path d="M8 2a6 6 0 016 6" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
                Analyzing...
              </>
            ) : !modelsReady ? (
              <>
                <svg viewBox="0 0 16 16" width="15" height="15" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                  <path d="M8 2a6 6 0 016 6" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
                Loading models...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="white" strokeWidth="1.5" />
                  <path d="M10.5 10.5l3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Analyze Article
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
