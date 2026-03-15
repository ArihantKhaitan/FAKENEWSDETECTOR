"use client";

import { useState, useEffect, useRef } from "react";

interface OrbitalItem {
  id: number;
  title: string;
  icon: string;
  color: string;
  description: string;
  weight: number;
}

interface RadialOrbitalTimelineProps {
  items: OrbitalItem[];
}

export default function RadialOrbitalTimeline({ items }: RadialOrbitalTimelineProps) {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoRotate) {
      timerRef.current = setInterval(() => {
        setRotationAngle((prev) => Number(((prev + 0.25) % 360).toFixed(3)));
      }, 50);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRotate]);

  const getPosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 170;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(0.45, Math.min(1, 0.45 + 0.55 * ((1 + Math.sin(radian)) / 2)));
    const scale = Math.max(0.82, Math.min(1, 0.82 + 0.18 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, zIndex, opacity, scale };
  };

  const handleClick = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
    setAutoRotate(expandedId === id); // stop rotation when expanded
  };

  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{ height: "480px" }}
    >
      {/* Orbit ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: "380px", height: "380px",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 0 40px rgba(0,113,227,0.08)",
        }}
      />
      {/* Inner ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: "280px", height: "280px",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      />

      {/* Central core */}
      <div
        className="absolute z-10 flex items-center justify-center rounded-full"
        style={{
          width: "72px", height: "72px",
          background: "linear-gradient(135deg, #0071E3 0%, #5AC8FA 50%, #BF5AF2 100%)",
          boxShadow: "0 0 40px rgba(0,113,227,0.5), 0 0 80px rgba(0,113,227,0.2)",
          animation: "spin 8s linear infinite",
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: "52px", height: "52px",
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(20px)",
          }}
        >
          <span style={{ fontSize: "22px" }}>⚖</span>
        </div>
      </div>
      <div
        className="absolute z-9"
        style={{
          width: "72px", height: "72px",
          borderRadius: "50%",
          background: "rgba(0,113,227,0.15)",
          filter: "blur(12px)",
          animation: "pulse-glow 2s ease-in-out infinite",
        }}
      />

      {/* Orbital nodes */}
      {items.map((item, index) => {
        const pos = getPosition(index, items.length);
        const isExpanded = expandedId === item.id;

        return (
          <div
            key={item.id}
            className="absolute transition-all duration-500 cursor-pointer"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${isExpanded ? 1.1 : pos.scale})`,
              zIndex: isExpanded ? 200 : pos.zIndex,
              opacity: isExpanded ? 1 : pos.opacity,
            }}
            onClick={() => handleClick(item.id)}
          >
            {/* Node circle */}
            <div
              className="flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: "48px", height: "48px",
                background: isExpanded ? item.color : "rgba(255,255,255,0.08)",
                border: `2px solid ${item.color}`,
                boxShadow: isExpanded
                  ? `0 0 20px ${item.color}80, 0 0 40px ${item.color}30`
                  : `0 0 12px ${item.color}30`,
                backdropFilter: "blur(20px)",
                transform: `translate(-50%, -50%)`,
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  color: isExpanded ? "#fff" : item.color,
                  filter: isExpanded ? "brightness(1.5)" : "none",
                }}
              >
                {item.icon}
              </span>
            </div>

            {/* Label */}
            <div
              className="absolute whitespace-nowrap text-center"
              style={{
                top: "16px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "10px",
                fontWeight: 600,
                color: isExpanded ? item.color : "rgba(255,255,255,0.6)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                textShadow: isExpanded ? `0 0 10px ${item.color}` : "none",
                transition: "all 0.3s ease",
              }}
            >
              {item.title}
            </div>

            {/* Expanded card */}
            {isExpanded && (
              <div
                className="absolute"
                style={{
                  top: "28px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "180px",
                  background: "rgba(15,23,42,0.92)",
                  backdropFilter: "blur(24px)",
                  border: `1px solid ${item.color}40`,
                  borderRadius: "14px",
                  padding: "12px 14px",
                  boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${item.color}20`,
                  animation: "fadeUp 0.2s ease forwards",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: item.color, marginBottom: "6px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", lineHeight: 1.55, marginBottom: "8px" }}>
                  {item.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>Weight</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: item.color }}>{item.weight}%</span>
                </div>
                <div style={{ height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${item.weight / 0.28}%`, height: "100%", background: item.color, borderRadius: "2px" }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
