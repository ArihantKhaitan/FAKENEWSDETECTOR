import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TruthLens — AI Fake News Detector",
  description:
    "Multi-stage AI analysis that examines headlines, writing style, content, and source credibility to detect misinformation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>🔍</text></svg>" />
      </head>
      <body style={{ background: "#FBFBFD", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
