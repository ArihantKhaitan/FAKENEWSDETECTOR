"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { icon: "◎", label: "Analyzing headline patterns...",        color: "#0071E3" },
  { icon: "≋", label: "Examining writing style & linguistics...", color: "#BF5AF2" },
  { icon: "◈", label: "Running transformer content model...",  color: "#30D158" },
  { icon: "◉", label: "Checking source credibility...",        color: "#FF9F0A" },
  { icon: "⊕", label: "Searching news corroboration...",       color: "#64D2FF" },
  { icon: "⚖", label: "Computing ensemble verdict...",         color: "#FF3B30" },
];

export default function LoadingScreen() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setCurrent(p => p < STAGES.length - 1 ? p + 1 : p), 900);
    return () => clearInterval(iv);
  }, []);

  const stage = STAGES[current];

  return (
    <div style={{ maxWidth: "580px", margin: "0 auto 60px", padding: "0 24px" }}>
      <div
        className="glass animate-scale-in gradient-border"
        style={{ padding: "44px 36px", textAlign: "center", borderRadius: "28px" }}
      >
        {/* Orbital spinner */}
        <div style={{ position: "relative", width: "64px", height: "64px", margin: "0 auto 28px" }}>
          {/* Outer ring */}
          <svg viewBox="0 0 64 64" width="64" height="64" style={{ position: "absolute", inset: 0 }}>
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
            <circle
              cx="32" cy="32" r="28"
              fill="none" stroke={stage.color} strokeWidth="3"
              strokeDasharray="176" strokeDashoffset="132"
              strokeLinecap="round"
              style={{ transformOrigin: "center", animation: "spin 1s linear infinite", transition: "stroke 0.4s ease" }}
            />
          </svg>
          {/* Inner icon */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "20px", transition: "all 0.3s ease", color: stage.color }}>
              {stage.icon}
            </span>
          </div>
        </div>

        <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#1D1D1F", marginBottom: "6px", letterSpacing: "-0.012em" }}>
          Analyzing article
        </h3>
        <p style={{ fontSize: "14px", color: "#6E6E73", marginBottom: "32px", transition: "all 0.3s ease" }}>
          {stage.label}
        </p>

        {/* Stage list */}
        <div
          style={{
            background: "rgba(0,0,0,0.03)", borderRadius: "16px",
            padding: "4px", display: "flex", flexDirection: "column",
          }}
        >
          {STAGES.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "11px 14px",
                  borderRadius: "12px",
                  background: active ? "rgba(255,255,255,0.7)" : "transparent",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)" : "none",
                  opacity: i > current ? 0.35 : 1,
                  transition: "all 0.35s ease",
                  marginBottom: i < STAGES.length - 1 ? "2px" : "0",
                }}
              >
                <div style={{
                  width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "rgba(48,209,88,0.12)" : active ? `${s.color}15` : "rgba(0,0,0,0.03)",
                  transition: "background 0.3s ease",
                }}>
                  {done ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5 3.5-3.5" stroke="#30D158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span style={{ fontSize: "11px", color: active ? s.color : "#C0C0C8" }}>{s.icon}</span>
                  )}
                </div>
                <span style={{
                  fontSize: "13px",
                  fontWeight: active ? 500 : 400,
                  color: done ? "#30D158" : active ? "#1D1D1F" : "#98989D",
                  transition: "color 0.3s ease",
                  textAlign: "left",
                }}>
                  {s.label}
                </span>
                {active && (
                  <div style={{ marginLeft: "auto" }}>
                    <svg viewBox="0 0 12 12" width="12" height="12">
                      <circle cx="6" cy="6" r="4.5" fill="none" stroke={s.color} strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="20" strokeLinecap="round"
                        style={{ transformOrigin: "center", animation: "spin 0.7s linear infinite" }} />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
