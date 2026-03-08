import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Kula — A Sharing Network for Everything";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.1)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 250,
            height: 250,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.08)",
            display: "flex",
          }}
        />

        {/* Logo mark — three connected dots */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 120 120"
            fill="none"
          >
            <circle cx="60" cy="60" r="52" stroke="white" strokeWidth="6" opacity="0.2" />
            <path
              d="M60 8 A52 52 0 1 1 28.6 100.4"
              stroke="white"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M28.6 100.4 L22 88 L38 94"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="60" cy="60" r="20" fill="white" opacity="0.12" />
            <circle cx="60" cy="38" r="5" fill="white" />
            <circle cx="79" cy="70" r="5" fill="white" />
            <circle cx="41" cy="70" r="5" fill="white" />
            <line x1="60" y1="43" x2="76" y2="66" stroke="white" strokeWidth="2" opacity="0.4" />
            <line x1="60" y1="43" x2="44" y2="66" stroke="white" strokeWidth="2" opacity="0.4" />
            <line x1="44" y1="70" x2="76" y2="70" stroke="white" strokeWidth="2" opacity="0.4" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-1px",
            display: "flex",
          }}
        >
          Kula
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.8)",
            marginTop: 12,
            display: "flex",
          }}
        >
          A Sharing Network for Everything
        </div>

        {/* Keywords */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
          }}
        >
          {["Lend", "Borrow", "Gift", "Barter", "Time Exchange"].map(
            (word) => (
              <div
                key={word}
                style={{
                  padding: "8px 20px",
                  borderRadius: 999,
                  border: "1.5px solid rgba(255,255,255,0.3)",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 18,
                  display: "flex",
                }}
              >
                {word}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
