import { prisma } from "../../lib/prisma";
import SubmitForm from "./submit-form";

export default async function SubmitPage() {
  const communities = await prisma.community.findMany({
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      name: true,
      displayName: true,
    },
  });

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
        <div style={{ marginBottom: 22 }}>
          <h1
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 42,
              fontWeight: 600,
              color: "#ede8e0",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              marginBottom: 8,
            }}
          >
            Create Post
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "#8b847c",
              lineHeight: 1.6,
            }}
          >
            Start a new thread in one of your communities.
          </p>
        </div>

        <div
          style={{
            background: "#161515",
            border: "1px solid #2a2828",
            borderRadius: 18,
            padding: "22px",
            boxShadow: "0 8px 40px rgba(0,0,0,.38)",
          }}
        >
          <SubmitForm communities={communities} />
        </div>
      </div>
    </div>
  );
}