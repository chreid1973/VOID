"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import "../app/(main)/feed/feed.css";

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
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
  };
};

type PostData = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  score: number;
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

function norm(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
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

function Badge({
  name,
  displayName,
  color,
  icon,
}: {
  name: string;
  displayName: string;
  color: string;
  icon: string;
}) {
  return (
    <Link
      href={`/feed?community=${encodeURIComponent(name)}`}
      style={{ textDecoration: "none" }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11.5,
          fontWeight: 600,
          color,
          padding: "2px 8px 2px 5px",
          background: color + "18",
          borderRadius: 20,
        }}
      >
        <span style={{ fontSize: 9.5 }}>{icon}</span>
        {displayName}
      </span>
    </Link>
  );
}

function Votes({ n, vertical = false }: { n: number; vertical?: boolean }) {
  const [v, setV] = useState<"up" | "dn" | null>(null);
  const base = Number.isFinite(n) ? n : 0;
  const count = base + (v === "up" ? 1 : v === "dn" ? -1 : 0);
  const col = v === "up" ? "#ff4826" : v === "dn" ? "#5b8dee" : "#7a7774";
  const dir = vertical ? "column" : "row";

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
        onClick={() => setV(v === "up" ? null : "up")}
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
        onClick={() => setV(v === "dn" ? null : "dn")}
        type="button"
      >
        ▼
      </button>
    </div>
  );
}

function TopBar() {
  return (
    <header className="feed-topbar">
      <Link
        href="/feed"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          cursor: "pointer",
          flexShrink: 0,
          userSelect: "none",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "linear-gradient(135deg, #ff4826 0%, #ff8040 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            boxShadow: "0 2px 10px rgba(255,72,38,.35)",
          }}
        >
          ◈
        </div>

        <span
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#ede8e0",
            letterSpacing: "-.04em",
            lineHeight: 1,
          }}
        >
          void
        </span>
      </Link>

      <div
        style={{ width: 1, height: 22, background: "#1e1d1d", flexShrink: 0 }}
      />

      <div style={{ flex: 1, maxWidth: 460, position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#484644",
            fontSize: 15,
            pointerEvents: "none",
          }}
        >
          ⌕
        </span>

        <input
          className="si"
          type="text"
          placeholder="Search posts, communities, users…"
          readOnly
        />
      </div>

      <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
        {["HOT", "NEW", "TOP", "RISING"].map((s, i) => (
          <button key={s} className={`srt ${i === 0 ? "on" : ""}`} type="button">
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Link
          href="/sign-in"
          style={{
            background: "none",
            border: "1px solid #252424",
            borderRadius: 8,
            color: "#6a6764",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 12.5,
            fontWeight: 600,
            padding: "6px 14px",
            cursor: "pointer",
            transition: "all .15s",
            letterSpacing: ".02em",
            textDecoration: "none",
          }}
        >
          Log in
        </Link>

        <Link
          href="/sign-up"
          style={{
            background: "#ff4826",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 12.5,
            fontWeight: 700,
            padding: "6px 16px",
            cursor: "pointer",
            transition: "opacity .15s, transform .1s",
            letterSpacing: ".03em",
            boxShadow: "0 2px 10px rgba(255,72,38,.3)",
            textDecoration: "none",
          }}
        >
          Sign up
        </Link>
      </div>
    </header>
  );
}

function Sidebar({
  communities,
  activeCommunity,
}: {
  communities: CommunityItem[];
  activeCommunity: string;
}) {
  return (
    <aside className="feed-sidebar">
      <div className="sect-label" style={{ marginTop: 8 }}>
        Navigate
      </div>

      <Link
        href="/feed"
        className="com-item active"
        style={{ textDecoration: "none" }}
      >
        <span style={{ fontSize: 13 }}>⌂</span>
        Home Feed
      </Link>

      <div className="com-item">
        <span style={{ fontSize: 13 }}>🔥</span>
        Popular
      </div>

      <div className="com-item">
        <span style={{ fontSize: 13 }}>✦</span>
        All Posts
      </div>

      <div className="sect-label">Communities</div>

      {communities.map((c) => (
        <Link
          key={c.id}
          href={`/feed?community=${encodeURIComponent(c.name)}`}
          className={`com-item ${
            norm(activeCommunity) === norm(c.name) ? "active" : ""
          }`}
          style={
            norm(activeCommunity) === norm(c.name)
              ? {
                  color: c.color,
                  background: c.color + "12",
                  cursor: "pointer",
                  textDecoration: "none",
                }
              : { cursor: "pointer", textDecoration: "none" }
          }
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: c.color + "1c",
              color: c.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {c.icon}
          </span>
          <span style={{ flex: 1 }}>{c.displayName}</span>
          <span style={{ fontSize: 10, color: "#2e2d2c" }}>
            {c.postCount}p · {c.memberCount}m
          </span>
        </Link>
      ))}

      <div style={{ marginTop: 28, padding: "0 10px" }}>
        <p style={{ fontSize: 10, color: "#2c2b2a", lineHeight: 1.7 }}>
          © 2026 Void — a better internet
          <br />
          Privacy · Terms · Help · Careers
        </p>
      </div>
    </aside>
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
            href={`/post/${p.id}`}
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
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: p.communityColor,
                    padding: "2px 8px 2px 5px",
                    background: p.communityColor + "18",
                    borderRadius: 20,
                  }}
                >
                  <span style={{ fontSize: 9.5 }}>{p.communityIcon}</span>
                  {p.communityDisplayName}
                </span>

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
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setLoading(true);

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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to post comment");
        setLoading(false);
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      alert("Something went wrong while posting your comment.");
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
          onChange={(e) => setBody(e.target.value)}
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

export default function PostPageShell({
  post,
  communities,
  railPosts,
}: {
  post: PostData;
  communities: CommunityItem[];
  railPosts: RailPost[];
}) {
  return (
    <div className="feed-shell">
      <TopBar />

      <div className="feed-container">
        <Sidebar communities={communities} activeCommunity={post.community.name} />

        <main className="feed-main">
          <div style={{ animation: "rise .3s ease" }}>
            <Link
              href="/feed"
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
                <Badge
                  name={post.community.name}
                  displayName={post.community.displayName}
                  color={post.community.color}
                  icon={post.community.icon}
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
                <Votes n={post.score} />
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
                <button className="act" type="button">
                  ↗ Share
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
                {["Best", "Top", "New", "Controversial"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            {post.comments.length > 0 ? (
              <div>
                {post.comments.map((comment) => (
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
                      <button className="vbtn up" style={{ fontSize: 12 }} type="button">
                        ▲
                      </button>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "#545250",
                          padding: "0 4px",
                        }}
                      >
                        0
                      </span>
                      <button className="vbtn dn" style={{ fontSize: 12 }} type="button">
                        ▼
                      </button>
                      <button className="act" style={{ fontSize: 11.5, marginLeft: 4 }} type="button">
                        ↩ Reply
                      </button>
                      <button className="act" style={{ fontSize: 11.5 }} type="button">
                        Share
                      </button>
                    </div>
                  </div>
                ))}
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