"use client";

import type { CommentGif } from "../lib/commentGifs";

export default function CommentGifPreview({
  gif,
  onRemove,
  compact = false,
}: {
  gif: CommentGif;
  onRemove?: () => void;
  compact?: boolean;
}) {
  const showMeta = Boolean(onRemove);

  return (
    <div
      style={{
        marginTop: compact ? 8 : 10,
        border: "1px solid #252424",
        borderRadius: 10,
        background: "#141313",
        overflow: "hidden",
      }}
    >
      {showMeta ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: compact ? "9px 10px" : "10px 12px",
            borderBottom: "1px solid #222121",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 11,
                color: "#8b847c",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 3,
              }}
            >
              GIF
            </p>
            <p
              style={{
                fontSize: compact ? 11.5 : 12,
                color: "#c8c3bc",
                lineHeight: 1.4,
              }}
            >
              {gif.title || "Selected GIF"}
            </p>
          </div>

          <button className="act" type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      ) : null}

      <div
        style={{
          maxHeight: compact ? 220 : 280,
          background: "#0f0e0e",
        }}
      >
        <img
          src={gif.previewUrl || gif.url}
          alt={gif.title || "Selected GIF"}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            maxHeight: compact ? 220 : 280,
            display: "block",
            objectFit: "contain",
            margin: "0 auto",
          }}
        />
      </div>
    </div>
  );
}
