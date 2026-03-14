"use client";

import { useEffect, useRef, useState } from "react";

type Verdict = "REAL" | "FAKE" | "SUSPICIOUS";

const HEADLINES: { source: string; headline: string; verdict: Verdict }[] = [
  // REAL
  { source: "Reuters", headline: "Federal Reserve raises interest rates by 25 basis points amid persistent inflation", verdict: "REAL" },
  { source: "AP News", headline: "Apple reports quarterly revenue of $119.6 billion, beating analyst estimates", verdict: "REAL" },
  { source: "BBC News", headline: "WHO declares end of COVID-19 global health emergency after three years", verdict: "REAL" },
  { source: "NASA", headline: "James Webb telescope captures deepest infrared image of the early universe", verdict: "REAL" },
  { source: "The Guardian", headline: "UK parliament passes landmark climate bill targeting net zero by 2050", verdict: "REAL" },
  { source: "Bloomberg", headline: "India surpasses China to become world's most populous nation, UN confirms", verdict: "REAL" },
  // FAKE
  { source: "TruthAlert.net", headline: "SHOCKING: 5G towers secretly uploading your memories to globalist servers!", verdict: "FAKE" },
  { source: "PatriotInsider", headline: "BREAKING: Secret order will confiscate all firearms nationwide by 2025!!", verdict: "FAKE" },
  { source: "WakeUpAmerica", headline: "MIT confirms microchips found in COVID vaccines — total media BLACKOUT", verdict: "FAKE" },
  { source: "HealthTruth.org", headline: "Big Pharma SUPPRESSING cancer cure for 30 years — doctors finally speak out!!", verdict: "FAKE" },
  { source: "DeepStateFacts", headline: "Leaked docs EXPOSE globalist cabal funding riots in 47 US cities — share now!", verdict: "FAKE" },
  // SUSPICIOUS
  { source: "NewsNow247", headline: "Anonymous sources claim government secretly tracking all social media users", verdict: "SUSPICIOUS" },
  { source: "GlobalReport", headline: "Insiders allege election software had hidden backdoor, officials deny", verdict: "SUSPICIOUS" },
  { source: "IntelDrop", headline: "Sources say major bank bailout planned before public announcement", verdict: "SUSPICIOUS" },
];

const VERDICT_CFG = {
  REAL:       { color: "#30D158", bg: "rgba(48,209,88,0.1)",   border: "rgba(48,209,88,0.25)",   icon: "✓" },
  FAKE:       { color: "#FF3B30", bg: "rgba(255,59,48,0.1)",   border: "rgba(255,59,48,0.25)",   icon: "✕" },
  SUSPICIOUS: { color: "#FF9F0A", bg: "rgba(255,159,10,0.1)",  border: "rgba(255,159,10,0.25)",  icon: "△" },
};

const CARD_COUNT = 6;
const CARD_W = 258;

export default function FloatingCards() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  // Which headline index is shown per card slot
  const [shownIdx, setShownIdx] = useState<number[]>(() =>
    Array.from({ length: CARD_COUNT }, (_, i) => i % HEADLINES.length)
  );
  // Which card slot is currently fading out (opacity → 0)
  const [fadingSlot, setFadingSlot] = useState<number | null>(null);
  const nextHeadlineRef = useRef(CARD_COUNT % HEADLINES.length);

  // Bounce physics
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const positions = Array.from({ length: CARD_COUNT }, (_, i) => {
      const col = i % 2 === 0 ? 0 : 1;
      return {
        x: col === 0
          ? 20 + Math.random() * (vw * 0.17)
          : vw * 0.79 + Math.random() * (vw * 0.17),
        y: 80 + (i * (vh - 140)) / (CARD_COUNT - 1) + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
      };
    });

    let raf: number;
    function animate() {
      positions.forEach((pos, i) => {
        const el = refs.current[i];
        if (!el) return;
        const w = el.offsetWidth || CARD_W;
        const h = el.offsetHeight || 90;
        pos.x += pos.vx;
        pos.y += pos.vy;
        if (pos.x < 8)                           { pos.x = 8;                            pos.vx =  Math.abs(pos.vx); }
        if (pos.x > window.innerWidth  - w - 8)  { pos.x = window.innerWidth  - w - 8;  pos.vx = -Math.abs(pos.vx); }
        if (pos.y < 64)                           { pos.y = 64;                           pos.vy =  Math.abs(pos.vy); }
        if (pos.y > window.innerHeight - h - 8)  { pos.y = window.innerHeight - h - 8;  pos.vy = -Math.abs(pos.vy); }
        el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      });
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Cycle one headline every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const slot = Math.floor(Math.random() * CARD_COUNT);
      const next = nextHeadlineRef.current;

      setFadingSlot(slot);

      setTimeout(() => {
        setShownIdx(prev => {
          const updated = [...prev];
          updated[slot] = next;
          return updated;
        });
        nextHeadlineRef.current = (next + 1) % HEADLINES.length;
        setFadingSlot(null);
      }, 380);
    }, 3200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: CARD_COUNT }, (_, i) => {
        const h = HEADLINES[shownIdx[i]];
        const cfg = VERDICT_CFG[h.verdict];
        const fading = fadingSlot === i;

        return (
          <div
            key={i}
            ref={el => { refs.current[i] = el; }}
            style={{
              position: "absolute", top: 0, left: 0,
              width: `${CARD_W}px`,
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(28px) saturate(190%)",
              WebkitBackdropFilter: "blur(28px) saturate(190%)",
              border: `1px solid ${cfg.color}20`,
              borderRadius: "18px",
              padding: "13px 15px",
              boxShadow: `0 4px 28px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.92), 0 0 0 1px ${cfg.color}0A`,
              willChange: "transform",
              opacity: fading ? 0 : 1,
              transition: "opacity 0.35s ease",
            }}
          >
            {/* Source + verdict badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{
                fontSize: "9.5px", fontWeight: 700, color: "#98989D",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                {h.source}
              </span>
              <div style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "2px 8px", borderRadius: "980px",
                background: cfg.bg, border: `1px solid ${cfg.border}`,
              }}>
                <span style={{ fontSize: "8px", fontWeight: 800, color: cfg.color }}>{cfg.icon}</span>
                <span style={{ fontSize: "9px", fontWeight: 700, color: cfg.color, letterSpacing: "0.04em" }}>
                  {h.verdict}
                </span>
              </div>
            </div>

            {/* Headline */}
            <p style={{
              fontSize: "11.5px", fontWeight: 500, color: "#1D1D1F",
              lineHeight: 1.5, margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {h.headline}
            </p>

            {/* Colored bottom bar */}
            <div style={{
              marginTop: "10px", height: "2px", borderRadius: "2px",
              background: `linear-gradient(90deg, ${cfg.color}60, ${cfg.color}15)`,
            }} />
          </div>
        );
      })}
    </div>
  );
}
