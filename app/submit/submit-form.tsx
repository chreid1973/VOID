"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Community = {
  id: string;
  name: string;
  displayName: string;
};

export default function SubmitForm({
  communities,
}: {
  communities: Community[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [communityId, setCommunityId] = useState(communities[0]?.id || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          communityId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to create post");
        setLoading(false);
        return;
      }

      router.push("/feed");
      router.refresh();
    } catch {
      alert("Something went wrong while creating the post.");
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#111010",
    border: "1px solid #252424",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#e6e1da",
    fontFamily: "var(--font-outfit), sans-serif",
    fontSize: 14,
    outline: "none",
    transition: "border-color .2s, box-shadow .2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    color: "#8b847c",
    marginBottom: 8,
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div>
        <label style={labelStyle}>Community</label>
        <select
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
          style={inputStyle}
          required
        >
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Title</label>
        <input
          type="text"
          placeholder="Give your post a title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={inputStyle}
          maxLength={300}
        />
      </div>

      <div>
        <label style={labelStyle}>Body</label>
        <textarea
          placeholder="Add optional text, context, or a rant for the ages..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: 180,
            lineHeight: 1.6,
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
          Posts publish immediately to the selected community.
        </p>

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
            padding: "11px 20px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity .15s, transform .1s",
            letterSpacing: ".03em",
            boxShadow: "0 4px 18px rgba(255,72,38,.24)",
            minWidth: 140,
          }}
        >
          {loading ? "Posting..." : "Post to Void"}
        </button>
      </div>
    </form>
  );
}