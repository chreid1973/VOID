"use client";

import { useEffect, useState } from "react";
import {
  REPORT_REASON_OPTIONS,
  type ReportReasonValue,
} from "../lib/moderation";

export default function ReportAction({
  targetType,
  targetId,
  onNotice,
  className = "act",
  style,
}: {
  targetType: "POST" | "COMMENT";
  targetId: string;
  onNotice: (notice: { tone: "success" | "error"; message: string }) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReasonValue>("SPAM");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target?.closest?.(`[data-report-target="${targetType}-${targetId}"]`)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open, targetId, targetType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    setPending(true);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          targetType === "POST"
            ? {
                targetType,
                postId: targetId,
                reason,
                note,
              }
            : {
                targetType,
                commentId: targetId,
                reason,
                note,
              }
        ),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        onNotice({
          tone: "error",
          message:
            data?.error?.formErrors?.[0] ||
            data?.error?.fieldErrors?.postId?.[0] ||
            data?.error?.fieldErrors?.commentId?.[0] ||
            data?.error?.fieldErrors?.reason?.[0] ||
            data?.error?.fieldErrors?.note?.[0] ||
            data?.error ||
            "Failed to submit report.",
        });
        return;
      }

      setOpen(false);
      setReason("SPAM");
      setNote("");
      onNotice({
        tone: "success",
        message: "Thanks — this has been flagged for review",
      });
    } catch {
      onNotice({
        tone: "error",
        message: "Failed to submit report.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      data-report-target={`${targetType}-${targetId}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <button
        className={className}
        style={style}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        Report
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 30,
            width: 280,
            background: "#161515",
            border: "1px solid #2a2828",
            borderRadius: 12,
            padding: "12px",
            boxShadow: "0 16px 40px rgba(0,0,0,.32)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <form
            onSubmit={(e) => void handleSubmit(e)}
            style={{ display: "grid", gap: 10 }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#8b847c",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 6,
                }}
              >
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReasonValue)}
                style={{
                  width: "100%",
                  background: "#111010",
                  border: "1px solid #252424",
                  borderRadius: 8,
                  color: "#e6e1da",
                  fontSize: 12.5,
                  padding: "9px 10px",
                  outline: "none",
                }}
              >
                {REPORT_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#8b847c",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 6,
                }}
              >
                Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  reason === "OTHER"
                    ? "Optional context for this report."
                    : "Optional note"
                }
                maxLength={500}
                style={{
                  width: "100%",
                  minHeight: 72,
                  background: "#111010",
                  border: "1px solid #252424",
                  borderRadius: 8,
                  color: "#e6e1da",
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  padding: "9px 10px",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                className="act"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="act" type="submit" disabled={pending}>
                {pending ? "Sending..." : "Submit report"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
