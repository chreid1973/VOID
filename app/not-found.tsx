import Image from "next/image";
import Link from "next/link";

const brandMarkStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "linear-gradient(135deg, #ff4826 0%, #ff8040 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  boxShadow: "0 2px 12px rgba(255,72,38,.32)",
} as const;

const buttonBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 20px",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  letterSpacing: ".01em",
} as const;

const brandWordmarkStyle = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 0,
  fontFamily: "var(--font-fraunces), Georgia, serif",
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: "-.04em",
  lineHeight: 1,
} as const;

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(255,72,38,.08), transparent 26%), #0f0e0e",
        color: "#e6e1da",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "18px 18px 42px",
        }}
      >
        <Link
          href="/feed"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            userSelect: "none",
          }}
        >
          <span style={brandMarkStyle}>◈</span>
          <span style={brandWordmarkStyle}>
            <span style={{ color: "#ede8e0" }}>Social</span>
            <span style={{ color: "#ff6d36" }}>VOID</span>
          </span>
        </Link>

        <div
          style={{
            minHeight: "calc(100vh - 94px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "26px 0 14px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 980,
              background: "#151413",
              border: "1px solid #2a2828",
              borderRadius: 22,
              boxShadow: "0 22px 80px rgba(0,0,0,.44)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
              }}
            >
              <section
                style={{
                  flex: "1 1 420px",
                  minWidth: 0,
                  padding: "34px 30px 32px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "#8c847c",
                    marginBottom: 12,
                  }}
                >
                  Error 404
                </p>

                <h1
                  style={{
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                    fontSize: 46,
                    fontWeight: 600,
                    lineHeight: 1.02,
                    letterSpacing: "-.04em",
                    color: "#f3eee8",
                    marginBottom: 18,
                  }}
                >
                  This content is unavailable.
                </h1>

                <p
                  style={{
                    fontSize: 16,
                    lineHeight: 1.8,
                    color: "#c2bcb4",
                    maxWidth: 480,
                    marginBottom: 12,
                  }}
                >
                  It may be missing, deleted, or removed after review.
                </p>

                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: "#9f988e",
                    maxWidth: 500,
                    marginBottom: 26,
                  }}
                >
                  The thread may have slipped into the void, but the rest of the site
                  is still here. Head back to the feed or jump into what is active now.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <Link
                    href="/feed"
                    style={{
                      ...buttonBaseStyle,
                      background: "linear-gradient(135deg, #ff4826 0%, #ff6d36 100%)",
                      color: "#fff7f2",
                      boxShadow: "0 8px 24px rgba(255,72,38,.24)",
                    }}
                  >
                    Go Back to Feed
                  </Link>

                  <Link
                    href="/feed?scope=popular"
                    style={{
                      ...buttonBaseStyle,
                      background: "#1a1918",
                      color: "#ddd6cd",
                      border: "1px solid #2c2a29",
                    }}
                  >
                    See What&apos;s Hot
                  </Link>
                </div>
              </section>

              <section
                aria-hidden="true"
                style={{
                  flex: "1 1 320px",
                  minWidth: 280,
                  minHeight: 440,
                  padding: "22px 22px 0",
                  background:
                    "radial-gradient(circle at top, rgba(255,123,70,.16), transparent 24%), #121110",
                  borderLeft: "1px solid #252323",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 50% 68%, rgba(255,72,38,.1), transparent 22%)",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100%",
                    padding: "28px 18px 36px",
                    gap: 16,
                  }}
                >
                  // <div
                  //  style={{
                  //    fontSize: 64,
                  //    lineHeight: 1,
                  //    fontWeight: 800,
                  //    letterSpacing: "-.06em",
                  //    color: "#ff8d5d",
                  //    textShadow:
                  //      "0 0 20px rgba(255,72,38,.4), 0 0 40px rgba(255,72,38,.18)",
                    //}}
                  //>
                    
                  //</div>

                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      maxWidth: 420,
                    }}
                  >
                    <Image
                      src="/images/404-mario.png"
                      alt="Mario searching for missing content"
                      width={2048}
                      height={1152}
                      priority
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        filter: "drop-shadow(0 24px 44px rgba(0,0,0,.42))",
                      }}
                    />
                  </div>

                  <p
                    style={{
                      marginTop: -6,
                      textAlign: "center",
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: "#8d857c",
                      maxWidth: 320,
                    }}
                  >
                    Still looking. This one has either vanished, been removed, or never
                    landed where you expected.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
