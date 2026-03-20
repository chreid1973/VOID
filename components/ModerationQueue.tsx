"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionNotice, type ActionNoticeState } from "./ActionNotice";
import {
  formatModerationEntryType,
  formatReportReason,
  formatReportStatus,
  type ManualUserModerationType,
  type ModerationActionValue,
} from "../lib/moderation";

type ModerationReport = {
  targetUser: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
  userHistory: {
    warningCount: number;
    noteCount: number;
    contentActionCount: number;
    entries: Array<{
      id: string;
      type: string;
      note: string | null;
      createdAt: string;
      admin: {
        username: string;
        displayName: string | null;
      };
    }>;
  };
  id: string;
  targetType: "POST" | "COMMENT";
  reason: string;
  note: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  reporter: {
    username: string;
    displayName: string | null;
  };
  resolvedBy: {
    username: string;
    displayName: string | null;
  } | null;
  post: {
    id: string;
    title: string;
    isHidden: boolean;
    author: {
      username: string;
      displayName: string | null;
    };
  } | null;
  comment: {
    id: string;
    body: string;
    isDeleted: boolean;
    isHidden: boolean;
    author: {
      username: string;
      displayName: string | null;
    };
    post: {
      id: string;
      title: string;
      isHidden: boolean;
    };
  } | null;
};

function userLabel(user: { username: string; displayName: string | null }) {
  return user.displayName || `u/${user.username}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString();
}

function targetHref(report: ModerationReport) {
  if (report.targetType === "POST" && report.post) {
    return `/p/${report.post.id}`;
  }

  if (report.targetType === "COMMENT" && report.comment) {
    return `/p/${report.comment.post.id}#comment-${report.comment.id}`;
  }

  return null;
}

function reportActions(report: ModerationReport) {
  if (report.status !== "OPEN") {
    return [] as Array<{ value: ModerationActionValue; label: string }>;
  }

  if (report.targetType === "POST" && report.post) {
    return [
      { value: "RESOLVE", label: "Resolve" },
      { value: "DISMISS", label: "Dismiss" },
      ...(report.post.isHidden
        ? []
        : [{ value: "HIDE_POST" as const, label: "Hide post" }]),
      { value: "DELETE_POST" as const, label: "Delete post" },
    ];
  }

  if (report.targetType === "COMMENT" && report.comment) {
    return [
      { value: "RESOLVE", label: "Resolve" },
      { value: "DISMISS", label: "Dismiss" },
      ...(report.comment.isHidden
        ? []
        : [{ value: "HIDE_COMMENT" as const, label: "Hide comment" }]),
      ...(report.comment.isDeleted
        ? []
        : [{ value: "DELETE_COMMENT" as const, label: "Delete comment" }]),
    ];
  }

  return [
    { value: "RESOLVE", label: "Resolve" },
    { value: "DISMISS", label: "Dismiss" },
  ];
}

export default function ModerationQueue({
  reports,
  activeStatus,
}: {
  reports: ModerationReport[];
  activeStatus: "OPEN" | "RESOLVED" | "DISMISSED";
}) {
  const router = useRouter();
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);
  const [entryComposer, setEntryComposer] = useState<{
    reportId: string;
    type: ManualUserModerationType;
  } | null>(null);
  const [entryNote, setEntryNote] = useState("");
  const [pendingEntryKey, setPendingEntryKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<ActionNoticeState | null>(null);

  useEffect(() => {
    if (!notice) return;

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  async function handleAction(
    reportId: string,
    action: ModerationActionValue
  ) {
    if (pendingReportId) return;

    setPendingReportId(reportId);

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setNotice({
          tone: "error",
          message:
            data?.error?.formErrors?.[0] ||
            data?.error ||
            "Failed to update report.",
        });
        return;
      }

      setNotice({
        tone: "success",
        message: "Report updated.",
      });
      router.refresh();
    } catch {
      setNotice({
        tone: "error",
        message: "Failed to update report.",
      });
    } finally {
      setPendingReportId(null);
    }
  }

  async function handleUserModerationEntry(report: ModerationReport) {
    if (!entryComposer || !report.targetUser) return;

    const note = entryNote.trim();

    if (!note) {
      setNotice({
        tone: "error",
        message: "A note is required.",
      });
      return;
    }

    const pendingKey = `${report.id}:${entryComposer.type}`;

    if (pendingEntryKey) return;

    setPendingEntryKey(pendingKey);

    try {
      const res = await fetch("/api/moderation-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: report.targetUser.id,
          type: entryComposer.type,
          note,
          reportId: report.id,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setNotice({
          tone: "error",
          message:
            data?.error?.formErrors?.[0] ||
            data?.error?.fieldErrors?.note?.[0] ||
            data?.error ||
            "Failed to save moderation history.",
        });
        return;
      }

      setEntryComposer(null);
      setEntryNote("");
      setNotice({
        tone: "success",
        message:
          entryComposer.type === "WARNING"
            ? "Warning saved."
            : "Moderator note saved.",
      });
      router.refresh();
    } catch {
      setNotice({
        tone: "error",
        message: "Failed to save moderation history.",
      });
    } finally {
      setPendingEntryKey(null);
    }
  }

  return (
    <>
      {notice ? <ActionNotice {...notice} /> : null}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        {[
          { value: "OPEN" as const, label: "Open" },
          { value: "RESOLVED" as const, label: "Resolved" },
          { value: "DISMISSED" as const, label: "Dismissed" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={
              tab.value === "OPEN"
                ? "/moderation"
                : `/moderation?status=${tab.value}`
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 10,
              border:
                activeStatus === tab.value
                  ? "1px solid rgba(255,72,38,.32)"
                  : "1px solid #242323",
              background:
                activeStatus === tab.value ? "rgba(255,72,38,.12)" : "#111010",
              color: activeStatus === tab.value ? "#ff9b84" : "#8b847c",
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: ".02em",
              textDecoration: "none",
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {reports.length > 0 ? (
        <div style={{ display: "grid", gap: 14 }}>
          {reports.map((report) => {
            const link = targetHref(report);
            const actions = reportActions(report);

            return (
              <div
                key={report.id}
                style={{
                  background: "#111010",
                  border: "1px solid #242323",
                  borderRadius: 14,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#8b847c",
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                        marginBottom: 6,
                      }}
                    >
                      {report.targetType === "POST" ? "Post report" : "Comment report"}
                    </p>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#ede8e0",
                        lineHeight: 1.45,
                      }}
                    >
                      {report.targetType === "POST"
                        ? report.post?.title || "Deleted post"
                        : report.comment?.post.title || "Deleted comment"}
                    </h3>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 12, color: "#6f6963" }}>
                      {formatReportStatus(report.status)}
                    </p>
                    <p style={{ fontSize: 11.5, color: "#55514d", marginTop: 4 }}>
                      {formatDate(report.createdAt)}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <p style={{ fontSize: 12.5, color: "#bdb8b1" }}>
                    Reason:{" "}
                    <span style={{ color: "#ede8e0", fontWeight: 600 }}>
                      {formatReportReason(report.reason)}
                    </span>
                  </p>
                  <p style={{ fontSize: 12.5, color: "#bdb8b1" }}>
                    Reporter:{" "}
                    <span style={{ color: "#ede8e0" }}>
                      {userLabel(report.reporter)}
                    </span>
                  </p>
                  {report.targetUser ? (
                    <p style={{ fontSize: 12.5, color: "#bdb8b1" }}>
                      Reported user:{" "}
                      <span style={{ color: "#ede8e0" }}>
                        {userLabel(report.targetUser)}
                      </span>
                    </p>
                  ) : null}
                  {report.targetType === "POST" && report.post ? (
                    <p style={{ fontSize: 12.5, color: "#bdb8b1" }}>
                      Author:{" "}
                      <span style={{ color: "#ede8e0" }}>
                        {userLabel(report.post.author)}
                      </span>
                      {report.post.isHidden ? " · hidden" : ""}
                    </p>
                  ) : null}
                  {report.targetType === "COMMENT" && report.comment ? (
                    <>
                      <p style={{ fontSize: 12.5, color: "#bdb8b1" }}>
                        Comment author:{" "}
                        <span style={{ color: "#ede8e0" }}>
                          {userLabel(report.comment.author)}
                        </span>
                        {report.comment.isHidden
                          ? " · hidden"
                          : report.comment.isDeleted
                            ? " · deleted"
                            : ""}
                      </p>
                      <p
                        style={{
                          fontSize: 12.5,
                          color: "#8b847c",
                          lineHeight: 1.6,
                        }}
                      >
                        {report.comment.isDeleted
                          ? "[deleted]"
                          : report.comment.isHidden
                            ? "[removed by moderators]"
                            : report.comment.body.length > 220
                              ? `${report.comment.body.slice(0, 220)}…`
                              : report.comment.body}
                      </p>
                    </>
                  ) : null}
                  {report.note ? (
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "#8b847c",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      Note: {report.note}
                    </p>
                  ) : null}
                  {report.targetUser ? (
                    <div
                      style={{
                        background: "#151414",
                        border: "1px solid #242323",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          color: "#8b847c",
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                          marginBottom: 8,
                        }}
                      >
                        User history
                      </p>
                      <p style={{ fontSize: 12.5, color: "#bdb8b1", marginBottom: 8 }}>
                        {report.userHistory.warningCount} warnings ·{" "}
                        {report.userHistory.noteCount} notes ·{" "}
                        {report.userHistory.contentActionCount} content actions
                      </p>
                      {report.userHistory.entries.length > 0 ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {report.userHistory.entries.map((entry) => (
                            <div
                              key={entry.id}
                              style={{
                                fontSize: 12,
                                color: "#8b847c",
                                lineHeight: 1.55,
                              }}
                            >
                              <span style={{ color: "#ede8e0", fontWeight: 600 }}>
                                {formatModerationEntryType(entry.type)}
                              </span>{" "}
                              by {userLabel(entry.admin)} on{" "}
                              {formatDate(entry.createdAt)}
                              {entry.note ? ` · ${entry.note}` : ""}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: "#6f6963" }}>
                          No moderator history yet.
                        </p>
                      )}
                    </div>
                  ) : null}
                  {report.resolvedAt && report.resolvedBy ? (
                    <p style={{ fontSize: 12, color: "#6f6963" }}>
                      {formatReportStatus(report.status)} by {userLabel(report.resolvedBy)} on{" "}
                      {formatDate(report.resolvedAt)}
                    </p>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {link ? (
                    <Link
                      href={link}
                      className="act"
                      style={{ textDecoration: "none" }}
                    >
                      Open target
                    </Link>
                  ) : null}

                  {report.targetUser ? (
                    <>
                      <button
                        className="act"
                        type="button"
                        onClick={() => {
                          setEntryComposer((current) =>
                            current?.reportId === report.id &&
                            current.type === "WARNING"
                              ? null
                              : { reportId: report.id, type: "WARNING" }
                          );
                          setEntryNote("");
                        }}
                      >
                        Warn user
                      </button>
                      <button
                        className="act"
                        type="button"
                        onClick={() => {
                          setEntryComposer((current) =>
                            current?.reportId === report.id && current.type === "NOTE"
                              ? null
                              : { reportId: report.id, type: "NOTE" }
                          );
                          setEntryNote("");
                        }}
                      >
                        Add note
                      </button>
                    </>
                  ) : null}

                  {actions.map((action) => (
                    <button
                      key={action.value}
                      className="act"
                      type="button"
                      disabled={pendingReportId === report.id}
                      onClick={() =>
                        void handleAction(
                          report.id,
                          action.value as ModerationActionValue
                        )
                      }
                    >
                      {pendingReportId === report.id ? "Working..." : action.label}
                    </button>
                  ))}
                </div>

                {entryComposer?.reportId === report.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleUserModerationEntry(report);
                    }}
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <textarea
                      value={entryNote}
                      onChange={(e) => setEntryNote(e.target.value)}
                      placeholder={
                        entryComposer.type === "WARNING"
                          ? "Why are you warning this user?"
                          : "Private moderator note"
                      }
                      maxLength={1000}
                      style={{
                        width: "100%",
                        minHeight: 86,
                        background: "#161515",
                        border: "1px solid #242323",
                        borderRadius: 10,
                        color: "#e6e1da",
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        padding: "10px 12px",
                        resize: "vertical",
                        outline: "none",
                      }}
                    />

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
                        onClick={() => {
                          setEntryComposer(null);
                          setEntryNote("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="act"
                        type="submit"
                        disabled={
                          pendingEntryKey ===
                          `${report.id}:${entryComposer.type}`
                        }
                      >
                        {pendingEntryKey === `${report.id}:${entryComposer.type}`
                          ? "Saving..."
                          : entryComposer.type === "WARNING"
                            ? "Save warning"
                            : "Save note"}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "72px 24px",
            color: "#4a4744",
            border: "1px dashed #242323",
            borderRadius: 14,
          }}
        >
          No {activeStatus.toLowerCase()} reports.
        </div>
      )}
    </>
  );
}
