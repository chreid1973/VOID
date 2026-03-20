import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import OnboardingForm from "../../components/OnboardingForm";
import { prisma } from "../../lib/prisma";

function buildSuggestedUsername(userId: string, rawValue: string | null | undefined) {
  const normalized = (rawValue ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  if (normalized.length >= 3) {
    return normalized;
  }

  return `user_${userId.slice(-6).toLowerCase()}`;
}

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-up");
  }

  const [existingUser, clerkUser] = await Promise.all([
    prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    }),
    currentUser(),
  ]);

  if (existingUser) {
    redirect("/feed");
  }

  if (!clerkUser) {
    redirect("/sign-up");
  }

  const emailLocalPart =
    clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] ?? null;
  const suggestedUsername = buildSuggestedUsername(
    userId,
    clerkUser.username ?? emailLocalPart
  );
  const suggestedDisplayName =
    [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || suggestedUsername;

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
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: 22 }}>
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
            Finish Account Setup
          </p>

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
            Pick your username
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "#8b847c",
              lineHeight: 1.6,
            }}
          >
            Choose the public username and display name you want to use across
            Void before you enter the app.
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
          <OnboardingForm
            initialUsername={suggestedUsername}
            initialDisplayName={suggestedDisplayName}
          />
        </div>
      </div>
    </div>
  );
}
