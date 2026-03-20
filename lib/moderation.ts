export const REPORT_REASON_OPTIONS = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "ILLEGAL", label: "Illegal" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "OTHER", label: "Other" },
] as const;

export type ReportReasonValue = (typeof REPORT_REASON_OPTIONS)[number]["value"];

export const REPORT_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
] as const;

export type ReportStatusValue = (typeof REPORT_STATUS_OPTIONS)[number]["value"];

export const MODERATION_ACTION_OPTIONS = [
  { value: "RESOLVE", label: "Resolve" },
  { value: "DISMISS", label: "Dismiss" },
  { value: "HIDE_POST", label: "Hide post" },
  { value: "DELETE_POST", label: "Delete post" },
  { value: "HIDE_COMMENT", label: "Hide comment" },
  { value: "DELETE_COMMENT", label: "Delete comment" },
] as const;

export type ModerationActionValue =
  (typeof MODERATION_ACTION_OPTIONS)[number]["value"];

export function formatReportReason(reason: string) {
  return REPORT_REASON_OPTIONS.find((option) => option.value === reason)?.label ?? reason;
}

export function formatReportStatus(status: string) {
  return REPORT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}
