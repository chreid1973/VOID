"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../app/(main)/feed/feed.css";
import { CommunityBadge, FeedSidebar, FeedTopBar } from "./FeedChrome";

type CommunityItem = {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  memberCount: number;
  postCount: number;
};

type RailPost = {
  id: string;
  title: string;
  votes: number;
  community: string;
  communityDisplayName: string;
  communityColor: string;
  communityIcon: string;
  time: string;
};

type PostComment = {
  id: string;
  body: string;
  score: number;
  userVote: 1 | -1 | null;
  isDeleted: boolean;
  isOwner: boolean;
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
  };
  replies: PostComment[];
};

type CommentSort = "best" | "new" | "old";

type PostData = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  score: number;
  userVote: 1 | -1 | null;
  isOwner: boolean;
  commentCount: number;
  author: {
    username: string;
    displayName: string | null;
  };
  community: {
    name: string;
    displayName: string;
    color: string;
    icon: string;
  };
  comments: PostComment[];
};

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

function voteDirection(value: 1 | -1 | null | undefined) {
  return value === 1 ? "up" : value === -1 ? "dn" : null;
}

function timeAgo(dateString: string, nowMs: number) {
  const date = new Date(dateString);
  const seconds = Math.floor((nowMs - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function isCommentEditable(createdAt: string, nowMs: number) {
  return nowMs - new Date(createdAt).getTime() <= 60_000;
}

function sortComments(comments: PostComment[], sort: CommentSort) {
  const sorted = [...comments];

  sorted.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    if (sort === "old") return aTime - bTime;
    if (sort === "new") return bTime - aTime;

    return b.score - a.score || bTime - aTime;
  });

  return sorted;
}

function Votes({
  postId,
  n,
  initialVote,
  vertical = false,
}: {
  postId: string;
  n: number;
  initialVote: 1 | -1 | null;
  vertical?: boolean;
}) {
  const [v, setV] = useState<"up" | "dn" | null>(voteDirection(initialVote));
  const [count, setCount] = useState(Number.isFinite(n) ? n : 0);
  const [pending, setPending] = useState(false);
  const col = v === "up" ? "#ff4826" : v === "dn" ? "#5b8dee" : "#7a7774";
  const dir = vertical ? "column" : "row";

  async function handleVote(nextDirection: "up" | "dn") {
    if (pending) return;

    const prevVote = v;
    const prevCount = count;
    const nextVote = prevVote === nextDirection ? null : nextDirection;
    const nextCount =
      prevCount +
      (nextVote === "up" ? 1 : nextVote === "dn" ? -1 : 0) -
      (prevVote === "up" ? 1 : prevVote === "dn" ? -1 : 0);

    setV(nextVote);
    setCount(nextCount);
    setPending(true);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetId: postId,
          targetType: "post",
          value: nextVote === null ? 0 : nextDirection === "up" ? 1 : -1,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setV(prevVote);
        setCount(prevCount);
        alert(data?.error || "Vote failed");
        return;
      }

      setV(data?.userVote === 1 ? "up" : data?.userVote === -1 ? "dn" : null);
      setCount(typeof data?.score === "number" ? data.score : nextCount);
    } catch {
      setV(prevVote);
      setCount(prevCount);
      alert("Vote failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: dir,
        alignItems: "center",
        gap: vertical ? 1 : 3,
      }}
    >
      <button
        className={`vbtn up ${v === "up" ? "voted-up" : ""}`}
        onClick={() => void handleVote("up")}
        type="button"
      >
        ▲
      </button>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: col,
          minWidth: vertical ? 26 : 34,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-.01em",
        }}
      >
        {fmt(count)}
      </span>
      <button
        className={`vbtn dn ${v === "dn" ? "voted-dn" : ""}`}
        onClick={() => void handleVote("dn")}
        type="button"
      >
        ▼
      </button>
    </div>
  );
}

function CommentVotes({
  commentId,
  n,
  initialVote,
}: {
  commentId: string;
  n: number;
  initialVote: 1 | -1 | null;
}) {
  const [v, setV] = useState<"up" | "dn" | null>(voteDirection(initialVote));
  const [count, setCount] = useState(Number.isFinite(n) ? n : 0);
  const [pending, setPending] = useState(false);
  const col = v === "up" ? "#ff4826" : v === "dn" ? "#5b8dee" : "#545250";

  async function handleVote(nextDirection: "up" | "dn") {
    if (pending) return;

    const prevVote = v;
    const prevCount = count;
    const nextVote = prevVote === nextDirection ? null : nextDirection;
    const nextCount =
      prevCount +
      (nextVote === "up" ? 1 : nextVote === "dn" ? -1 : 0) -
      (prevVote === "up" ? 1 : prevVote === "dn" ? -1 : 0);

    setV(nextVote);
    setCount(nextCount);
    setPending(true);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetId: commentId,
          targetType: "comment",
          value: nextVote === null ? 0 : nextDirection === "up" ? 1 : -1,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setV(prevVote);
        setCount(prevCount);
        alert(data?.error || "Vote failed");
        return;
      }

      setV(data?.userVote === 1 ? "up" : data?.userVote === -1 ? "dn" : null);
      setCount(typeof data?.score === "number" ? data.score : nextCount);
    } catch {
      setV(prevVote);
      setCount(prevCount);
      alert("Vote failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        className={`vbtn up ${v === "up" ? "voted-up" : ""}`}
        style={{ fontSize: 12 }}
        onClick={() => void handleVote("up")}
        type="button"
      >
        ▲
      </button>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: col,
          padding: "0 4px",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-.01em",
        }}
      >
        {fmt(count)}
      </span>
      <button
        className={`vbtn dn ${v === "dn" ? "voted-dn" : ""}`}
        style={{ fontSize: 12 }}
        onClick={() => void handleVote("dn")}
        type="button"
      >
        ▼
      </button>
    </>
  );
}

function RightRail({
  posts,
}: {
  posts: RailPost[];
}) {
  return (
    <aside className="feed-right">
      <div className="card" style={{ padding: "16px 18px", marginBottom: 14 }}>
        <p
          style={{
            fontSize: 12.5,
            color: "#525050",
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          Join the conversation. Share what you know.
        </p>

        <Link
          href="/submit"
          style={{
            width: "100%",
            background: "#ff4826",
            border: "none",
            borderRadius: 9,
            color: "#fff",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 13,
            fontWeight: 700,
            padding: "9px",
            cursor: "pointer",
            letterSpacing: ".03em",
            transition: "opacity .15s",
            boxShadow: "0 3px 14px rgba(255,72,38,.28)",
            display: "block",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          + Create Post
        </Link>

        <button
          type="button"
          style={{
            width: "100%",
            marginTop: 8,
            background: "none",
            border: "1px solid #242323",
            borderRadius: 9,
            color: "#6a6764",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 13,
            fontWeight: 600,
            padding: "8px",
            cursor: "pointer",
            transition: "all .15s",
            letterSpacing: ".02em",
          }}
        >
          + Create Community
        </button>
      </div>

      <div className="card" style={{ padding: "16px 18px", marginBottom: 14 }}>
        <h3
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: 13.5,
            fontWeight: 600,
            color: "#807c76",
            marginBottom: 14,
            letterSpacing: "-.01em",
          }}
        >
          Trending Today
        </h3>

        {posts.slice(0, 5).map((p, i) => (
          <Link
            key={p.id}
            href={`/p/${p.id}`}
            style={{
              display: "flex",
              gap: 10,
              padding: "9px 0",
              borderTop: i === 0 ? "none" : "1px solid #1a1a1a",
              cursor: "pointer",
              transition: "opacity .15s",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#2a2929",
                width: 18,
                flexShrink: 0,
                paddingTop: 1,
              }}
            >
              {i + 1}
            </span>

            <div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#8a8682",
                  lineHeight: 1.42,
                }}
              >
                {p.title.length > 58 ? p.title.slice(0, 58) + "…" : p.title}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 4,
                  alignItems: "center",
                }}
              >
                <CommunityBadge
                  name={p.community}
                  displayName={p.communityDisplayName}
                  color={p.communityColor}
                  icon={p.communityIcon}
                />

                <span style={{ fontSize: 10.5, color: "#383635" }}>
                  {fmt(p.votes)} pts
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function CommentComposer({ postId }: { postId: string }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!body.trim()) return;

    setLoading(true);
    setSubmitState(null);

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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitState({
          tone: "error",
          message:
            res.status === 401
              ? "Sign in to post a comment."
              : data?.error || "Failed to post comment.",
        });
        return;
      }

      setBody("");
      setSubmitState({ tone: "success", message: "Comment posted." });
      router.refresh();
    } catch {
      setSubmitState({
        tone: "error",
        message: "Something went wrong while posting your comment.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: "16px 20px", marginBottom: 24 }}>
      <p style={{ fontSize: 12, color: "#484644", marginBottom: 10 }}>
        Comment as <span style={{ color: "#6a6764", fontWeight: 600 }}>you</span>
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (submitState) setSubmitState(null);
          }}
          placeholder="Share your thoughts..."
          style={{
            width: "100%",
            background: "#111010",
            border: "1px solid #252424",
            borderRadius: 8,
            padding: "11px 14px",
            color: "#b8b4ac",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 13.5,
            lineHeight: 1.6,
            resize: "vertical",
            minHeight: 88,
            outline: "none",
            transition: "border-color .2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,72,38,.35)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#252424";
          }}
        />

        {submitState ? (
          <p
            aria-live="polite"
            style={{
              fontSize: 12,
              marginTop: 10,
              color:
                submitState.tone === "success" ? "#8aa37f" : "#ff8b72",
            }}
          >
            {submitState.tone === "success" ? "✓ " : ""}
            {submitState.message}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 10,
            gap: 8,
          }}
        >
          <button
            className="act"
            type="button"
            style={{ border: "1px solid #242323", borderRadius: 7 }}
          >
            Preview
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#ff4826",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 18px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity .15s",
              letterSpacing: ".02em",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReplyComposer({
  postId,
  parentId,
  onCancel,
}: {
  postId: string;
  parentId: string;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!body.trim()) return;

    setLoading(true);
    setSubmitState(null);

    try {
      const res = await fetch("/api/comments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          parentId,
          body,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitState({
          tone: "error",
          message:
            res.status === 401
              ? "Sign in to post a reply."
              : data?.error || "Failed to post reply.",
        });
        return;
      }

      setBody("");
      setSubmitState({ tone: "success", message: "Reply posted." });
      router.refresh();
    } catch {
      setSubmitState({
        tone: "error",
        message: "Something went wrong while posting your reply.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
      <p style={{ fontSize: 11.5, color: "#484644", marginBottom: 8 }}>
        Reply as <span style={{ color: "#6a6764", fontWeight: 600 }}>you</span>
      </p>

      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          if (submitState) setSubmitState(null);
        }}
        placeholder="Write a reply..."
        style={{
          width: "100%",
          background: "#111010",
          border: "1px solid #252424",
          borderRadius: 8,
          padding: "10px 12px",
          color: "#b8b4ac",
          fontFamily: "var(--font-outfit), sans-serif",
          fontSize: 12.5,
          lineHeight: 1.6,
          resize: "vertical",
          minHeight: 72,
          outline: "none",
          transition: "border-color .2s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,72,38,.35)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#252424";
        }}
      />

      {submitState ? (
        <p
          aria-live="polite"
          style={{
            fontSize: 11.5,
            marginTop: 8,
            color: submitState.tone === "success" ? "#8aa37f" : "#ff8b72",
          }}
        >
          {submitState.tone === "success" ? "✓ " : ""}
          {submitState.message}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 8,
        }}
      >
        <button
          className="act"
          type="button"
          onClick={onCancel}
          style={{ border: "1px solid #242323", borderRadius: 7 }}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#ff4826",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 12.5,
            fontWeight: 600,
            padding: "7px 16px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity .15s",
            letterSpacing: ".02em",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Posting..." : "Reply"}
        </button>
      </div>
    </form>
  );
}

function CommentNode({
  comment,
  postId,
  depth = 0,
  nowMs,
  initialNowMs,
  replyingTo,
  collapsedReplies,
  onReply,
  onCancelReply,
  onToggleReplies,
}: {
  comment: PostComment;
  postId: string;
  depth?: number;
  nowMs: number;
  initialNowMs: number;
  replyingTo: string | null;
  collapsedReplies: Record<string, boolean>;
  onReply: (commentId: string) => void;
  onCancelReply: () => void;
  onToggleReplies: (commentId: string) => void;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [pending, setPending] = useState(false);
  const [editWindowExpired, setEditWindowExpired] = useState(
    () =>
      new Date(comment.createdAt).getTime() + 60_000 <= initialNowMs
  );
  const isReply = depth > 0;
  const isReplying = !comment.isDeleted && replyingTo === comment.id;
  const hasReplies = comment.replies.length > 0;
  const repliesCollapsed = collapsedReplies[comment.id] ?? false;
  const showReplyThread = isReplying || (!repliesCollapsed && hasReplies);
  const canEdit =
    comment.isOwner &&
    !comment.isDeleted &&
    !editWindowExpired &&
    isCommentEditable(comment.createdAt, nowMs);
  const replyToggleLabel = repliesCollapsed
    ? `show ${comment.replies.length} ${
        comment.replies.length === 1 ? "reply" : "replies"
      }`
    : "hide replies";
  const authorLabel = comment.isDeleted
    ? "deleted"
    : comment.author.displayName || comment.author.username;

  useEffect(() => {
    if (!comment.isOwner || comment.isDeleted || editWindowExpired) return;

    const remainingMs =
      new Date(comment.createdAt).getTime() + 60_000 - Date.now();

    if (remainingMs <= 0) {
      setEditWindowExpired(true);
      setIsEditing(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setEditWindowExpired(true);
      setIsEditing(false);
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [comment.createdAt, comment.isDeleted, comment.isOwner, editWindowExpired]);

  async function handleSave() {
    if (pending) return;

    const body = editBody.trim();

    if (!body) {
      alert("Comment is required");
      return;
    }

    setPending(true);

    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Failed to update comment");
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch {
      alert("Failed to update comment");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (pending || !window.confirm("Delete this comment?")) return;

    setPending(true);

    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Failed to delete comment");
        return;
      }

      onCancelReply();
      setIsEditing(false);
      router.refresh();
    } catch {
      alert("Failed to delete comment");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: isReply ? 12 : 12.5,
            fontWeight: 600,
            color: "#b0aba4",
          }}
        >
          {authorLabel}
        </span>
        <span
          style={{
            fontSize: isReply ? 10.5 : 11,
            color: "#383635",
          }}
        >
          {timeAgo(comment.createdAt, nowMs)}
        </span>
      </div>

      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            style={{
              width: "100%",
              background: "#111010",
              border: "1px solid #252424",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#b8b4ac",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: isReply ? 12.5 : 13.5,
              lineHeight: 1.6,
              resize: "vertical",
              minHeight: isReply ? 72 : 88,
              outline: "none",
              transition: "border-color .2s",
              marginBottom: 8,
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
            }}
          >
            <button
              className="act"
              style={{ fontSize: 11.5 }}
              type="button"
              onClick={() => {
                setEditBody(comment.body);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              className="act"
              style={{ fontSize: 11.5 }}
              type="submit"
              disabled={pending}
            >
              {pending ? "Saving..." : "Save"}
            </button>
            {hasReplies ? (
              <button
                className="act"
                style={{ fontSize: 11.5 }}
                type="button"
                onClick={() => onToggleReplies(comment.id)}
              >
                {replyToggleLabel}
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <>
          <p
            style={{
              fontSize: isReply ? 12.5 : 13.5,
              lineHeight: isReply ? 1.65 : 1.67,
              color: "#9c9892",
              marginBottom: 7,
              whiteSpace: "pre-wrap",
            }}
          >
            {comment.isDeleted ? "[deleted]" : comment.body}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
            }}
          >
            {!comment.isDeleted ? (
              <CommentVotes
                commentId={comment.id}
                n={comment.score}
                initialVote={comment.userVote}
              />
            ) : null}
            {!comment.isDeleted ? (
              <button
                className="act"
                style={{ fontSize: 11.5, marginLeft: 4 }}
                type="button"
                onClick={() => onReply(comment.id)}
              >
                ↩ Reply
              </button>
            ) : null}
            {hasReplies ? (
              <button
                className="act"
                style={{ fontSize: 11.5 }}
                type="button"
                onClick={() => onToggleReplies(comment.id)}
              >
                {replyToggleLabel}
              </button>
            ) : null}
            {!comment.isDeleted ? (
              <button className="act" style={{ fontSize: 11.5 }} type="button">
                Share
              </button>
            ) : null}
            {comment.isOwner && !comment.isDeleted && canEdit ? (
              <button
                className="act"
                style={{ fontSize: 11.5 }}
                type="button"
                onClick={() => {
                  onCancelReply();
                  setEditBody(comment.body);
                  setIsEditing(true);
                }}
              >
                Edit
              </button>
            ) : null}
            {comment.isOwner && !comment.isDeleted ? (
              <button
                className="act"
                style={{ fontSize: 11.5 }}
                type="button"
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            ) : null}
          </div>
        </>
      )}

      {showReplyThread ? (
        <div
          style={{
            marginTop: 12,
            marginLeft: 16,
            paddingLeft: 16,
            borderLeft: "1px solid #1e1e1e",
          }}
        >
          {isReplying ? (
            <ReplyComposer
              postId={postId}
              parentId={comment.id}
              onCancel={onCancelReply}
            />
          ) : null}

          {comment.replies.map((reply, index) => (
            <div
              key={reply.id}
              style={{
                marginTop: isReplying || index > 0 ? 12 : 0,
              }}
            >
              <CommentNode
                comment={reply}
                postId={postId}
                depth={depth + 1}
                nowMs={nowMs}
                initialNowMs={initialNowMs}
                replyingTo={replyingTo}
                collapsedReplies={collapsedReplies}
                onReply={onReply}
                onCancelReply={onCancelReply}
                onToggleReplies={onToggleReplies}
              />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

export default function PostPageShell({
  post,
  communities,
  railPosts,
  renderedAt,
  currentUser,
}: {
  post: PostData;
  communities: CommunityItem[];
  railPosts: RailPost[];
  renderedAt: string;
  currentUser: {
    username: string;
    displayName: string | null;
  } | null;
}) {
  const router = useRouter();
  const initialNowMs = new Date(renderedAt).getTime();
  const [nowMs, setNowMs] = useState(initialNowMs);
  const [copied, setCopied] = useState(false);
  const [commentSort, setCommentSort] = useState<CommentSort>("best");
  const [visibleCommentCount, setVisibleCommentCount] = useState(20);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<
    Record<string, boolean>
  >({});
  const [editingPost, setEditingPost] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [postPending, setPostPending] = useState(false);
  const backHref = post.community.name
    ? `/feed?community=${encodeURIComponent(post.community.name)}`
    : "/feed";
  const sortedComments = sortComments(post.comments, commentSort);
  const visibleComments = sortedComments.slice(0, visibleCommentCount);
  const hasMoreComments = sortedComments.length > visibleCommentCount;

  useEffect(() => {
    setNowMs(Date.now());

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  async function handlePostSave() {
    if (postPending) return;

    const update = postBody.trim();

    if (!update) {
      alert("Update is required");
      return;
    }

    setPostPending(true);

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          update,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Failed to update post");
        return;
      }

      setPostBody("");
      setEditingPost(false);
      router.refresh();
    } catch {
      alert("Failed to update post");
    } finally {
      setPostPending(false);
    }
  }

  async function handlePostDelete() {
    if (postPending || !window.confirm("Delete this post?")) return;

    setPostPending(true);

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Failed to delete post");
        return;
      }

      router.push(backHref);
      router.refresh();
    } catch {
      alert("Failed to delete post");
    } finally {
      setPostPending(false);
    }
  }

  function handleReply(commentId: string) {
    setCollapsedReplies((current) =>
      current[commentId]
        ? { ...current, [commentId]: false }
        : current
    );
    setReplyingTo((current) => (current === commentId ? null : commentId));
  }

  function toggleReplies(commentId: string) {
    setCollapsedReplies((current) => ({
      ...current,
      [commentId]: !current[commentId],
    }));
  }

  return (
    <div className="feed-shell">
      <FeedTopBar mode="post" currentUser={currentUser} />

      <div className="feed-container">
        <FeedSidebar
          mode="post"
          communities={communities}
          activeCommunity={post.community.name}
        />

        <main className="feed-main">
          <div style={{ animation: "rise .3s ease" }}>
            <Link
              href={backHref}
              style={{
                background: "none",
                border: "1px solid #242323",
                borderRadius: 7,
                color: "#6a6764",
                fontFamily: "var(--font-outfit), sans-serif",
                fontSize: 12.5,
                fontWeight: 500,
                padding: "5px 13px",
                cursor: "pointer",
                marginBottom: 20,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all .15s",
                textDecoration: "none",
              }}
            >
              ← Back to feed
            </Link>

            <div
              className="card"
              style={{ padding: "26px 30px", marginBottom: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <CommunityBadge
                  name={post.community.name}
                  displayName={post.community.displayName}
                  color={post.community.color}
                  icon={post.community.icon}
                  href={`/feed?community=${encodeURIComponent(post.community.name)}`}
                />

                <span style={{ fontSize: 12, color: "#464442" }}>
                  u/{post.author.displayName || post.author.username} ·{" "}
                  {timeAgo(post.createdAt, nowMs)}
                </span>
              </div>

              {editingPost ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handlePostSave();
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6a6764",
                      marginBottom: 10,
                    }}
                  >
                    Add an update to this post. The original post text will stay unchanged.
                  </p>

                  <textarea
                    value={postBody}
                    onChange={(e) => setPostBody(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#111010",
                      border: "1px solid #252424",
                      borderRadius: 8,
                      padding: "11px 14px",
                      color: "#b8b4ac",
                      fontFamily: "var(--font-outfit), sans-serif",
                      fontSize: 15,
                      lineHeight: 1.78,
                      resize: "vertical",
                      minHeight: 120,
                      outline: "none",
                      marginBottom: 12,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 22,
                    }}
                  >
                    <button
                      className="act"
                      type="button"
                      onClick={() => {
                        setPostBody("");
                        setEditingPost(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button className="act" type="submit" disabled={postPending}>
                      {postPending ? "Posting..." : "Post update"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h1 className="detail-title">{post.title}</h1>

                  {post.body ? (
                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: 1.78,
                        color: "#8a8682",
                        marginBottom: 22,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {post.body}
                    </p>
                  ) : null}
                </>
              )}

              <div
                style={{
                  paddingTop: 18,
                  borderTop: "1px solid #1e1e1e",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Votes postId={post.id} n={post.score} initialVote={post.userVote} />
                <div
                  style={{
                    width: 1,
                    height: 18,
                    background: "#252424",
                    margin: "0 4px",
                  }}
                />
                <button className="act" type="button">
                  ◎ {(post.commentCount ?? 0).toLocaleString()} comments
                </button>
<button
  className="act"
  type="button"
  onClick={async () => {
    const url = `${window.location.origin}/p/${post.id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }}
>
  {copied ? "✓ Copied" : "↗ Share"}
</button>
                {post.isOwner && !editingPost ? (
                  <button
                    className="act"
                    type="button"
                    onClick={() => {
                      setPostBody("");
                      setEditingPost(true);
                    }}
                  >
                    Add update
                  </button>
                ) : null}
                {post.isOwner && !editingPost ? (
                  <button
                    className="act"
                    type="button"
                    onClick={() => void handlePostDelete()}
                  >
                    Delete
                  </button>
                ) : null}
                <button className="act" type="button">
                  ☆ Save
                </button>
                <button className="act" type="button">
                  ⋯ More
                </button>
              </div>
            </div>

            <CommentComposer postId={post.id} />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 6,
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 17,
                  fontWeight: 500,
                  color: "#807c76",
                  letterSpacing: "-.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {(post.commentCount ?? 0).toLocaleString()} Comments
              </h3>

              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "linear-gradient(to right, #222, transparent)",
                }}
              />

              <select
                value={commentSort}
                onChange={(e) => {
                  setCommentSort(e.target.value as CommentSort);
                  setVisibleCommentCount(20);
                }}
                style={{
                  background: "#181717",
                  border: "1px solid #252424",
                  borderRadius: 6,
                  color: "#6a6764",
                  fontFamily: "var(--font-outfit), sans-serif",
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "4px 10px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {[
                  { value: "best", label: "Best" },
                  { value: "new", label: "New" },
                  { value: "old", label: "Old" },
                ].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {post.comments.length > 0 ? (
              <div>
                {visibleComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="cmt-wrap"
                    style={{ marginTop: 14 }}
                  >
                    <CommentNode
                      comment={comment}
                      postId={post.id}
                      nowMs={nowMs}
                      initialNowMs={initialNowMs}
                      replyingTo={replyingTo}
                      collapsedReplies={collapsedReplies}
                      onReply={handleReply}
                      onCancelReply={() => setReplyingTo(null)}
                      onToggleReplies={toggleReplies}
                    />
                  </div>
                ))}

                {hasMoreComments ? (
                  <button
                    className="act"
                    type="button"
                    onClick={() =>
                      setVisibleCommentCount((count) => count + 20)
                    }
                    style={{ marginTop: 16 }}
                  >
                    Show more comments
                  </button>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 24px",
                  color: "#343331",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 10 }}>◎</div>
                <p style={{ fontSize: 14 }}>No comments yet — be first.</p>
              </div>
            )}
          </div>
        </main>

        <RightRail posts={railPosts} />
      </div>
    </div>
  );
}
