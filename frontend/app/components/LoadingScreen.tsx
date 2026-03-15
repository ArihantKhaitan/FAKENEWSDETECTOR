"use client";

import { useEffect, useState } from "react";
import { BackgroundGradientAnimation } from "./ui/BackgroundGradientAnimation";

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
        className="animate-scale-in"
        style={{ borderRadius: "28px", overflow: "hidden", position: "relative" }}
      >
      <BackgroundGradientAnimation
        gradientBackgroundStart="rgb(10, 15, 35)"
        gradientBackgroundEnd="rgb(5, 8, 20)"
        firstColor="0, 113, 227"
        secondColor="107, 33, 168"
        thirdColor="48, 209, 88"
        fourthColor="255, 159, 10"
        fifthColor="100, 210, 255"
        interactive={false}
        containerClassName="!h-full !w-full absolute inset-0"
      />
      <div
        style={{ position: "relative", zIndex: 10, padding: "44px 36px", textAlign: "center" }}
      >
        {/* Orbital spinner */}
        <div style={{ position: "relative", width: "64px", height: "64px", margin: "0 auto 28px" }}>
          {/* Outer ring */}
          <svg viewBox="0 0 64 64" width="64" height="64" style={{ position: "absolute", inset: 0 }}>
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
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

        <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#F5F5F7", marginBottom: "6px", letterSpacing: "-0.012em" }}>
          Analyzing article
        </h3>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "32px", transition: "all 0.3s ease" }}>
          {stage.label}
        </p>

        {/* Stage list */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)", borderRadius: "16px",
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
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
                  opacity: i > current ? 0.35 : 1,
                  transition: "all 0.35s ease",
                  marginBottom: i < STAGES.length - 1 ? "2px" : "0",
                }}
              >
                <div style={{
                  width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "rgba(48,209,88,0.2)" : active ? `${s.color}25` : "rgba(255,255,255,0.06)",
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
                  color: done ? "#30D158" : active ? "#ffffff" : "rgba(255,255,255,0.4)",
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
    </div>
  );
}
