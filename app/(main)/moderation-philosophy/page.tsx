import Link from "next/link";

const sections = [
  {
    title: "1. Speak freely. Don't break the foundation.",
    intro:
      "You can post ideas, opinions, jokes, hot takes, and even bad takes.",
    bullets: [
      "No illegal content",
      "No threats or harassment",
      "No spam",
      "No impersonation",
    ],
    closing: "If it crosses those lines, it doesn't belong here.",
  },
  {
    title: "2. Content is not pre-approved",
    intro: "Everything you post goes live immediately.",
    body: [
      "We don't gatekeep ideas before they exist.",
      "We deal with problems when they actually happen.",
    ],
    bullets: [
      "no pre-moderation",
      "no approval queues",
      "no artificial delays",
    ],
    closing: "Speed matters.",
  },
  {
    title: "3. The community shapes visibility",
    intro: "Votes matter.",
    bullets: [
      "good content rises",
      "bad content sinks",
    ],
    body: [
      "You are not just a user. You are part of the signal.",
      "Moderation steps in only when something shouldn't exist at all.",
      "Not just because it's unpopular.",
    ],
  },
  {
    title: "4. Reporting is your safety valve",
    intro: "If something crosses the line, report it.",
    body: [
      "We don't expect perfection from users.",
      "We expect participation.",
      "Reports help us:",
    ],
    bullets: [
      "remove harmful content",
      "spot bad actors",
      "keep the system fair",
    ],
    closing: "No reports means problems stay hidden.",
  },
  {
    title: "5. Moderation is minimal, but decisive",
    intro: "We don't hover over every post.",
    body: [
      "But when something clearly breaks the rules, we act.",
      "Actions may include:",
    ],
    bullets: [
      "removing content",
      "hiding content",
      "locking discussions",
    ],
    closing:
      "We don't overreach. We don't ignore obvious issues either.",
  },
  {
    title: "6. Edits don't rewrite history",
    body: [
      "Posts are append-only.",
      'If you update something, it appears as: "EDIT: timestamp"',
      "The original content stays visible.",
      "Comments can only be edited briefly after posting.",
      "After that, they stand as written.",
      "This keeps conversations honest.",
    ],
  },
  {
    title: "7. You own your content",
    body: [
      "You can delete your own posts and comments.",
      "If a comment has replies, it may be preserved in place to maintain context.",
      "Conversations matter more than clean erasure.",
    ],
  },
  {
    title: "8. No hidden manipulation",
    body: [
      "We don't secretly boost or suppress content.",
      "No shadow algorithms.",
      "No invisible penalties.",
      "What you see is driven by:",
    ],
    bullets: [
      "votes",
      "time",
      "engagement",
    ],
    closing: "That's it.",
  },
  {
    title: "9. This will evolve",
    body: [
      "Void is early.",
      "Moderation will grow as the community grows.",
      "When it does, we will:",
    ],
    bullets: [
      "explain changes clearly",
      "keep systems simple",
      "avoid unnecessary control",
    ],
  },
];

export default function ModerationPhilosophyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0e0e",
        padding: "40px 20px 60px",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <Link
          href="/feed"
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
            marginBottom: 20,
          }}
        >
          ← Back to feed
        </Link>

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
            Moderation
          </p>

          <h1
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 42,
              fontWeight: 600,
              color: "#ede8e0",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              marginBottom: 10,
            }}
          >
            Void Moderation Philosophy
          </h1>

          <p
            style={{
              fontSize: 16,
              color: "#c0bbb4",
              lineHeight: 1.8,
              marginBottom: 6,
            }}
          >
            Void is built for fast, real conversation.
            <br />
            Not sanitized. Not chaotic. Not manipulated.
          </p>

          <p
            style={{
              fontSize: 16,
              color: "#c0bbb4",
              lineHeight: 1.8,
              marginBottom: 24,
            }}
          >
            We don't try to control what people say.
            <br />
            We make sure the space stays usable for everyone.
          </p>

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

                {section.intro ? (
                  <p
                    style={{
                      fontSize: 14,
                      color: "#c0bbb4",
                      lineHeight: 1.8,
                      marginBottom: section.body?.length || section.bullets?.length ? 10 : 0,
                    }}
                  >
                    {section.intro}
                  </p>
                ) : null}

                {section.body?.map((paragraph, index) => (
                  <p
                    key={`${section.title}-body-${index}`}
                    style={{
                      fontSize: 14,
                      color: "#c0bbb4",
                      lineHeight: 1.8,
                      marginBottom:
                        index === section.body!.length - 1 && !section.bullets && !section.closing
                          ? 0
                          : 10,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}

                {section.bullets ? (
                  <ul
                    style={{
                      margin: "0 0 10px 18px",
                      padding: 0,
                      color: "#ede8e0",
                    }}
                  >
                    {section.bullets.map((bullet) => (
                      <li
                        key={`${section.title}-${bullet}`}
                        style={{
                          fontSize: 14,
                          lineHeight: 1.9,
                          color: "#ede8e0",
                        }}
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.closing ? (
                  <p
                    style={{
                      fontSize: 14,
                      color: "#c0bbb4",
                      lineHeight: 1.8,
                    }}
                  >
                    {section.closing}
                  </p>
                ) : null}
              </section>
            ))}
          </div>

          <div
            style={{
              height: 1,
              background: "#242323",
              margin: "28px 0 22px",
            }}
          />

          <section>
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
              Final note
            </h2>

            <p
              style={{
                fontSize: 14,
                color: "#c0bbb4",
                lineHeight: 1.8,
                marginBottom: 10,
              }}
            >
              Void works if people use it in good faith.
            </p>

            <p
              style={{
                fontSize: 14,
                color: "#c0bbb4",
                lineHeight: 1.8,
              }}
            >
              Not perfectly. Just honestly.
              <br />
              Say what you want.
              <br />
              Stand by it.
              <br />
              And let the system do the rest.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
