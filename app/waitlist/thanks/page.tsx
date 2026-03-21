import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Waitlist Confirmed | SocialVOID",
  description: "Confirmation page for the SocialVOID waitlist.",
};

const cardStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at top, rgba(255,72,38,0.12), transparent 34%), #161515",
  border: "1px solid #2a2828",
  borderRadius: 28,
  padding: "36px 32px",
  boxShadow: "0 18px 70px rgba(0,0,0,.42)",
};

const mutedStyle: React.CSSProperties = {
  color: "#8b847c",
  fontSize: 15,
  lineHeight: 1.7,
};

export default function WaitlistThanksPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(255,72,38,0.09), transparent 30%), #0f0e0e",
        padding: "48px 20px 72px",
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 22,
            color: "#ede8e0",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, rgba(255,72,38,1), rgba(255,127,92,0.86))",
              color: "#0f0e0e",
              fontSize: 13,
              boxShadow: "0 10px 28px rgba(255,72,38,.28)",
            }}
          >
            ◇
          </div>
          <span
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 28,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            SocialVOID
          </span>
        </div>

        <section style={cardStyle}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "auto -120px -110px auto",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,72,38,0.16), rgba(255,72,38,0) 70%)",
              pointerEvents: "none",
            }}
          />

          <p
            style={{
              margin: 0,
              color: "#ff8a6b",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".14em",
              textTransform: "uppercase",
            }}
          >
            Waitlist Confirmed
          </p>

          <h1
            style={{
              margin: "14px 0 14px",
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: "clamp(40px, 6vw, 72px)",
              fontWeight: 600,
              lineHeight: 0.95,
              letterSpacing: "-0.05em",
              color: "#f1ece5",
              maxWidth: 560,
            }}
          >
            You&apos;re in.
          </h1>

          <p
            style={{
              ...mutedStyle,
              maxWidth: 560,
              margin: 0,
            }}
          >
            Thanks for joining the SocialVOID waitlist. We&apos;re opening access
            in waves, and we&apos;ll email you as soon as your invite is ready.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginTop: 28,
            }}
          >
            {[
              {
                title: "What happens next",
                body: "You keep your place in line. When your turn comes, we’ll contact you directly.",
              },
              {
                title: "What to watch for",
                body: "An email from SocialVOID with your invite and the next step to enter the app.",
              },
              {
                title: "What this is for",
                body: "A faster discussion platform focused on signal, conversation, and clarity over noise.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18,
                  padding: "18px 16px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#ede8e0",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.title}
                </p>
                <p
                  style={{
                    ...mutedStyle,
                    margin: "8px 0 0",
                    fontSize: 14,
                  }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 30,
            }}
          >
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 46,
                padding: "0 20px",
                borderRadius: 12,
                background: "#ff4826",
                color: "#fff4ef",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                boxShadow: "0 14px 36px rgba(255,72,38,.22)",
              }}
            >
              Back to SocialVOID
            </Link>

            <Link
              href="/moderation-philosophy"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 46,
                padding: "0 20px",
                borderRadius: 12,
                border: "1px solid #2c2a2a",
                background: "rgba(255,255,255,0.02)",
                color: "#e6e1da",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Read The Philosophy
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
