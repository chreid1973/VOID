"use client";

import { useEffect, useState } from "react";
import type { ActionNoticeState } from "./ActionNotice";

export default function SavePostButton({
  postId,
  initialSaved,
  onNotice,
}: {
  postId: string;
  initialSaved: boolean;
  onNotice?: (notice: ActionNoticeState) => void;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved, postId]);

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();

    if (pending) return;

    const previousSaved = saved;
    const nextSaved = !previousSaved;

    setSaved(nextSaved);
    setPending(true);

    try {
      const res = await fetch("/api/saved-posts", {
        method: nextSaved ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSaved(previousSaved);
        onNotice?.({
          tone: "error",
          message:
            data?.error ||
            (nextSaved ? "Failed to save post." : "Failed to remove saved post."),
        });
        return;
      }

      const resolvedSaved =
        typeof data?.saved === "boolean" ? data.saved : nextSaved;

      setSaved(resolvedSaved);
      onNotice?.({
        tone: "success",
        message: resolvedSaved
          ? "Saved to your profile."
          : "Removed from saved posts.",
      });
    } catch {
      setSaved(previousSaved);
      onNotice?.({
        tone: "error",
        message: nextSaved ? "Failed to save post." : "Failed to remove saved post.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="act" type="button" onClick={(e) => void handleClick(e)}>
      {pending
        ? saved
          ? "Saving..."
          : "Removing..."
        : saved
          ? "★ Saved"
          : "☆ Save"}
    </button>
  );
}
