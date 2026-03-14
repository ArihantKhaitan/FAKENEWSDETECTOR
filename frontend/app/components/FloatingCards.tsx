"use client";

import { useEffect, useRef } from "react";

const CARDS = [
  {
    icon: "🧠",
    title: "BiLSTM + Attention",
    body: "Bidirectional LSTM with Bahdanau attention trained on 130k articles",
    color: "#BF5AF2",
    w: 210,
  },
  {
    icon: "🔍",
    title: "Gate 1: Headline",
    body: "8 checks — CAPS ratio, clickbait phrases, punctuation abuse",
    color: "#0071E3",
    w: 220,
  },
  {
    icon: "✍️",
    title: "Gate 2: Style",
    body: "TTR, Flesch score, quote density, weasel words, formality",
    color: "#5856D6",
    w: 215,
  },
  {
    icon: "🤖",
    title: "Gate 3: Transformer",
    body: "4 models compared — RoBERTa, DistilRoBERTa, BERT-base, BERT-tiny",
    color: "#30D158",
    w: 220,
  },
  {
    icon: "🌐",
    title: "Gate 4: Source",
    body: "200+ domain blacklist, HTTPS, TLD trust, URL structure",
    color: "#FF9F0A",
    w: 210,
  },
  {
    icon: "⚡",
    title: "1–5s analysis",
    body: "4 transformer models run in parallel across all gates",
    color: "#FF3B30",
    w: 195,
  },
];

export default function FloatingCards() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Spread initial positions across screen, avoiding center
    const positions = CARDS.map((card, i) => {
      const col = i % 2 === 0 ? 0 : 1; // left or right side
      return {
        x: col === 0
          ? 20 + Math.random() * (vw * 0.18)
          : vw * 0.78 + Math.random() * (vw * 0.18),
        y: 80 + (i * (vh - 120)) / (CARDS.length - 1) + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      };
    });

    let raf: number;
    function animate() {
      positions.forEach((pos, i) => {
        const el = refs.current[i];
        if (!el) return;
        const w = el.offsetWidth || CARDS[i].w;
        const h = el.offsetHeight || 80;
        pos.x += pos.vx;
        pos.y += pos.vy;
        // Reflect off edges
        if (pos.x < 8) { pos.x = 8; pos.vx = Math.abs(pos.vx); }
        if (pos.x > window.innerWidth - w - 8) { pos.x = window.innerWidth - w - 8; pos.vx = -Math.abs(pos.vx); }
        if (pos.y < 64) { pos.y = 64; pos.vy = Math.abs(pos.vy); }
        if (pos.y > window.innerHeight - h - 8) { pos.y = window.innerHeight - h - 8; pos.vy = -Math.abs(pos.vy); }
        el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      });
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", overflow: "hidden",
      }}
    >
      {CARDS.map((card, i) => (
        <div
          key={i}
          ref={el => { refs.current[i] = el; }}
          style={{
            position: "absolute", top: 0, left: 0,
            width: `${card.w}px`,
            background: "rgba(255,255,255,0.52)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: `1px solid ${card.color}22`,
            borderRadius: "16px",
            padding: "12px 14px",
            boxShadow: `0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px ${card.color}10`,
            willChange: "transform",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "5px" }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "8px", flexShrink: 0,
              background: `${card.color}15`,
              border: `1px solid ${card.color}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px",
            }}>{card.icon}</div>
            <span style={{
              fontSize: "11px", fontWeight: 700, color: "#1D1D1F",
              letterSpacing: "-0.005em",
            }}>{card.title}</span>
          </div>
          <p style={{
            fontSize: "10.5px", color: "#6E6E73", lineHeight: 1.5,
            margin: 0, paddingLeft: "1px",
          }}>{card.body}</p>
          <div style={{
            marginTop: "8px", height: "2px", borderRadius: "2px",
            background: `linear-gradient(90deg, ${card.color}50, ${card.color}15)`,
          }} />
        </div>
      ))}
    </div>
  );
}
