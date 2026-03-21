"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionNotice, type ActionNoticeState } from "./ActionNotice";

function parseApiError(data: any, fallback: string) {
  return (
    data?.error?.formErrors?.[0] ||
    data?.error?.fieldErrors?.username?.[0] ||
    data?.error?.fieldErrors?.displayName?.[0] ||
    data?.error ||
    fallback
  );
}

export default function OnboardingForm({
  initialUsername,
  initialDisplayName,
}: {
  initialUsername: string;
  initialDisplayName: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<ActionNoticeState | null>(null);

  useEffect(() => {
    if (!notice) return;

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    setNotice(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          displayName,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setNotice({
          tone: "error",
          message: parseApiError(data, "Failed to finish account setup."),
        });
        return;
      }

      setNotice({
        tone: "success",
        message: "Account setup complete.",
      });
      router.replace("/feed");
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to finish account setup.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {notice ? <ActionNotice {...notice} /> : null}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "#8b847c",
              marginBottom: 8,
            }}
          >
            Username
          </label>
          <input
            type="text"
            value={username}
            disabled={pending}
            onChange={(e) => {
              setUsername(e.target.value);
              if (notice) setNotice(null);
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={24}
            placeholder="your_name"
            style={{
              width: "100%",
              background: "#111010",
              border: "1px solid #252424",
              borderRadius: 10,
              padding: "12px 14px",
              color: "#e6e1da",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 14,
              outline: "none",
              opacity: pending ? 0.7 : 1,
            }}
          />
          <p
            style={{
              fontSize: 12,
              color: "#6f6963",
              lineHeight: 1.5,
              marginTop: 8,
            }}
          >
            Public profile URL: /u/{username.trim().toLowerCase() || "your_name"}
          </p>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "#8b847c",
              marginBottom: 8,
            }}
          >
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            disabled={pending}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (notice) setNotice(null);
            }}
            maxLength={40}
            placeholder="How your name should appear"
            style={{
              width: "100%",
              background: "#111010",
              border: "1px solid #252424",
              borderRadius: 10,
              padding: "12px 14px",
              color: "#e6e1da",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 14,
              outline: "none",
              opacity: pending ? 0.7 : 1,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            paddingTop: 6,
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#6f6963",
              lineHeight: 1.5,
            }}
          >
            {pending
              ? "Setting up your account..."
              : "Usernames use lowercase letters, numbers, and underscores only. Reserved names like admin, void, moderator, and support are unavailable."}
          </p>

          <button
            type="submit"
            disabled={pending}
            style={{
              background: pending ? "#a63d28" : "#ff4826",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 14,
              fontWeight: 700,
              padding: "11px 20px",
              cursor: pending ? "not-allowed" : "pointer",
              transition: "opacity .15s, transform .1s",
              letterSpacing: ".03em",
              boxShadow: "0 4px 18px rgba(255,72,38,.24)",
              minWidth: 170,
            }}
          >
            {pending ? "Setting up account..." : "Enter Void"}
          </button>
        </div>
      </form>
    </>
  );
}
