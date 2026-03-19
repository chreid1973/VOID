"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
  };
  replies: {
    id: string;
    body: string;
    createdAt: string;
    author: {
      username: string;
      displayName: string | null;
    };
  }[];
};

type CommentSort = "best" | "new" | "old";

type PostData = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  score: number;
  userVote: 1 | -1 | null;
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

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

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

export default function PostPageShell({
  post,
  communities,
  railPosts,
}: {
  post: PostData;
  communities: CommunityItem[];
  railPosts: RailPost[];
}) {
  const [copied, setCopied] = useState(false);
  const [commentSort, setCommentSort] = useState<CommentSort>("best");
  const [visibleCommentCount, setVisibleCommentCount] = useState(20);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<
    Record<string, boolean>
  >({});
  const backHref = post.community.name
    ? `/feed?community=${encodeURIComponent(post.community.name)}`
    : "/feed";
  const sortedComments = sortComments(post.comments, commentSort);
  const visibleComments = sortedComments.slice(0, visibleCommentCount);
  const hasMoreComments = sortedComments.length > visibleCommentCount;

  return (
    <div className="feed-shell">
      <FeedTopBar mode="post" />

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
                  {timeAgo(post.createdAt)}
                </span>
              </div>

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
                {visibleComments.map((comment) => {
                  const hasReplies = comment.replies.length > 0;
                  const repliesCollapsed = collapsedReplies[comment.id] ?? false;
                  const showReplyThread =
                    replyingTo === comment.id || (!repliesCollapsed && hasReplies);
                  const replyToggleLabel = repliesCollapsed
                    ? `show ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`
                    : "hide replies";

                  return (
                    <div
                      key={comment.id}
                      className="cmt-wrap"
                      style={{ marginTop: 14 }}
                    >
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
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "#b0aba4",
                        }}
                      >
                        {comment.author.displayName || comment.author.username}
                      </span>
                      <span style={{ fontSize: 11, color: "#383635" }}>
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.67,
                        color: "#9c9892",
                        marginBottom: 7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {comment.body}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0,
                      }}
                    >
                      <CommentVotes
                        commentId={comment.id}
                        n={comment.score}
                        initialVote={comment.userVote}
                      />
                      <button
                        className="act"
                        style={{ fontSize: 11.5, marginLeft: 4 }}
                        type="button"
                        onClick={() => {
                          setCollapsedReplies((current) =>
                            current[comment.id]
                              ? { ...current, [comment.id]: false }
                              : current
                          );
                          setReplyingTo((current) =>
                            current === comment.id ? null : comment.id
                          );
                        }}
                      >
                        ↩ Reply
                      </button>
                      {hasReplies ? (
                        <button
                          className="act"
                          style={{ fontSize: 11.5 }}
                          type="button"
                          onClick={() =>
                            setCollapsedReplies((current) => ({
                              ...current,
                              [comment.id]: !current[comment.id],
                            }))
                          }
                        >
                          {replyToggleLabel}
                        </button>
                      ) : null}
                      <button className="act" style={{ fontSize: 11.5 }} type="button">
                        Share
                      </button>
                    </div>

                    {showReplyThread ? (
                      <div
                        style={{
                          marginTop: 12,
                          marginLeft: 16,
                          paddingLeft: 16,
                          borderLeft: "1px solid #1e1e1e",
                        }}
                      >
                        {replyingTo === comment.id ? (
                          <ReplyComposer
                            postId={post.id}
                            parentId={comment.id}
                            onCancel={() => setReplyingTo(null)}
                          />
                        ) : null}

                        {comment.replies.map((reply, index) => (
                          <div
                            key={reply.id}
                            style={{
                              marginTop:
                                replyingTo === comment.id || index > 0 ? 12 : 0,
                            }}
                          >
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
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#b0aba4",
                                }}
                              >
                                {reply.author.displayName || reply.author.username}
                              </span>
                              <span style={{ fontSize: 10.5, color: "#383635" }}>
                                {timeAgo(reply.createdAt)}
                              </span>
                            </div>

                            <p
                              style={{
                                fontSize: 12.5,
                                lineHeight: 1.65,
                                color: "#9c9892",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {reply.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  );
                })}

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
