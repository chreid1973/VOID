"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionNotice, type ActionNoticeState } from "./ActionNotice";

export default function FollowUserButton({
  targetUserId,
  targetLabel,
  initialIsFollowing,
}: {
  targetUserId: string;
  targetLabel: string;
  initialIsFollowing: boolean;
}) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<ActionNoticeState | null>(null);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  useEffect(() => {
    if (!notice) return;

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  async function handleClick() {
    if (pending) return;

    setPending(true);

    try {
      const res = await fetch(`/api/follows/${targetUserId}`, {
        method: isFollowing ? "DELETE" : "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setNotice({
          tone: "error",
          message: data?.error || "Failed to update follow status.",
        });
        return;
      }

      const nextFollowing = data?.isFollowing === true;

      setIsFollowing(nextFollowing);
      setNotice({
        tone: "success",
        message: nextFollowing
          ? `Following ${targetLabel}.`
          : `Unfollowed ${targetLabel}.`,
      });
      router.refresh();
    } catch {
      setNotice({
        tone: "error",
        message: "Failed to update follow status.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {notice ? <ActionNotice {...notice} /> : null}

      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={pending}
        style={{
          background: isFollowing ? "none" : "#ff4826",
          border: isFollowing ? "1px solid #252424" : "none",
          borderRadius: 9,
          color: isFollowing ? "#d8d2ca" : "#fff",
          fontFamily: "var(--font-outfit), sans-serif",
          fontSize: 12.5,
          fontWeight: 700,
          padding: "8px 14px",
          cursor: pending ? "not-allowed" : "pointer",
          transition: "opacity .15s, transform .1s",
          letterSpacing: ".03em",
          boxShadow: isFollowing ? "none" : "0 3px 14px rgba(255,72,38,.28)",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending
          ? isFollowing
            ? "Unfollowing..."
            : "Following..."
          : isFollowing
            ? "Unfollow"
            : "Follow"}
      </button>
    </>
  );
}
