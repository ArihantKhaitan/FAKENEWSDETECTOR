"use client";

import React from "react";
import { TextShimmer } from "./ui/TextShimmer";

export default function Navbar() {
  return (
    <header
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "56px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px",
        background: "rgba(242,242,247,0.7)",
        backdropFilter: "saturate(180%) blur(30px)",
        WebkitBackdropFilter: "saturate(180%) blur(30px)",
        borderBottom: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04), inset 0 -1px 0 rgba(255,255,255,0.3)",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
        <div
          style={{
            width: "30px", height: "30px", borderRadius: "9px",
            background: "linear-gradient(135deg, #0071E3 0%, #5AC8FA 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,113,227,0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6" stroke="white" strokeWidth="1.5" />
            <path d="M7.5 4.5V8l2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <TextShimmer
          as="span"
          duration={2.5}
          spread={3}
          className="[--base-color:#1D1D1F] [--base-gradient-color:#0071E3] text-[17px] font-semibold tracking-tight"
        >
          TruthLens
        </TextShimmer>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        {[
          { label: "How it works", href: "/how-it-works" },
          { label: "Datasets", href: "https://github.com/ArihantKhaitan/FAKENEWSDETECTOR/blob/master/training/DATASETS.md" },
          { label: "API Docs", href: "http://localhost:8000/docs" },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            style={{
              fontSize: "13px", fontWeight: 400, color: "#6E6E73",
              textDecoration: "none", transition: "color 0.2s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#1D1D1F")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6E6E73")}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* GitHub */}
      <a
        href="https://github.com/ArihantKhaitan/FAKENEWSDETECTOR"
        target="_blank"
        rel="noopener noreferrer"
        className="glass-subtle glass-shimmer"
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "7px 15px", borderRadius: "980px",
          fontSize: "13px", fontWeight: 500, color: "#1D1D1F",
          textDecoration: "none", transition: "transform 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        GitHub
      </a>
    </header>
  );
}
