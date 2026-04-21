import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Vibe type colors — mirrors lib/vibeTypes.ts
const VIBE_COLORS: Record<string, string> = {
  "0": "#7F77DD", // Architect
  "1": "#D85A30", // Degen
  "2": "#888780", // Ghost
  "3": "#1D9E75", // Builder
  "4": "#185FA5", // Whale Hunter
  "5": "#D4537E", // Socialite
  "6": "#BA7517", // Oracle
};

const VIBE_NAMES: Record<string, string> = {
  "0": "The Architect",
  "1": "The Degen",
  "2": "The Ghost",
  "3": "The Builder",
  "4": "The Whale Hunter",
  "5": "The Socialite",
  "6": "The Oracle",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const personaName = searchParams.get("name") ?? "Unknown";
  const vibeType = searchParams.get("type") ?? "hidden";
  const wins = parseInt(searchParams.get("wins") ?? "0", 10);
  const losses = parseInt(searchParams.get("losses") ?? "0", 10);

  const accent = vibeType !== "hidden" ? (VIBE_COLORS[vibeType] ?? "#7F77DD") : "#7F77DD";
  const vibeName = vibeType !== "hidden" ? (VIBE_NAMES[vibeType] ?? "???") : "????";
  const isRevealed = vibeType !== "hidden";

  // Load Inter font (TTF required by satori)
  let fontData: ArrayBuffer | null = null;
  try {
    const fontRes = await fetch(
      "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZxhiA.woff",
      { next: { revalidate: 86400 } } as any
    );
    if (fontRes.ok) fontData = await fontRes.arrayBuffer();
  } catch { /* fall back to system font */ }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#080810",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Gradient glow top-left */}
        <div style={{
          position: "absolute",
          top: "-120px",
          left: "-80px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          display: "flex",
        }} />

        {/* Gradient glow bottom-right */}
        <div style={{
          position: "absolute",
          bottom: "-100px",
          right: "-80px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,83,126,0.15) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* Top bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "36px 56px 0",
        }}>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "18px", letterSpacing: "0.15em" }}>
            PROOF OF VIBE
          </span>
          <span style={{
            color: accent,
            fontSize: "13px",
            letterSpacing: "0.2em",
            padding: "5px 14px",
            border: `1px solid ${accent}50`,
            borderRadius: "100px",
            background: `${accent}15`,
          }}>
            STARKNET SEPOLIA
          </span>
        </div>

        {/* Main content */}
        <div style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          padding: "0 56px",
          gap: "64px",
        }}>
          {/* Card visual */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            flexShrink: 0,
          }}>
            <div style={{
              width: "220px",
              height: "320px",
              borderRadius: "20px",
              border: `1.5px solid ${accent}50`,
              background: `linear-gradient(160deg, ${accent}12 0%, rgba(8,8,16,0.8) 100%)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Card inner glow */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "2px",
                background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`,
                display: "flex",
              }} />

              {/* Lock icon */}
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: `${accent}20`,
                border: `1px solid ${accent}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
              }}>
                🔒
              </div>

              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                padding: "0 16px",
              }}>
                <span style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "16px",
                  fontWeight: "600",
                  textAlign: "center",
                  letterSpacing: "0.02em",
                }}>
                  {personaName}
                </span>
                <span style={{
                  color: accent,
                  fontSize: "12px",
                  letterSpacing: "0.15em",
                  fontWeight: "500",
                }}>
                  {isRevealed ? vibeName.toUpperCase() : "TYPE SEALED"}
                </span>
              </div>

              {/* Battle stats */}
              {(wins > 0 || losses > 0) && (
                <div style={{
                  display: "flex",
                  gap: "16px",
                  marginTop: "8px",
                }}>
                  <span style={{ color: "rgba(34,197,94,0.8)", fontSize: "13px" }}>
                    {wins}W
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>·</span>
                  <span style={{ color: "rgba(239,68,68,0.8)", fontSize: "13px" }}>
                    {losses}L
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Text content */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <span style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: "14px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}>
                {isRevealed ? "Vibe Revealed" : "Identity Sealed"}
              </span>
              <span style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: "44px",
                fontWeight: "700",
                lineHeight: "1.1",
                letterSpacing: "-0.02em",
              }}>
                {isRevealed ? vibeName : "Who am I?"}
              </span>
            </div>

            <div style={{
              width: "48px",
              height: "2px",
              background: `linear-gradient(90deg, ${accent}, transparent)`,
              display: "flex",
            }} />

            <span style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "20px",
              lineHeight: "1.5",
            }}>
              {isRevealed
                ? `${personaName}'s onchain identity has been uncovered.`
                : "Battle to expose this card's hidden vibe type."
              }
            </span>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "8px",
            }}>
              <div style={{
                padding: "10px 20px",
                borderRadius: "12px",
                background: `${accent}20`,
                border: `1px solid ${accent}40`,
                color: accent,
                fontSize: "15px",
                fontWeight: "600",
                display: "flex",
              }}>
                ⚔️ Challenge this card
              </div>
              <div style={{
                padding: "10px 20px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                fontSize: "15px",
                display: "flex",
              }}>
                #ProofOfVibe
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 56px 32px",
        }}>
          <span style={{
            color: "rgba(255,255,255,0.2)",
            fontSize: "13px",
            letterSpacing: "0.05em",
          }}>
            proof-of-vibe-kohl.vercel.app
          </span>
          <span style={{
            color: "rgba(255,255,255,0.15)",
            fontSize: "13px",
          }}>
            Your onchain soul. Proven. Hidden.
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fontData ? {
        fonts: [{
          name: "Inter",
          data: fontData,
          style: "normal",
          weight: 400,
        }],
      } : {}),
    }
  );
}
