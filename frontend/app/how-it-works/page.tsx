"use client";

import Navbar from "../components/Navbar";
import Link from "next/link";

const GATES = [
  {
    num: 1,
    icon: "◎",
    color: "#0071E3",
    bg: "rgba(0,113,227,0.07)",
    border: "rgba(0,113,227,0.18)",
    name: "Headline Analysis",
    subtitle: "First contact — what the title reveals",
    checks: [
      { label: "ALL-CAPS ratio", desc: "Measures shouting — real news rarely uses excessive caps" },
      { label: "Clickbait phrases", desc: "Detects 40+ patterns like SHOCKING, You wont believe" },
      { label: "Punctuation abuse", desc: "Multiple !! or ??? signals sensationalism" },
      { label: "Absolutist language", desc: "Words like always, never, every in news context" },
      { label: "Emotional triggers", desc: "Fear/outrage vocabulary from a curated wordlist" },
      { label: "Word count anomaly", desc: "Headlines under 4 or over 22 words are atypical" },
    ],
    lab: "Regex + NLP heuristics (Lab 2 foundations)",
  },
  {
    num: 2,
    icon: "≋",
    color: "#BF5AF2",
    bg: "rgba(191,90,242,0.07)",
    border: "rgba(191,90,242,0.18)",
    name: "Linguistic Style",
    subtitle: "How the article is written, not what it says",
    checks: [
      { label: "Type-Token Ratio (TTR)", desc: "Vocabulary richness — fake news often repeats the same words" },
      { label: "Flesch Reading Ease", desc: "Extreme simplicity or complexity signals poor journalism" },
      { label: "Sentence length variance", desc: "High variance is normal; uniform short sentences suggest automation" },
      { label: "Quote density", desc: "Legitimate articles cite sources; missing quotes are a red flag" },
      { label: "Weasel words", desc: "reportedly, sources say, allegedly without attribution" },
      { label: "First-person overuse", desc: "Opinion framed as news inflates I/we/my frequency" },
      { label: "Phrase repetition", desc: "Copy-paste propaganda repeats key phrases verbatim" },
    ],
    lab: "Classical NLP features (Lab 3 feature extraction)",
  },
  {
    num: 3,
    icon: "◈",
    color: "#30D158",
    bg: "rgba(48,209,88,0.07)",
    border: "rgba(48,209,88,0.18)",
    name: "Transformer Content AI",
    subtitle: "Deep semantic understanding via BERT-class model",
    checks: [
      { label: "RoBERTa classification", desc: "Pre-trained on 72k WELFake articles, fine-tuned with 2-phase transfer learning" },
      { label: "Sentiment extremity", desc: "Extreme sentiment in factual reporting is anomalous" },
      { label: "Named entity density", desc: "Thin on real names/places/orgs suggests fabrication" },
      { label: "Headline-body consistency", desc: "Checks if the headline matches the actual article content" },
      { label: "Attention word extraction", desc: "Bahdanau attention highlights the most suspicious words" },
    ],
    lab: "Transfer Learning + BiLSTM + Attention (Labs 6, 8, 9)",
  },
  {
    num: 4,
    icon: "◉",
    color: "#FF9F0A",
    bg: "rgba(255,159,10,0.07)",
    border: "rgba(255,159,10,0.18)",
    name: "Source Credibility",
    subtitle: "Reputation and infrastructure of the publishing domain",
    checks: [
      { label: "Domain blacklist/whitelist", desc: "200+ known fake news & satire sites flagged; 50+ trusted sources whitelisted" },
      { label: "TLD trust scoring", desc: ".gov/.edu > .com > .info/.biz > .xyz — low-trust TLDs penalized" },
      { label: "HTTPS enforcement", desc: "Legitimate news sites overwhelmingly use HTTPS" },
      { label: "URL structure analysis", desc: "Excessive hyphens, long paths, numeric IDs signal content farms" },
      { label: "Subdomain abuse", desc: "Patterns like news.random-domain.com mimic real outlets" },
      { label: "Byline & date presence", desc: "Missing author or publication date are journalistic red flags" },
    ],
    lab: "Rule-based domain intelligence (heuristic systems)",
  },
];

const TECH = [
  { name: "PyTorch", desc: "Model training & inference", color: "#EE4C2C" },
  { name: "BiLSTM", desc: "Sequence encoding (Lab 8/9)", color: "#5856D6" },
  { name: "Bahdanau Attention", desc: "Custom attention mechanism", color: "#BF5AF2" },
  { name: "BERT / RoBERTa", desc: "Transfer learning (Lab 6)", color: "#0071E3" },
  { name: "Dropout + L2", desc: "Regularization (Lab 7)", color: "#30D158" },
  { name: "FastAPI", desc: "Backend REST API", color: "#009688" },
  { name: "Next.js 16", desc: "React 19 frontend", color: "#1D1D1F" },
  { name: "HuggingFace", desc: "Pre-trained model hub", color: "#FF9F0A" },
];

export default function HowItWorksPage() {
  return (
    <>
      <div className="mesh-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <Navbar />

        {/* Hero */}
        <section style={{ textAlign: "center", maxWidth: "860px", margin: "0 auto", padding: "120px 24px 60px" }}>
          <div
            className="animate-fade-in glass-subtle"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "980px", marginBottom: "28px" }}
          >
            <span style={{ fontSize: "13px" }}>🛡️</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#0071E3", letterSpacing: "0.07em", textTransform: "uppercase" }}>
              System Architecture
            </span>
          </div>

          <h1
            className="animate-fade-up"
            style={{ fontSize: "clamp(40px, 6vw, 76px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.0, color: "#1D1D1F", marginBottom: "22px" }}
          >
            How <span className="text-gradient-blue">TruthLens</span> works
          </h1>

          <p
            className="animate-fade-up delay-100"
            style={{ fontSize: "19px", color: "#6E6E73", lineHeight: 1.65, maxWidth: "640px", margin: "0 auto 48px" }}
          >
            Four independent AI gates analyze every article in parallel. Each gate scores a different dimension of credibility. The ensemble combines them into a final verdict.
          </p>

          {/* Pipeline visual */}
          <div
            className="animate-fade-up delay-200"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "80px", flexWrap: "wrap" }}
          >
            {([
              { label: "Article", icon: "📄", bg: "#F2F2F7", color: "#1D1D1F" },
              null,
              { label: "Headline", icon: "◎", bg: "rgba(0,113,227,0.1)", color: "#0071E3" },
              { label: "Style", icon: "≋", bg: "rgba(191,90,242,0.1)", color: "#BF5AF2" },
              { label: "AI Model", icon: "◈", bg: "rgba(48,209,88,0.1)", color: "#30D158" },
              { label: "Source", icon: "◉", bg: "rgba(255,159,10,0.1)", color: "#FF9F0A" },
              null,
              { label: "Verdict", icon: "⚖", bg: "#1D1D1F", color: "#fff" },
            ] as ({ label: string; icon: string; bg: string; color: string } | null)[]).map((item, i) =>
              item === null ? (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                  <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
                    <path d="M1 5h20M16 1l4 4-4 4" stroke="rgba(0,0,0,0.2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div key={i} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                  padding: "10px 14px", borderRadius: "14px",
                  background: item.bg, border: `1px solid ${item.color}20`,
                  minWidth: "70px", margin: "4px",
                }}>
                  <span style={{ fontSize: "18px", color: item.color }}>{item.icon}</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: item.color === "#fff" ? "#fff" : "#3D3D3F" }}>{item.label}</span>
                </div>
              )
            )}
          </div>
        </section>

        {/* Gates */}
        <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: "20px" }}>
            {GATES.map((gate, gi) => (
              <div
                key={gi}
                className="glass glass-shimmer animate-fade-up"
                style={{ animationDelay: `${gi * 100}ms`, borderRadius: "24px", padding: "28px", borderLeft: `4px solid ${gate.color}` }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "20px" }}>
                  <div style={{
                    width: "48px", height: "48px", borderRadius: "14px", flexShrink: 0,
                    background: gate.bg, border: `1px solid ${gate.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "22px", color: gate.color,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                  }}>
                    {gate.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "4px" }}>
                      <span style={{
                        fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                        color: gate.color, background: gate.bg, padding: "2px 8px", borderRadius: "980px",
                        border: `1px solid ${gate.border}`,
                      }}>Gate {gate.num}</span>
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.02em" }}>{gate.name}</div>
                    <div style={{ fontSize: "12px", color: "#6E6E73", marginTop: "2px" }}>{gate.subtitle}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  {gate.checks.map((check, ci) => (
                    <div key={ci} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <div style={{
                        width: "18px", height: "18px", borderRadius: "6px", flexShrink: 0, marginTop: "1px",
                        background: gate.bg, border: `1px solid ${gate.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l1.8 1.8 3.2-3.2" stroke={gate.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1D1D1F" }}>{check.label}</span>
                        <span style={{ fontSize: "12px", color: "#6E6E73" }}> — {check.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: "8px 12px", borderRadius: "10px",
                  background: "rgba(0,0,0,0.03)", border: "1px solid rgba(255,255,255,0.6)",
                  fontSize: "11px", color: "#98989D", fontStyle: "italic",
                }}>
                  📚 {gate.lab}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ensemble scoring */}
        <section style={{ maxWidth: "820px", margin: "0 auto", padding: "0 24px 80px" }}>
          <div className="glass animate-fade-up" style={{ borderRadius: "24px", padding: "36px", textAlign: "center" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.025em", color: "#1D1D1F", marginBottom: "8px" }}>
              Ensemble Scoring
            </h2>
            <p style={{ fontSize: "15px", color: "#6E6E73", marginBottom: "32px" }}>
              Gates are weighted by their predictive power. Content AI carries the most weight.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { gate: "Headline", weight: 15, color: "#0071E3" },
                { gate: "Style", weight: 25, color: "#BF5AF2" },
                { gate: "Content AI", weight: 40, color: "#30D158" },
                { gate: "Source", weight: 20, color: "#FF9F0A" },
              ].map(g => (
                <div key={g.gate} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                  padding: "16px 20px", borderRadius: "16px",
                  background: `${g.color}0D`, border: `1px solid ${g.color}25`, minWidth: "120px",
                }}>
                  <div style={{ fontSize: "32px", fontWeight: 700, color: g.color, letterSpacing: "-0.03em" }}>{g.weight}%</div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#3D3D3F" }}>{g.gate}</div>
                  <div style={{ width: "100%", height: "3px", borderRadius: "2px", background: `${g.color}20` }}>
                    <div style={{ width: `${g.weight / 0.4}%`, height: "100%", borderRadius: "2px", background: g.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "24px", padding: "14px 20px", background: "rgba(0,0,0,0.03)", borderRadius: "12px", fontSize: "13px", color: "#6E6E73" }}>
              Score {"<"} 40 → <strong style={{ color: "#30D158" }}>REAL</strong>
              {" | "} 40–65 → <strong style={{ color: "#FF9F0A" }}>SUSPICIOUS</strong>
              {" | "} {">"} 65 → <strong style={{ color: "#FF3B30" }}>FAKE</strong>
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section style={{ maxWidth: "860px", margin: "0 auto", padding: "0 24px 80px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.025em", color: "#1D1D1F", marginBottom: "20px", textAlign: "center" }}>
            Technology Stack
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "12px" }}>
            {TECH.map((t, i) => (
              <div key={i} className="glass-subtle glass-shimmer animate-fade-up" style={{ animationDelay: `${i * 60}ms`, padding: "16px 18px", borderRadius: "16px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: t.color, marginBottom: "4px" }}>{t.name}</div>
                <div style={{ fontSize: "12px", color: "#6E6E73" }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: "center", padding: "0 24px 100px" }}>
          <Link href="/" className="btn-primary" style={{ display: "inline-flex", fontSize: "15px" }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="white" strokeWidth="1.5" />
              <path d="M10.5 10.5l3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Try it now
          </Link>
        </section>

        <footer style={{ padding: "32px 24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.5)" }}>
          <p style={{ color: "#98989D", fontSize: "13px" }}>
            TruthLens · Deep Learning Lab · BiLSTM + Attention + BERT Transfer Learning
          </p>
        </footer>
      </div>
    </>
  );
}
