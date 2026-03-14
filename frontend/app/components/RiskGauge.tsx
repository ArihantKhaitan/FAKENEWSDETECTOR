"use client";

import { useEffect, useState } from "react";

interface Props {
  score: number;
  verdict: "REAL" | "SUSPICIOUS" | "FAKE";
}

const COLORS = { REAL: "#30D158", SUSPICIOUS: "#FF9F0A", FAKE: "#FF3B30" };

export default function RiskGauge({ score, verdict }: Props) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const end = score;
      const duration = 1400;
      const t0 = performance.now();
      function step(now: number) {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 4); // ease out quart
        setAnimated(Math.round(eased * end));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, 400);
    return () => clearTimeout(timer);
  }, [score]);

  const size = 188;
  const cx = size / 2;
  const cy = size / 2;
  const r = 74;
  const startAngle = 200;
  const totalArc = 220;
  const circ = 2 * Math.PI * r;
  const arcLen = (totalArc / 360) * circ;
  const fillLen = (animated / 100) * arcLen;
  const color = COLORS[verdict];

  function polarXY(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arc(a1: number, a2: number, rad: number) {
    const s = polarXY(a1, rad), e = polarXY(a2, rad);
    return `M ${s.x} ${s.y} A ${rad} ${rad} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
  }

  const fillEnd = startAngle + (animated / 100) * totalArc;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "28px 20px 20px",
      background: `${color}0D`,
      borderRadius: "20px",
      border: `1px solid ${color}30`,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow: `0 12px 40px ${color}20, inset 0 1px 0 rgba(255,255,255,0.6)`,
      minWidth: "210px",
    }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Glow filter */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Track */}
          <path d={arc(startAngle, startAngle + totalArc, r)} fill="none"
            stroke="rgba(0,0,0,0.07)" strokeWidth={11} strokeLinecap="round" />

          {/* Subtle ticks */}
          {[0, 25, 50, 75, 100].map(t => {
            const a = startAngle + (t / 100) * totalArc;
            const inner = polarXY(a, r - 13);
            const outer = polarXY(a, r - 19);
            return (
              <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke="rgba(0,0,0,0.1)" strokeWidth="1.5" strokeLinecap="round" />
            );
          })}

          {/* Fill arc */}
          {animated > 0 && (
            <path d={arc(startAngle, fillEnd, r)} fill="none"
              stroke={color} strokeWidth={11} strokeLinecap="round"
              filter="url(#glow)"
              style={{ transition: "stroke 0.4s ease" }}
            />
          )}

          {/* End dot */}
          {animated > 2 && (() => {
            const dot = polarXY(fillEnd, r);
            return (
              <circle cx={dot.x} cy={dot.y} r="5" fill={color}
                style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
            );
          })()}
        </svg>

        {/* Center score */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          paddingTop: "18px",
        }}>
          <div style={{
            fontSize: "50px", fontWeight: 700,
            color: color, lineHeight: 1,
            letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 20px ${color}40`,
          }}>
            {animated}
          </div>
          <div style={{
            fontSize: "10px", color: "rgba(0,0,0,0.35)",
            fontWeight: 600, letterSpacing: "0.07em",
            textTransform: "uppercase", marginTop: "5px",
          }}>
            Risk Score
          </div>
        </div>
      </div>

      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "0 6px", marginTop: "2px" }}>
        <span style={{ fontSize: "10px", color: "#30D158", fontWeight: 600 }}>LOW</span>
        <span style={{ fontSize: "10px", color: "#FF9F0A", fontWeight: 600 }}>MED</span>
        <span style={{ fontSize: "10px", color: "#FF3B30", fontWeight: 600 }}>HIGH</span>
      </div>
    </div>
  );
}
