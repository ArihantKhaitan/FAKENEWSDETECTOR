"use client";

import { useState } from "react";
import type { StageData } from "../page";
import { GlowingEffect } from "./ui/GlowingEffect";

interface Props {
  index: number;
  name: string;
  icon: string;
  description: string;
  data: StageData;
  delay?: number;
  accentColor: string;
}

const VERDICT = {
  PASS: { color: "#30D158", bg: "rgba(48,209,88,0.1)", border: "rgba(48,209,88,0.25)", label: "Pass", check: "✓" },
  WARN: { color: "#FF9F0A", bg: "rgba(255,159,10,0.1)", border: "rgba(255,159,10,0.25)", label: "Warning", check: "△" },
  FAIL: { color: "#FF3B30", bg: "rgba(255,59,48,0.1)", border: "rgba(255,59,48,0.25)", label: "Flagged", check: "✕" },
};

export default function StageCard({ index, name, icon, description, data, delay = 0, accentColor }: Props) {
  const [open, setOpen] = useState(false);
  const cfg = VERDICT[data.verdict as keyof typeof VERDICT] || VERDICT.WARN;

  return (
    <div
      className="glass glass-shimmer animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        borderRadius: "18px",
        overflow: "hidden",
        borderLeft: `3px solid ${cfg.color}`,
        transition: "box-shadow 0.3s ease, transform 0.3s ease",
        position: "relative",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <GlowingEffect spread={30} proximity={60} borderWidth={1.5} movementDuration={1.5} />
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "18px 20px",
          display: "flex", alignItems: "center", gap: "14px",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "inherit", textAlign: "left",
        }}
      >
        {/* Icon tile */}
        <div style={{
          width: "42px", height: "42px", borderRadius: "12px", flexShrink: 0,
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.8)`,
        }}>
          <span style={{ fontSize: "18px" }}>{icon}</span>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Gate {index}
            </span>
          </div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1D1D1F", letterSpacing: "-0.006em" }}>{name}</div>
          <div style={{ fontSize: "12px", color: "#6E6E73", marginTop: "1px" }}>{description}</div>
        </div>

        {/* Score */}
        <div style={{ textAlign: "right", marginRight: "4px", flexShrink: 0 }}>
          <div style={{ fontSize: "24px", fontWeight: 700, color: cfg.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {Math.round(data.score)}
          </div>
          <div style={{ fontSize: "9px", color: "#98989D", letterSpacing: "0.04em", textTransform: "uppercase" }}>/100</div>
        </div>

        {/* Badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: "4px",
          padding: "5px 10px", borderRadius: "980px",
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: "10px", color: cfg.color, fontWeight: 800 }}>{cfg.check}</span>
          <span style={{ fontSize: "11px", color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
        </div>

        {/* Chevron */}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.25s ease", color: "#C0C0C8", flexShrink: 0 }}>
          <path d="M2.5 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Score bar */}
      <div style={{ padding: "0 20px", paddingBottom: open ? "0" : "4px" }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{
            width: `${data.score}%`,
            background: `linear-gradient(90deg, ${cfg.color}60, ${cfg.color})`,
          }} />
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding: "16px 20px 20px", borderTop: "1px solid rgba(0,0,0,0.04)", marginTop: "12px" }}>
          {data.flags.length > 0 ? (
            <>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                Findings
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {data.flags.map((flag, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <div style={{
                      width: "17px", height: "17px", borderRadius: "50%", background: cfg.bg,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: "2px",
                    }}>
                      <span style={{ fontSize: "8px", color: cfg.color, fontWeight: 800 }}>{cfg.check}</span>
                    </div>
                    <span style={{ fontSize: "13px", color: "#3D3D3F", lineHeight: 1.55 }}>{flag}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              display: "flex", gap: "10px", alignItems: "center",
              padding: "12px 14px", background: "rgba(48,209,88,0.06)",
              borderRadius: "10px", border: "1px solid rgba(48,209,88,0.12)",
            }}>
              <span style={{ fontSize: "14px" }}>✓</span>
              <span style={{ fontSize: "13px", color: "#1a7a3c" }}>No issues detected in this stage</span>
            </div>
          )}

          {/* Details grid */}
          {Object.keys(data.details).length > 0 && (
            <div style={{ marginTop: "14px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#98989D", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                Metrics
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "7px" }}>
                {Object.entries(data.details)
                  .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <div key={key} style={{
                      padding: "9px 11px",
                      background: "rgba(0,0,0,0.025)",
                      borderRadius: "10px", border: "1px solid rgba(255,255,255,0.6)",
                    }}>
                      <div style={{ fontSize: "9px", color: "#98989D", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "3px" }}>
                        {key.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1D1D1F" }}>
                        {typeof value === "boolean" ? (value ? "Yes" : "No")
                          : typeof value === "number" ? (value % 1 === 0 ? value : value.toFixed(3))
                          : String(value)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
