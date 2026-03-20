"use client";

export type ActionNoticeState = {
  tone: "success" | "error";
  message: string;
};

export function ActionNotice({
  tone,
  message,
}: ActionNoticeState) {
  const palette =
    tone === "success"
      ? {
          border: "1px solid rgba(138, 163, 127, 0.32)",
          background: "rgba(138, 163, 127, 0.12)",
          color: "#dbe7d5",
          accent: "#8aa37f",
        }
      : {
          border: "1px solid rgba(255, 139, 114, 0.3)",
          background: "rgba(255, 139, 114, 0.11)",
          color: "#f3d0c8",
          accent: "#ff8b72",
        };

  return (
    <div
      aria-live="polite"
      role={tone === "error" ? "alert" : "status"}
      style={{
        position: "fixed",
        top: 86,
        right: 24,
        zIndex: 80,
        maxWidth: 360,
        padding: "12px 14px",
        borderRadius: 12,
        border: palette.border,
        background: palette.background,
        color: palette.color,
        boxShadow: "0 16px 40px rgba(0, 0, 0, .32)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <span
          style={{
            color: palette.accent,
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1.3,
            flexShrink: 0,
            paddingTop: 1,
          }}
        >
          {tone === "success" ? "OK" : "!"}
        </span>
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
