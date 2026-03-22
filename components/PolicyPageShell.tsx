import Link from "next/link";

export type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type PolicyPageShellProps = {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: PolicySection[];
  currentPath: "/terms-of-service" | "/privacy-policy" | "/community-rules";
};

const policyLinks = [
  { href: "/terms-of-service" as const, label: "Terms" },
  { href: "/privacy-policy" as const, label: "Privacy" },
  { href: "/community-rules" as const, label: "Rules" },
  { href: "/moderation-philosophy" as const, label: "Moderation" },
];

export default function PolicyPageShell({
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections,
  currentPath,
}: PolicyPageShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(255,72,38,.08), transparent 34%), #0f0e0e",
        padding: "40px 20px 72px",
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
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <Link
            href="/feed"
            prefetch={false}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              textDecoration: "none",
              color: "#6a6764",
              border: "1px solid #242323",
              borderRadius: 7,
              padding: "5px 13px",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            ← Back to feed
          </Link>

          <div
            style={{
              fontSize: 12,
              color: "#8b847c",
              letterSpacing: ".04em",
              textTransform: "uppercase",
            }}
          >
            Last updated {lastUpdated}
          </div>
        </div>

        <div
          style={{
            background: "#161515",
            border: "1px solid #2a2828",
            borderRadius: 18,
            padding: "28px",
            boxShadow: "0 8px 40px rgba(0,0,0,.38)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "#8b847c",
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </p>

          <h1
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 42,
              fontWeight: 600,
              color: "#ede8e0",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              marginBottom: 14,
            }}
          >
            {title}
          </h1>

          {intro.map((paragraph) => (
            <p
              key={paragraph}
              style={{
                fontSize: 15,
                color: "#c0bbb4",
                lineHeight: 1.8,
                marginBottom: 10,
                maxWidth: 720,
              }}
            >
              {paragraph}
            </p>
          ))}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 18,
              marginBottom: 24,
            }}
          >
            {policyLinks.map((link) => {
              const isActive = link.href === currentPath;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  style={{
                    textDecoration: "none",
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: ".03em",
                    color: isActive ? "#fff5f1" : "#b8b2aa",
                    background: isActive ? "#ff4826" : "#111010",
                    border: isActive ? "none" : "1px solid #252424",
                    borderRadius: 999,
                    padding: "8px 13px",
                    boxShadow: isActive
                      ? "0 4px 16px rgba(255,72,38,.22)"
                      : "none",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div
            style={{
              height: 1,
              background: "#242323",
              marginBottom: 24,
            }}
          />

          <div style={{ display: "grid", gap: 26 }}>
            {sections.map((section) => (
              <section key={section.title}>
                <h2
                  style={{
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                    fontSize: 24,
                    fontWeight: 500,
                    color: "#ede8e0",
                    letterSpacing: "-.02em",
                    lineHeight: 1.15,
                    marginBottom: 12,
                  }}
                >
                  {section.title}
                </h2>

                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    style={{
                      fontSize: 14,
                      color: "#c0bbb4",
                      lineHeight: 1.8,
                      marginBottom: 10,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}

                {section.bullets?.length ? (
                  <ul
                    style={{
                      margin: "8px 0 0 0",
                      paddingLeft: 18,
                      color: "#d8d2ca",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
