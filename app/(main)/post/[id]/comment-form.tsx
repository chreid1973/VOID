"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ postId }: { postId: string }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!body.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/comments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          body,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to post comment");
        setLoading(false);
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      alert("Something went wrong while posting your comment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
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
        Add Comment
      </label>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        rows={5}
        style={{
          width: "100%",
          background: "#111010",
          border: "1px solid #252424",
          borderRadius: 10,
          padding: "12px 14px",
          color: "#e6e1da",
          fontFamily: "var(--font-outfit), sans-serif",
          fontSize: 14,
          lineHeight: 1.6,
          resize: "vertical",
          minHeight: 120,
          outline: "none",
          marginBottom: 12,
        }}
      />

      <button
        type="submit"
        disabled={loading}
        style={{
          background: loading ? "#a63d28" : "#ff4826",
          border: "none",
          borderRadius: 10,
          color: "#fff",
          fontFamily: "var(--font-outfit), sans-serif",
          fontSize: 14,
          fontWeight: 700,
          padding: "10px 18px",
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: ".03em",
        }}
      >
        {loading ? "Posting..." : "Post Comment"}
      </button>
    </form>
  );
}