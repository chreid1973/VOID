"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionNotice, type ActionNoticeState } from "./ActionNotice";
import {
  formatReportReason,
  formatReportStatus,
  type ModerationActionValue,
} from "../lib/moderation";

type ModerationReport = {
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
