"use client";

import { useRouter } from "next/navigation";

export default function BackToFeedButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }

        router.push("/feed");
      }}
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
        background: "transparent",
        cursor: "pointer",
        fontFamily: "var(--font-outfit), sans-serif",
      }}
    >
      ← Back to feed
    </button>
  );
}
